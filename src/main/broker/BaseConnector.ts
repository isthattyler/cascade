import type { ConnectionStatus } from '../../shared/types'
import type {
  BrokerConnector, BrokerAccount, BrokerPosition,
  BrokerOrderRequest, BrokerOrderResult,
  OrderEvent, PositionEvent,
} from './types'

type EventCallback<T> = (data: T) => void

export abstract class BaseConnector implements BrokerConnector {
  abstract readonly connectionId: string
  abstract readonly brokerType: 'tradovate' | 'projectx'

  protected _status: ConnectionStatus = 'disconnected'
  protected statusListeners: Set<EventCallback<ConnectionStatus>> = new Set()
  protected orderListeners: Set<EventCallback<OrderEvent>> = new Set()
  protected positionListeners: Set<EventCallback<PositionEvent>> = new Set()
  protected errorListeners: Set<EventCallback<Error>> = new Set()
  protected reconnectTimer: ReturnType<typeof setTimeout> | null = null
  protected reconnectAttempts = 0
  protected maxReconnectDelay = 60000

  abstract connect(): Promise<void>
  abstract disconnect(): void
  abstract getAccounts(): Promise<BrokerAccount[]>
  abstract getPositions(accountId: string): Promise<BrokerPosition[]>
  abstract placeOrder(order: BrokerOrderRequest): Promise<BrokerOrderResult>
  abstract cancelOrder(accountId: string, orderId: string): Promise<void>

  isConnected(): boolean {
    return this._status === 'connected'
  }

  getStatus(): ConnectionStatus {
    return this._status
  }

  protected setStatus(status: ConnectionStatus): void {
    this._status = status
    for (const cb of this.statusListeners) {
      cb(status)
    }
  }

  protected emitOrderEvent(event: OrderEvent): void {
    for (const cb of this.orderListeners) {
      cb(event)
    }
  }

  protected emitPositionEvent(event: PositionEvent): void {
    for (const cb of this.positionListeners) {
      cb(event)
    }
  }

  protected emitError(error: Error): void {
    for (const cb of this.errorListeners) {
      cb(error)
    }
  }

  onOrderEvent(cb: EventCallback<OrderEvent>): () => void {
    this.orderListeners.add(cb)
    return () => this.orderListeners.delete(cb)
  }

  onPositionEvent(cb: EventCallback<PositionEvent>): () => void {
    this.positionListeners.add(cb)
    return () => this.positionListeners.delete(cb)
  }

  onStatusChange(cb: EventCallback<ConnectionStatus>): () => void {
    this.statusListeners.add(cb)
    return () => this.statusListeners.delete(cb)
  }

  onError(cb: EventCallback<Error>): () => void {
    this.errorListeners.add(cb)
    return () => this.errorListeners.delete(cb)
  }

  protected scheduleReconnect(fn: () => Promise<void>): void {
    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay)
    this.setStatus('connecting')
    this.reconnectTimer = setTimeout(async () => {
      try {
        await fn()
        this.reconnectAttempts = 0
      } catch {
        this.scheduleReconnect(fn)
      }
    }, delay)
  }

  protected clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.reconnectAttempts = 0
  }
}
