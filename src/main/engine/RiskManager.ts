import type { CopyRule, ActivityLogEntry } from '../../shared/types'
import type { BrokerOrderRequest, BrokerPosition } from '../broker/types'

interface DailyState {
  realizedPnL: number
  tradeCount: number
}

export class RiskManager {
  private dailyStates = new Map<string, DailyState>()
  private today: string

  constructor() {
    this.today = this.getDateKey()
  }

  private getDateKey(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  initializeFromLogs(logs: ActivityLogEntry[]): void {
    this.dailyStates.clear()
    this.today = this.getDateKey()

    for (const log of logs) {
      if (!log.follower_id) continue
      if (log.timestamp.slice(0, 10) !== this.today) continue

      const state = this.dailyStates.get(log.follower_id) ?? { realizedPnL: 0, tradeCount: 0 }
      state.tradeCount++
      this.dailyStates.set(log.follower_id, state)
    }
  }

  checkOrder(
    rule: CopyRule,
    order: BrokerOrderRequest,
    currentPositions?: BrokerPosition[]
  ): { allowed: boolean; reason?: string } {
    if (rule.max_lot_size != null && order.quantity > rule.max_lot_size) {
      return { allowed: false, reason: `Max lot size exceeded: ${order.quantity} > ${rule.max_lot_size}` }
    }

    if (rule.min_lot_size != null && order.quantity < rule.min_lot_size) {
      return { allowed: false, reason: `Min lot size not met: ${order.quantity} < ${rule.min_lot_size}` }
    }

    if (rule.max_open_contracts != null && currentPositions) {
      const totalOpen = currentPositions.reduce((sum, p) => sum + p.quantity, 0)
      if (totalOpen + order.quantity > rule.max_open_contracts) {
        return { allowed: false, reason: `Max open contracts exceeded: ${totalOpen + order.quantity} > ${rule.max_open_contracts}` }
      }
    }

    const state = this.dailyStates.get(rule.follower_account)
    if (rule.max_daily_loss != null && state && state.realizedPnL <= -rule.max_daily_loss) {
      return { allowed: false, reason: `Max daily loss hit: $${Math.abs(state.realizedPnL).toFixed(2)} >= $${rule.max_daily_loss.toFixed(2)}` }
    }

    return { allowed: true }
  }

  recordTrade(followerId: string, _order: BrokerOrderRequest): void {
    const state = this.dailyStates.get(followerId) ?? { realizedPnL: 0, tradeCount: 0 }
    state.tradeCount++
    this.dailyStates.set(followerId, state)
  }

  recordExit(followerId: string, realizedPnL: number): void {
    const state = this.dailyStates.get(followerId) ?? { realizedPnL: 0, tradeCount: 0 }
    state.realizedPnL += realizedPnL
    state.tradeCount++
    this.dailyStates.set(followerId, state)
  }

  reset(): void {
    this.dailyStates.clear()
  }
}
