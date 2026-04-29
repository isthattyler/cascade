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
    if (!rule.copy_stops && (order.type === 'stop' || order.type === 'stop_market')) return null
    if (!rule.copy_limits && (order.type === 'limit' || order.type === 'stop_limit')) return null

    const isExit = order.side === 'sell'
    const positionSide: 'long' | 'short' = order.side === 'buy' ? 'long' : 'short'
    const side = mapSide(positionSide, rule.direction, isExit)
    if (!side) return null

    let quantity = clampQuantity(order.quantity * rule.lot_multiplier, rule.min_lot_size, rule.max_lot_size)
    if (quantity <= 0) return null

    const req: BrokerOrderRequest = {
      accountId: followerAccountId,
      contractId: followerContractId ?? order.contractId,
      symbol: order.symbol,
      type: 'market',
      side,
      quantity,
    }

    if (order.type === 'limit' || order.type === 'stop_limit') {
      req.type = 'limit'
      req.limitPrice = order.price
    }
    if (order.type === 'stop' || order.type === 'stop_market' || order.type === 'stop_limit') {
      req.type = 'stop'
      req.stopPrice = order.price
    }

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
