export type BrokerType = 'tradovate' | 'projectx'

export type EnvType = 'live' | 'demo'

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error' | 'inactive'

export type Direction = 'same' | 'reverse' | 'both'

export type CopyRuleStatus = 'enabled' | 'disabled'

export interface Connection {
  id: string
  label: string
  broker_type: BrokerType
  env: EnvType
  credentials: string
  created_at: string
  updated_at: string
}

export interface ConnectionInput {
  label: string
  broker_type: BrokerType
  env: EnvType
  credentials: string
}

export interface Account {
  id: string
  connection_id: string
  external_id: string
  name: string
  broker_type: BrokerType
  is_simulated: boolean
  balance: number | null
}

export interface CopyRule {
  id: string
  leader_account: string
  follower_account: string
  enabled: boolean
  direction: Direction
  lot_multiplier: number
  max_lot_size: number | null
  min_lot_size: number | null
  max_daily_loss: number | null
  max_open_contracts: number | null
  copy_stops: boolean
  copy_limits: boolean
  copy_market: boolean
}

export interface CopyRuleInput {
  leader_account: string
  follower_account: string
  direction?: Direction
  lot_multiplier?: number
  max_lot_size?: number | null
  min_lot_size?: number | null
  max_daily_loss?: number | null
  max_open_contracts?: number | null
  copy_stops?: boolean
  copy_limits?: boolean
  copy_market?: boolean
}

export interface Group {
  id: string
  name: string
  created_at: string
}

export interface GroupWithAccounts extends Group {
  accounts: Account[]
}

export interface ActivityLogEntry {
  id: string
  timestamp: string
  event_type: string
  leader_id: string | null
  follower_id: string | null
  order_id: string | null
  symbol: string | null
  side: string | null
  quantity: number | null
  price: number | null
  status: string
  error_msg: string | null
  details: string | null
}

export interface ConnectionStatusEvent {
  connectionId: string
  status: ConnectionStatus
  errorMsg?: string
  lastPing?: string
}

export interface AccountStatusEvent {
  accountId: string
  connectionId: string
  status: 'connected' | 'disconnected'
  balance?: number
  position?: string
}

export interface EngineStatusEvent {
  running: boolean
  leaderId?: string
  startedAt?: string
}

export interface EngineEvent {
  timestamp: string
  type: string
  leader: string
  follower: string
  symbol: string
  qty: number
  price: number
  status: 'success' | 'error' | 'skipped'
  errorMsg?: string
}

export interface RiskAlertEvent {
  followerId: string
  rule: string
  current: number
  limit: number
}

export interface BalanceUpdateEvent {
  accountId: string
  balance: number
  equity: number
}

export interface TradovateCredentials {
  email: string
  password: string
  appId: string
}

export interface ProjectXCredentials {
  username: string
  apiKey: string
}

export type BrokerCredentials = TradovateCredentials | ProjectXCredentials
