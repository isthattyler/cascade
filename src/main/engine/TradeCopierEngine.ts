import type { DatabaseRepository } from '../database/repository'
import type { ConnectionManager } from '../broker/ConnectionManager'
import type { BrokerPosition, BrokerOrderResult, PositionEvent, OrderEvent } from '../broker/types'
import type { Account, CopyRule } from '../../shared/types'
import { RiskManager } from './RiskManager'
import { OrderTransformer } from './OrderTransformer'

export interface EngineStatus {
  running: boolean
  leaderAccountId: string | null
  startedAt: string | null
  stats: { totalCopied: number; totalSkipped: number; totalErrors: number }
}

type PushEventFn = (channel: string, data: any) => void

interface CopyContext {
  position: BrokerPosition
  rule: CopyRule
  isExit: boolean
  leaderAccountId: string
}

interface FillContext {
  order: BrokerOrderResult
  rule: CopyRule
  leaderAccountId: string
}

export class TradeCopierEngine {
  private running = false
  private leaderAccountId: string | null = null
  private leaderConnectionId: string | null = null
  private startedAt: string | null = null
  private unsubscribers: (() => void)[] = []
  private riskManager = new RiskManager()
  private stats = { totalCopied: 0, totalSkipped: 0, totalErrors: 0 }
  private pushEvent: PushEventFn

  constructor(pushEvent: PushEventFn) {
    this.pushEvent = pushEvent
  }

  getStatus(): EngineStatus {
    return {
      running: this.running,
      leaderAccountId: this.leaderAccountId,
      startedAt: this.startedAt,
      stats: { ...this.stats },
    }
  }

  async start(leaderAccountId: string, repo: DatabaseRepository, connManager: ConnectionManager): Promise<void> {
    if (this.running) throw new Error('Engine already running')

    const accounts = repo.getAccounts()
    const leaderAccount = accounts.find((a) => a.id === leaderAccountId)
    if (!leaderAccount) throw new Error(`Leader account ${leaderAccountId} not found`)

    const connector = connManager.getConnector(leaderAccount.connection_id)
    if (!connector || !connector.isConnected()) throw new Error('Leader connection is not connected')

    this.running = true
    this.leaderAccountId = leaderAccountId
    this.leaderConnectionId = leaderAccount.connection_id
    this.startedAt = new Date().toISOString()
    this.stats = { totalCopied: 0, totalSkipped: 0, totalErrors: 0 }

    this.riskManager.initializeFromLogs(repo.getRecentLogs(1000))

    const unsubPos = connector.onPositionEvent(async (event) => {
      if (!this.running) return
      await this.handlePositionEvent(event, repo, connManager)
    })
    this.unsubscribers.push(unsubPos)

    const unsubOrd = connector.onOrderEvent(async (event) => {
      if (!this.running) return
      await this.handleOrderEvent(event, repo, connManager)
    })
    this.unsubscribers.push(unsubOrd)

    this.pushEvent('engine:status', { running: true, leaderId: leaderAccountId, startedAt: this.startedAt })
  }

  stop(): void {
    this.running = false
    for (const unsub of this.unsubscribers) unsub()
    this.unsubscribers = []
    this.riskManager.reset()
    this.pushEvent('engine:status', { running: false })
  }

  private async handlePositionEvent(event: PositionEvent, repo: DatabaseRepository, connManager: ConnectionManager): Promise<void> {
    if (!this.leaderAccountId) return
    const rules = this.getActiveRules(repo)
    if (rules.length === 0) return

    const isExit = event.type === 'exit'
    const ctx: CopyContext = { position: event.position, rule: rules[0], isExit, leaderAccountId: this.leaderAccountId }

    const results = await Promise.allSettled(
      rules.map((rule) => {
        const c: CopyContext = { position: event.position, rule, isExit, leaderAccountId: this.leaderAccountId! }
        return this.executeCopy(c, repo, connManager)
      })
    )

    for (const r of results) {
      if (r.status === 'rejected') console.error('[Engine] Position copy error:', r.reason)
    }
  }

  private async handleOrderEvent(event: OrderEvent, repo: DatabaseRepository, connManager: ConnectionManager): Promise<void> {
    if (!this.leaderAccountId) return
    if (event.type !== 'filled') return

    const rules = this.getActiveRules(repo)
    if (rules.length === 0) return

    const results = await Promise.allSettled(
      rules.map((rule) => {
        const ctx: FillContext = { order: event.order, rule, leaderAccountId: this.leaderAccountId! }
        return this.executeCopyFromFill(ctx, repo, connManager)
      })
    )

    for (const r of results) {
      if (r.status === 'rejected') console.error('[Engine] Order fill copy error:', r.reason)
    }
  }

  private getActiveRules(repo: DatabaseRepository): CopyRule[] {
    if (!this.leaderAccountId) return []
    return repo.getCopyRules(this.leaderAccountId).filter((r) => r.enabled)
  }

  private getFollowerAccount(followerAccountId: string, repo: DatabaseRepository): Account | undefined {
    return repo.getAccounts().find((a) => a.id === followerAccountId)
  }

  private async executeCopy(ctx: CopyContext, repo: DatabaseRepository, connManager: ConnectionManager): Promise<void> {
    const { position, rule, isExit, leaderAccountId } = ctx
    const followerAccount = this.getFollowerAccount(rule.follower_account, repo)
    if (!followerAccount) return

    const followerConnector = connManager.getConnector(followerAccount.connection_id)
    if (!followerConnector || !followerConnector.isConnected()) {
      this.stats.totalSkipped++
      this.logSkipped(repo, { leaderAccountId, rule, position, isExit, error: 'Follower not connected' })
      return
    }

    const orderReq = OrderTransformer.transformFromPosition(position, rule, followerAccount.external_id, isExit)
    if (!orderReq) return

    const currentPositions = await followerConnector.getPositions(followerAccount.external_id).catch(() => undefined)
    const riskCheck = this.riskManager.checkOrder(rule, orderReq, currentPositions)
    if (!riskCheck.allowed) {
      this.stats.totalSkipped++
      this.logSkipped(repo, { leaderAccountId, rule, position, isExit, error: riskCheck.reason ?? 'Risk limit' })
      this.pushEvent('engine:risk-alert', { followerId: rule.follower_account, rule: 'risk_limit', current: 0, limit: 0 })
      return
    }

    try {
      const result = await followerConnector.placeOrder(orderReq)
      this.stats.totalCopied++
      if (isExit) this.riskManager.recordExit(rule.follower_account, 0)
      else this.riskManager.recordTrade(rule.follower_account, orderReq)

      const status = ['filled', 'working', 'pending'].includes(result.status) ? 'success' : 'error'
      repo.addLogEntry({
        event_type: isExit ? 'exit' : 'entry', leader_id: leaderAccountId,
        follower_id: rule.follower_account, order_id: result.orderId,
        symbol: position.symbol, side: orderReq.side, quantity: orderReq.quantity,
        price: result.price, status,
        error_msg: null, details: JSON.stringify({ leaderPrice: position.avgPrice, orderStatus: result.status }),
      })
      this.pushEvent('engine:event', {
        timestamp: new Date().toISOString(), type: isExit ? 'exit' : 'entry',
        leader: leaderAccountId, follower: rule.follower_account,
        symbol: position.symbol, qty: orderReq.quantity, price: result.price,
        status: 'success',
      })
    } catch (err) {
      this.stats.totalErrors++
      const msg = (err as Error).message
      repo.addLogEntry({
        event_type: isExit ? 'exit' : 'entry', leader_id: leaderAccountId,
        follower_id: rule.follower_account, order_id: null,
        symbol: position.symbol, side: orderReq.side, quantity: orderReq.quantity,
        price: null, status: 'error', error_msg: msg, details: null,
      })
      this.pushEvent('engine:event', {
        timestamp: new Date().toISOString(), type: 'error',
        leader: leaderAccountId, follower: rule.follower_account,
        symbol: position.symbol, qty: orderReq.quantity, price: 0,
        status: 'error', errorMsg: msg,
      })
    }
  }

  private async executeCopyFromFill(ctx: FillContext, repo: DatabaseRepository, connManager: ConnectionManager): Promise<void> {
    const { order, rule, leaderAccountId } = ctx
    const followerAccount = this.getFollowerAccount(rule.follower_account, repo)
    if (!followerAccount) return

    const followerConnector = connManager.getConnector(followerAccount.connection_id)
    if (!followerConnector || !followerConnector.isConnected()) {
      this.stats.totalSkipped++
      repo.addLogEntry({
        event_type: 'fill', leader_id: leaderAccountId,
        follower_id: rule.follower_account, order_id: order.orderId,
        symbol: order.symbol, side: order.side, quantity: order.quantity,
        price: order.price, status: 'skipped', error_msg: 'Follower not connected', details: null,
      })
      return
    }

    const orderReq = OrderTransformer.transformFromOrderFill(order, rule, followerAccount.external_id)
    if (!orderReq) return

    try {
      const result = await followerConnector.placeOrder(orderReq)
      this.stats.totalCopied++
      repo.addLogEntry({
        event_type: 'fill', leader_id: leaderAccountId,
        follower_id: rule.follower_account, order_id: result.orderId,
        symbol: order.symbol, side: orderReq.side, quantity: orderReq.quantity,
        price: result.price, status: 'success', error_msg: null,
        details: JSON.stringify({ leaderPrice: order.price }),
      })
      this.pushEvent('engine:event', {
        timestamp: new Date().toISOString(), type: 'fill',
        leader: leaderAccountId, follower: rule.follower_account,
        symbol: order.symbol, qty: orderReq.quantity, price: result.price,
        status: 'success',
      })
    } catch (err) {
      this.stats.totalErrors++
      const msg = (err as Error).message
      repo.addLogEntry({
        event_type: 'fill', leader_id: leaderAccountId,
        follower_id: rule.follower_account, order_id: order.orderId,
        symbol: order.symbol, side: orderReq.side, quantity: orderReq.quantity,
        price: null, status: 'error', error_msg: msg, details: null,
      })
      this.pushEvent('engine:event', {
        timestamp: new Date().toISOString(), type: 'error',
        leader: leaderAccountId, follower: rule.follower_account,
        symbol: order.symbol, qty: orderReq.quantity, price: 0,
        status: 'error', errorMsg: msg,
      })
    }
  }

  private logSkipped(repo: DatabaseRepository, ctx: { leaderAccountId: string; rule: CopyRule; position: BrokerPosition; isExit: boolean; error: string }): void {
    repo.addLogEntry({
      event_type: ctx.isExit ? 'exit' : 'entry', leader_id: ctx.leaderAccountId,
      follower_id: ctx.rule.follower_account, order_id: null,
      symbol: ctx.position.symbol,
      side: ctx.position.side === 'long' ? 'buy' : 'sell',
      quantity: ctx.position.quantity, price: ctx.position.avgPrice,
      status: 'skipped', error_msg: ctx.error, details: null,
    })
  }
}
