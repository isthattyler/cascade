import axios, { AxiosInstance } from 'axios'
import { BaseConnector } from './BaseConnector'
import type { BrokerAccount, BrokerPosition, BrokerOrderRequest, BrokerOrderResult } from './types'

const BASE_URL = 'https://api.topstepx.com'

async function retryOn429<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      if (attempt < maxRetries && err.message?.includes('HTTP 429')) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000)
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      throw err
    }
  }
}

const ORDER_TYPE_MAP: Record<string, number> = {
  market: 1,
  limit: 2,
  stop: 4,
  stop_limit: 5,
}

const SIDE_MAP: Record<string, number> = {
  buy: 0,
  sell: 1,
}

interface ProjectXAccount {
  id: string
  name: string
  simulated: boolean
  balance?: number
  buyingPower?: number
}

interface ProjectXPosition {
  accountId: string
  contractId: string
  symbol: string
  side: number
  size: number
  avgPrice: number
  unrealizedPnl: number
  realizedPnl: number
}

interface ProjectXOrderResult {
  id: string
  accountId: string
  contractId: string
  type: number
  side: number
  size: number
  price: number
  status: string
  filledSize: number
  avgFillPrice: number
  createdAt: string
}

const CACHE_TTL = 12 * 60 * 60 * 1000 // 12 hours

export class ProjectXConnector extends BaseConnector {
  readonly connectionId: string
  readonly brokerType = 'projectx' as const

  private static tokenCache = new Map<string, { token: string; expiresAt: number }>()

  private http: AxiosInstance
  private credentials!: { username: string; apiKey: string }
  private token: string | null = null
  private tokenExpiry: number = 0
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private pollIntervalMs: number
  private watchedAccounts: Set<string> = new Set()
  private lastPositions: Map<string, string> = new Map()

  constructor(connectionId: string, credentials: string, pollIntervalMs = 2000) {
    super()
    this.connectionId = connectionId
    this.pollIntervalMs = pollIntervalMs

    this.http = axios.create({
      baseURL: BASE_URL,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    })

    this.http.interceptors.response.use(
      (r) => r,
      (err) => {
        const status = err.response?.status
        if (status === 401) {
          const cached = ProjectXConnector.tokenCache.get(this.credentials?.username)
          if (cached) {
            ProjectXConnector.tokenCache.delete(this.credentials.username)
            cached.expiresAt = 0
          }
        }
        const msg = err.response?.data?.errorMessage || err.response?.data?.message || err.message
        return Promise.reject(new Error(`ProjectX: ${msg} (HTTP ${status ?? 'ERR'})`))
      }
    )

    try {
      this.credentials = JSON.parse(credentials)

      const cached = ProjectXConnector.tokenCache.get(this.credentials.username)
      if (cached && Date.now() < cached.expiresAt) {
        this.token = cached.token
        this.tokenExpiry = cached.expiresAt
        this.http.defaults.headers.common['Authorization'] = `Bearer ${this.token}`
      }
    } catch {
      throw new Error('Invalid ProjectX credentials format')
    }
  }

  async connect(): Promise<void> {
    this.setStatus('connecting')
    try {
      await this.ensureAuth()
      this.startPolling()
      this.setStatus('connected')
    } catch (err) {
      this.setStatus('disconnected')
      throw err
    }
  }

  disconnect(): void {
    this.clearReconnect()
    this.stopPolling()
    this.token = null
    this.tokenExpiry = 0
    this.watchedAccounts.clear()
    this.lastPositions.clear()
    this.setStatus('disconnected')
  }

  // ── Auth ────────────────────────────────────────────────────────────

  private async authenticate(): Promise<void> {
    const res = await axios.post(`${BASE_URL}/api/Auth/loginKey`, {
      userName: this.credentials.username,
      apiKey: this.credentials.apiKey,
    })

    if (!res.data.token) {
      throw new Error(res.data.errorMessage || 'Authentication failed')
    }

    this.token = res.data.token
    this.tokenExpiry = Date.now() + CACHE_TTL
    this.http.defaults.headers.common['Authorization'] = `Bearer ${this.token}`

    ProjectXConnector.tokenCache.set(this.credentials.username, {
      token: this.token,
      expiresAt: this.tokenExpiry,
    })
  }

  private async ensureAuth(): Promise<void> {
    if (!this.token || Date.now() >= this.tokenExpiry) {
      await this.authenticate()
    }
  }

  // ── Polling ─────────────────────────────────────────────────────────

  private startPolling(): void {
    if (this.pollTimer) return

    this.pollTimer = setInterval(async () => {
      for (const accountId of this.watchedAccounts) {
        try {
          await this.pollPositions(accountId)
        } catch {
          // individual poll failures are handled per-account
        }
      }
    }, this.pollIntervalMs)
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }

  private async pollPositions(accountId: string): Promise<void> {
    try {
      await this.ensureAuth()
      const res = await this.http.post('/api/Position/searchOpen', { accountId })
      const positions: ProjectXPosition[] = res.data?.positions ?? res.data ?? []

      const snapshot = JSON.stringify(positions.map((p) => `${p.contractId}:${p.side}:${p.size}:${p.avgPrice}`))
      const key = `${accountId}:positions`
      const prev = this.lastPositions.get(key)

      if (prev !== undefined && prev !== snapshot) {
        for (const pos of positions) {
          this.emitPositionEvent({
            type: pos.size === 0 ? 'exit' : 'modified',
            position: {
              accountId: pos.accountId,
              contractId: pos.contractId,
              symbol: pos.symbol,
              side: pos.side === 0 ? 'long' : 'short',
              quantity: Math.abs(pos.size),
              avgPrice: pos.avgPrice,
              unrealizedPnL: pos.unrealizedPnl || 0,
              realizedPnL: pos.realizedPnl || 0,
            },
            timestamp: new Date().toISOString(),
          })
        }
      }

      this.lastPositions.set(key, snapshot)
    } catch {
      // silent fail on poll errors — handled by connection health
    }
  }

  // ── REST API ────────────────────────────────────────────────────────

  async getAccounts(): Promise<BrokerAccount[]> {
    await this.ensureAuth()
    const res = await retryOn429(() => this.http.post('/api/Account/search', { onlyActiveAccounts: true }))
    const accounts: ProjectXAccount[] = res.data?.accounts ?? res.data ?? []

    const result = accounts.map((a) => ({
      id: a.id,
      name: a.name,
      isSimulated: a.simulated,
      balance: a.balance,
      brokerExternalId: a.id,
    }))

    for (const a of result) {
      this.watchedAccounts.add(a.id)
    }

    return result
  }

  async getPositions(accountId: string): Promise<BrokerPosition[]> {
    await this.ensureAuth()
    const res = await retryOn429(() => this.http.post('/api/Position/searchOpen', { accountId }))
    const positions: ProjectXPosition[] = res.data?.positions ?? res.data ?? []

    return positions
      .filter((p) => p.size !== 0)
      .map((p) => ({
        accountId: p.accountId,
        contractId: p.contractId,
        symbol: p.symbol,
        side: p.side === 0 ? 'long' : 'short',
        quantity: Math.abs(p.size),
        avgPrice: p.avgPrice,
        unrealizedPnL: p.unrealizedPnl || 0,
        realizedPnL: p.realizedPnl || 0,
      }))
  }

  async placeOrder(order: BrokerOrderRequest): Promise<BrokerOrderResult> {
    await this.ensureAuth()

    const body: any = {
      accountId: order.accountId,
      contractId: order.contractId,
      type: ORDER_TYPE_MAP[order.type] ?? 1,
      side: SIDE_MAP[order.side] ?? 0,
      size: order.quantity,
    }

    if (order.limitPrice != null) body.limitPrice = order.limitPrice
    if (order.stopPrice != null) body.stopPrice = order.stopPrice

    const res = await retryOn429(() => this.http.post('/api/Order/place', body))
    const result: ProjectXOrderResult = res.data

    if (result.status === 'Rejected') {
      throw new Error(`Order rejected (status: Rejected)`)
    }

    return {
      orderId: result.id,
      accountId: order.accountId,
      contractId: order.contractId,
      symbol: order.symbol || order.contractId,
      side: order.side,
      quantity: order.quantity,
      type: order.type,
      price: order.limitPrice || 0,
      status: result.status?.toLowerCase() || 'pending',
      filledQuantity: result.filledSize || 0,
      avgFillPrice: result.avgFillPrice || 0,
      createdAt: result.createdAt || new Date().toISOString(),
    }
  }

  async cancelOrder(accountId: string, orderId: string): Promise<void> {
    await this.ensureAuth()
    await retryOn429(() => this.http.delete('/api/Order/cancel', {
      data: { accountId, orderId },
    }))
  }
}
