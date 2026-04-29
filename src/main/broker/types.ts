import type { ConnectionStatus } from '../../shared/types'

export interface BrokerPosition {
  accountId: string
  contractId: string
  symbol: string
  side: 'long' | 'short'
  quantity: number
  avgPrice: number
  unrealizedPnL: number
  realizedPnL: number
}

export interface BrokerOrderRequest {
  accountId: string
  contractId: string
  symbol?: string
  type: 'market' | 'limit' | 'stop' | 'stop_limit'
  side: 'buy' | 'sell'
  quantity: number
  limitPrice?: number
  stopPrice?: number
}

export interface BrokerOrderResult {
  orderId: string
  accountId: string
  contractId: string
  symbol: string
  side: 'buy' | 'sell'
  quantity: number
  type: string
  price: number
  status: string
  filledQuantity?: number
  avgFillPrice?: number
  createdAt: string
}

export interface BrokerAccount {
  id: string
  name: string
  isSimulated: boolean
  balance?: number
  equity?: number
  currency?: string
  brokerExternalId?: string
}

export interface OrderEvent {
  type: 'new' | 'filled' | 'canceled' | 'rejected'
  order: BrokerOrderResult
  timestamp: string
}

export interface PositionEvent {
  type: 'entry' | 'exit' | 'modified'
  position: BrokerPosition
  timestamp: string
}

export interface BrokerConnector {
  readonly connectionId: string
  readonly brokerType: 'tradovate' | 'projectx'

  connect(): Promise<void>
  disconnect(): void
  isConnected(): boolean
  getStatus(): ConnectionStatus

  getAccounts(): Promise<BrokerAccount[]>
  getPositions(accountId: string): Promise<BrokerPosition[]>
  placeOrder(order: BrokerOrderRequest): Promise<BrokerOrderResult>
  cancelOrder(accountId: string, orderId: string): Promise<void>

  onOrderEvent(cb: (event: OrderEvent) => void): () => void
  onPositionEvent(cb: (event: PositionEvent) => void): () => void
  onStatusChange(cb: (status: ConnectionStatus) => void): () => void
  onError(cb: (error: Error) => void): () => void
}

export interface HealthCheckResult {
  alive: boolean
  latencyMs: number
  error?: string
}
