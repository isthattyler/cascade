import axios, { AxiosInstance } from 'axios'
import WebSocket from 'ws'
import { BaseConnector } from './BaseConnector'
import type { BrokerAccount, BrokerPosition, BrokerOrderRequest, BrokerOrderResult } from './types'

interface TradovateCredentials {
  email: string
  password: string
}

interface TradovateAccount {
  id: number
  name: string
  accountType: string
  active: boolean
  riskCategory: number
}

interface TradovatePosition {
  id: number
  accountId: number
  contractId: number
  symbol: string
  netPos: number
  netPrice: number
  realizedPnl: number
  unrealizedPnl: number
  openPos: number
}

interface TradovateOrder {
  id: number
  accountId: number
  contractId: number
  symbol: string
  orderType: string
  side: 'Buy' | 'Sell'
  orderQty: number
  price: number | null
  stopPrice: number | null
  orderVersionId: number
  status: string
  execTime: string | null
  createTime: string
}

interface TradovateFill {
  id: number
  orderId: number
  contractId: number
  symbol: string
  side: 'Buy' | 'Sell'
  qty: number
  price: number
  fillTime: string
  commission: number
}

export class TradovateConnector extends BaseConnector {
  readonly connectionId: string
  readonly brokerType = 'tradovate' as const
  readonly env: 'live' | 'demo'

  private http: AxiosInstance
  private ws: WebSocket | null = null
  private credentials!: TradovateCredentials
  private accessToken: string | null = null
  private tokenExpiry: number = 0
  private userId: number | null = null
  private deviceId: string
  private wsReconnectTimer: ReturnType<typeof setTimeout> | null = null
  private wsAttempts = 0
  private wsUrl: string
  private restUrl: string
  private contractCache: Map<number, string> = new Map()

  constructor(connectionId: string, env: 'live' | 'demo', credentials: string) {
    super()
    this.connectionId = connectionId
    this.env = env
    this.deviceId = `trade-copier-${connectionId.slice(0, 8)}`

    const subdomain = env === 'live' ? 'live' : 'demo'
    this.restUrl = `https://${subdomain}.tradovateapi.com/v1`
    this.wsUrl = `wss://${subdomain}.tradovateapi.com/v1/websocket`

    this.http = axios.create({
      baseURL: this.restUrl,
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' },
    })

    this.http.interceptors.response.use(
      (r) => r,
      (err) => {
        const msg = err.response?.data?.message || err.response?.data?.errorText || err.message
        return Promise.reject(new Error(`Tradovate: ${msg} (HTTP ${err.response?.status ?? 'ERR'})`))
      }
    )

    try {
      this.credentials = JSON.parse(credentials)
    } catch {
      throw new Error('Invalid Tradovate credentials format')
    }
  }

  async connect(): Promise<void> {
    this.setStatus('connecting')
    try {
      await this.authenticate()
      await this.connectWebSocket()
      this.setStatus('connected')
    } catch (err) {
      this.setStatus('disconnected')
      throw err
    }
  }

  disconnect(): void {
    this.clearReconnect()
    this.disconnectWebSocket()
    this.accessToken = null
    this.tokenExpiry = 0
    this.setStatus('disconnected')
  }

  // ── Auth ────────────────────────────────────────────────────────────

  private async authenticate(): Promise<void> {
    const res = await axios.post(`${this.restUrl}/auth/userloginwithtradingpermission`, {
      email: this.credentials.email,
      password: this.credentials.password,
      deviceId: this.deviceId,
      deviceName: 'Cascade',
      cid: 0,
      appRedirectUrl: '',
      redirectUrl: '',
    })

    if (!res.data.accessToken) {
      throw new Error('Authentication failed — no access token returned')
    }

    this.accessToken = res.data.accessToken
    this.userId = res.data.userId
    this.tokenExpiry = Date.now() + (res.data.expirationSeconds ?? 86400) * 1000
    this.http.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`
  }

  private async ensureAuth(): Promise<void> {
    if (!this.accessToken || Date.now() > this.tokenExpiry - 120000) {
      await this.authenticate()
    }
  }

  // ── WebSocket ───────────────────────────────────────────────────────

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl)
      const timeout = setTimeout(() => {
        ws.close()
        reject(new Error('WebSocket connection timeout'))
      }, 10000)

      ws.on('open', async () => {
        clearTimeout(timeout)
        this.ws = ws
        try {
          await this.wsAuth(ws)
          resolve()
        } catch (err) {
          reject(err)
        }
      })

      ws.on('message', (data: Buffer) => this.handleWsMessage(data.toString()))

      ws.on('close', () => {
        this.ws = null
        if (this._status === 'connected' || this._status === 'connecting') {
          this.setStatus('connecting')
          this.scheduleWsReconnect()
        }
      })

      ws.on('error', (err) => {
        clearTimeout(timeout)
        this.emitError(err)
        reject(err)
      })
    })
  }

  private async wsAuth(ws: WebSocket): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WebSocket auth timeout')), 10000)

      const onMsg = (data: Buffer) => {
        const text = data.toString().trim()
        if (text === 'o') {
          ws.send(`authorize\n${this.accessToken}\n${this.userId ?? ''}`)
        } else if (text === 's') {
          clearTimeout(timeout)
          ws.removeListener('message', onMsg)
          ws.send('user/syncRequest')
          resolve()
        } else if (text.startsWith('error')) {
          clearTimeout(timeout)
          ws.removeListener('message', onMsg)
          reject(new Error(`WebSocket auth error: ${text}`))
        }
      }

      ws.on('message', onMsg)
      ws.send('cog')
    })
  }

  private disconnectWebSocket(): void {
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer)
      this.wsReconnectTimer = null
    }
    this.wsAttempts = 0
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  private scheduleWsReconnect(): void {
    this.wsAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.wsAttempts - 1), 30000)
    this.wsReconnectTimer = setTimeout(async () => {
      try {
        await this.ensureAuth()
        await this.connectWebSocket()
        this.wsAttempts = 0
      } catch {
        this.scheduleWsReconnect()
      }
    }, delay)
  }

  private handleWsMessage(text: string): void {
    try {
      if (text.startsWith('a[')) {
        const payload = JSON.parse(text.slice(1))
        if (Array.isArray(payload)) {
          for (const msg of payload) {
            this.processSyncMessage(msg)
          }
        }
      }
    } catch {
      // non-JSON messages (heartbeat, etc.) are ignored
    }
  }

  private processSyncMessage(msg: any): void {
    if (!msg?.e || !msg?.d) return

    const entityType = msg.e
    const data = msg.d

    if (entityType === 'fill' || entityType === 'order') {
      this.emitOrderEvent({
        type: data.status === 'filled' ? 'filled' : data.status === 'canceled' ? 'canceled' : 'new',
        order: {
          orderId: String(data.id),
          accountId: String(data.accountId),
          contractId: String(data.contractId),
          symbol: data.symbol || '',
          side: (data.side?.toLowerCase() === 'sell' ? 'sell' : 'buy') as 'buy' | 'sell',
          quantity: data.orderQty || data.qty || 0,
          type: (data.orderType || '').toLowerCase(),
          price: data.price || 0,
          status: (data.status || '').toLowerCase(),
          filledQuantity: data.filledQty || 0,
          avgFillPrice: data.avgPrice || 0,
          createdAt: data.createTime || new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      })
    }

    if (entityType === 'position') {
      this.emitPositionEvent({
        type: data.netPos === 0 ? 'exit' : 'modified',
        position: {
          accountId: String(data.accountId),
          contractId: String(data.contractId),
          symbol: data.symbol || '',
          side: data.netPos > 0 ? 'long' : 'short',
          quantity: Math.abs(data.netPos || 0),
          avgPrice: data.netPrice || 0,
          unrealizedPnL: data.unrealizedPnl || 0,
          realizedPnL: data.realizedPnl || 0,
        },
        timestamp: new Date().toISOString(),
      })
    }
  }

  // ── REST API ────────────────────────────────────────────────────────

  async getAccounts(): Promise<BrokerAccount[]> {
    await this.ensureAuth()
    const res = await this.http.get('/account/list')
    const accounts: TradovateAccount[] = res.data
    return accounts
      .filter((a) => a.active)
      .map((a) => ({
        id: String(a.id),
        name: a.name,
        isSimulated: this.env === 'demo',
        brokerExternalId: String(a.id),
      }))
  }

  async getPositions(accountId: string): Promise<BrokerPosition[]> {
    await this.ensureAuth()
    const res = await this.http.get('/position/list', { params: { accountId } })
    const positions: TradovatePosition[] = res.data
    return positions.map((p) => ({
      accountId: String(p.accountId),
      contractId: String(p.contractId),
      symbol: p.symbol,
      side: p.netPos > 0 ? 'long' : 'short',
      quantity: Math.abs(p.netPos),
      avgPrice: p.netPrice,
      unrealizedPnL: p.unrealizedPnl,
      realizedPnL: p.realizedPnl,
    }))
  }

  async placeOrder(order: BrokerOrderRequest): Promise<BrokerOrderResult> {
    await this.ensureAuth()

    const body: any = {
      accountId: Number(order.accountId),
      symbol: order.symbol || order.contractId,
      orderQty: order.quantity,
      orderType: this.mapOrderType(order.type),
      isAutomated: true,
    }

    if (order.side === 'buy') {
      body.isBuy = true
    } else {
      body.isSell = true
    }

    if (order.limitPrice != null) body.price = order.limitPrice
    if (order.stopPrice != null) body.stopPrice = order.stopPrice

    const res = await this.http.post('/order/place', body)

    if (res.data?.orderStatus === 'Rejected' || res.data?.failureMessage) {
      throw new Error(`Order rejected: ${res.data.failureMessage || 'Unknown reason'}`)
    }

    return {
      orderId: String(res.data.orderId || res.data.id),
      accountId: order.accountId,
      contractId: order.contractId,
      symbol: order.symbol || order.contractId,
      side: order.side,
      quantity: order.quantity,
      type: order.type,
      price: order.limitPrice || 0,
      status: (res.data.orderStatus || 'pending').toLowerCase(),
      filledQuantity: res.data.filledQty || 0,
      avgFillPrice: res.data.avgPrice || 0,
      createdAt: new Date().toISOString(),
    }
  }

  async cancelOrder(accountId: string, orderId: string): Promise<void> {
    await this.ensureAuth()
    await this.http.post('/order/cancel', {
      accountId: Number(accountId),
      orderId: Number(orderId),
      isAutomated: true,
    })
  }

  private mapOrderType(type: string): string {
    const map: Record<string, string> = {
      market: 'Market',
      limit: 'Limit',
      stop: 'Stop',
      stop_limit: 'StopLimit',
    }
    return map[type] || 'Market'
  }
}
