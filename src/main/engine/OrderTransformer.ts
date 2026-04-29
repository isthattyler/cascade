import type { CopyRule } from '../../shared/types'
import type { BrokerPosition, BrokerOrderRequest, BrokerOrderResult } from '../broker/types'

export class OrderTransformer {
  static transformFromPosition(
    position: BrokerPosition,
    rule: CopyRule,
    followerAccountId: string,
    isExit: boolean,
    followerContractId?: string
  ): BrokerOrderRequest | null {
    const side = mapSide(position.side, rule.direction, isExit)
    if (!side) return null

    let quantity = clampQuantity(position.quantity * rule.lot_multiplier, rule.min_lot_size, rule.max_lot_size)
    if (quantity <= 0) return null

    return {
      accountId: followerAccountId,
      contractId: followerContractId ?? position.contractId,
      symbol: position.symbol,
      type: 'market',
      side,
      quantity,
    }
  }

  static transformFromOrderFill(
    order: BrokerOrderResult,
    rule: CopyRule,
    followerAccountId: string,
    followerContractId?: string
  ): BrokerOrderRequest | null {
    if (!rule.copy_market && order.type === 'market') return null
    if (!rule.copy_stops && (order.type === 'stop' || order.type === 'stop_market' || order.type === 'stop_limit')) return null
    if (!rule.copy_limits && (order.type === 'limit' || order.type === 'stop_limit')) return null

    const isExit = order.side === 'sell'
    const positionSide: 'long' | 'short' = order.side === 'buy' ? 'long' : 'short'
    const side = mapSide(positionSide, rule.direction, isExit)
    if (!side) return null

    let quantity = clampQuantity(order.quantity * rule.lot_multiplier, rule.min_lot_size, rule.max_lot_size)
    if (quantity <= 0) return null

    let type: BrokerOrderRequest['type'] = 'market'
    let limitPrice: number | undefined
    let stopPrice: number | undefined

    if (order.type === 'limit') {
      type = 'limit'
      limitPrice = order.price
    } else if (order.type === 'stop' || order.type === 'stop_market') {
      type = 'stop'
      stopPrice = order.price
    } else if (order.type === 'stop_limit') {
      type = 'stop_limit'
      stopPrice = order.price
      limitPrice = order.price
    }

    const req: BrokerOrderRequest = {
      accountId: followerAccountId,
      contractId: followerContractId ?? order.contractId,
      symbol: order.symbol,
      type,
      side,
      quantity,
    }

    if (limitPrice !== undefined) req.limitPrice = limitPrice
    if (stopPrice !== undefined) req.stopPrice = stopPrice

    return req
  }
}

function mapSide(positionSide: 'long' | 'short', direction: string, isExit: boolean): 'buy' | 'sell' | null {
  let side: 'buy' | 'sell' = positionSide === 'long' ? 'buy' : 'sell'
  if (isExit) side = side === 'buy' ? 'sell' : 'buy'

  if (direction === 'same' || direction === 'both') return side
  if (direction === 'reverse') return side === 'buy' ? 'sell' : 'buy'
  return null
}

function clampQuantity(raw: number, min: number | null | undefined, max: number | null | undefined): number {
  let q = Math.round(raw)
  if (min != null) q = Math.max(q, min)
  if (max != null) q = Math.min(q, max)
  return q
}
