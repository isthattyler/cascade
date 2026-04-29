import type {
  Connection, ConnectionInput, Account, CopyRule, Group, ActivityLogEntry,
  ConnectionStatusEvent, AccountStatusEvent, EngineStatusEvent,
} from '../../shared/types'

declare global {
  interface Window {
    api: {
      db: {
        getConnections: () => Promise<Connection[]>
        createConnection: (input: ConnectionInput) => Promise<Connection>
        deleteConnection: (id: string) => Promise<void>
        getAccounts: (connectionId?: string) => Promise<Account[]>
        getCopyRules: (leaderId?: string) => Promise<CopyRule[]>
        createCopyRule: (input: any) => Promise<CopyRule>
        updateCopyRule: (id: string, data: Partial<CopyRule>) => Promise<void>
        deleteCopyRule: (id: string) => Promise<void>
        toggleCopyRule: (id: string, enabled: boolean) => Promise<void>
        getGroups: () => Promise<Group[]>
        createGroup: (name: string) => Promise<Group>
        deleteGroup: (id: string) => Promise<void>
        getGroupAccounts: (groupId: string) => Promise<Account[]>
        setGroupAccounts: (groupId: string, accountIds: string[]) => Promise<void>
        getRecentLogs: (limit?: number) => Promise<ActivityLogEntry[]>
        getSetting: (key: string) => Promise<string | null>
        setSetting: (key: string, value: string) => Promise<void>
      }
      broker: {
        connect: (connectionId: string, label: string, brokerType: 'tradovate' | 'projectx', env: 'live' | 'demo') => Promise<void>
        disconnect: (connectionId: string) => Promise<void>
        status: (connectionId: string) => Promise<string>
        getAccounts: (connectionId: string) => Promise<any[]>
        getPositions: (connectionId: string, accountId: string) => Promise<any[]>
        placeOrder: (connectionId: string, order: any) => Promise<any>
        cancelOrder: (connectionId: string, accountId: string, orderId: string) => Promise<void>
      }
      engine: {
        start: (leaderAccountId: string) => Promise<void>
        stop: () => Promise<void>
        getStatus: () => Promise<any>
      }
      credentials: {
        encrypt: (plaintext: string) => Promise<string>
      }
      on: {
        connStatusChange: (cb: (event: ConnectionStatusEvent) => void) => () => void
        accountStatus: (cb: (event: AccountStatusEvent) => void) => () => void
        engineStatus: (cb: (event: EngineStatusEvent) => void) => () => void
        engineEvent: (cb: (event: any) => void) => () => void
        riskAlert: (cb: (event: any) => void) => () => void
        balanceUpdate: (cb: (event: any) => void) => () => void
        brokerOrderEvent: (cb: (data: any) => void) => () => void
        brokerPositionEvent: (cb: (data: any) => void) => () => void
      }
    }
  }
}
