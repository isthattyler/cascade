import { contextBridge, ipcRenderer } from 'electron'
import type {
  Connection, ConnectionInput, Account, CopyRule, CopyRuleInput,
  Group, ActivityLogEntry,
  ConnectionStatusEvent, AccountStatusEvent, EngineStatusEvent, EngineEvent,
  RiskAlertEvent, BalanceUpdateEvent,
} from '../../shared/types'

const api = {
  db: {
    getConnections: (): Promise<Connection[]> => ipcRenderer.invoke('db:getConnections'),
    createConnection: (input: ConnectionInput): Promise<Connection> => ipcRenderer.invoke('db:createConnection', input),
    deleteConnection: (id: string): Promise<void> => ipcRenderer.invoke('db:deleteConnection', id),
    getAccounts: (connectionId?: string): Promise<Account[]> => ipcRenderer.invoke('db:getAccounts', connectionId),
    getCopyRules: (leaderId?: string): Promise<CopyRule[]> => ipcRenderer.invoke('db:getCopyRules', leaderId),
    createCopyRule: (input: CopyRuleInput): Promise<CopyRule> => ipcRenderer.invoke('db:createCopyRule', input),
    updateCopyRule: (id: string, data: Partial<CopyRule>): Promise<void> => ipcRenderer.invoke('db:updateCopyRule', id, data),
    deleteCopyRule: (id: string): Promise<void> => ipcRenderer.invoke('db:deleteCopyRule', id),
    toggleCopyRule: (id: string, enabled: boolean): Promise<void> => ipcRenderer.invoke('db:toggleCopyRule', id, enabled),
    getGroups: (): Promise<Group[]> => ipcRenderer.invoke('db:getGroups'),
    createGroup: (name: string): Promise<Group> => ipcRenderer.invoke('db:createGroup', name),
    deleteGroup: (id: string): Promise<void> => ipcRenderer.invoke('db:deleteGroup', id),
    getGroupAccounts: (groupId: string): Promise<Account[]> => ipcRenderer.invoke('db:getGroupAccounts', groupId),
    setGroupAccounts: (groupId: string, accountIds: string[]): Promise<void> => ipcRenderer.invoke('db:setGroupAccounts', groupId, accountIds),
    getRecentLogs: (limit?: number): Promise<ActivityLogEntry[]> => ipcRenderer.invoke('db:getRecentLogs', limit),
    getSetting: (key: string): Promise<string | null> => ipcRenderer.invoke('db:getSetting', key),
    setSetting: (key: string, value: string): Promise<void> => ipcRenderer.invoke('db:setSetting', key, value),
  },

  broker: {
    connect: (connectionId: string, label: string, brokerType: 'tradovate' | 'projectx', env: 'live' | 'demo'): Promise<void> =>
      ipcRenderer.invoke('broker:connect', connectionId, label, brokerType, env),

    disconnect: (connectionId: string): Promise<void> =>
      ipcRenderer.invoke('broker:disconnect', connectionId),

    status: (connectionId: string): Promise<string> =>
      ipcRenderer.invoke('broker:status', connectionId),

    getAccounts: (connectionId: string): Promise<any[]> =>
      ipcRenderer.invoke('broker:getAccounts', connectionId),

    getPositions: (connectionId: string, accountId: string): Promise<any[]> =>
      ipcRenderer.invoke('broker:getPositions', connectionId, accountId),

    placeOrder: (connectionId: string, order: any): Promise<any> =>
      ipcRenderer.invoke('broker:placeOrder', connectionId, order),

    cancelOrder: (connectionId: string, accountId: string, orderId: string): Promise<void> =>
      ipcRenderer.invoke('broker:cancelOrder', connectionId, accountId, orderId),
  },

  credentials: {
    encrypt: (plaintext: string): Promise<string> => ipcRenderer.invoke('credentials:encrypt', plaintext),
  },

  on: {
    connStatusChange: (cb: (event: ConnectionStatusEvent) => void): (() => void) => {
      const handler = (_: any, data: ConnectionStatusEvent) => cb(data)
      ipcRenderer.on('conn:status-change', handler)
      return () => ipcRenderer.removeListener('conn:status-change', handler)
    },
    accountStatus: (cb: (event: AccountStatusEvent) => void): (() => void) => {
      const handler = (_: any, data: AccountStatusEvent) => cb(data)
      ipcRenderer.on('conn:account-status', handler)
      return () => ipcRenderer.removeListener('conn:account-status', handler)
    },
    engineStatus: (cb: (event: EngineStatusEvent) => void): (() => void) => {
      const handler = (_: any, data: EngineStatusEvent) => cb(data)
      ipcRenderer.on('engine:status', handler)
      return () => ipcRenderer.removeListener('engine:status', handler)
    },
    engineEvent: (cb: (event: EngineEvent) => void): (() => void) => {
      const handler = (_: any, data: EngineEvent) => cb(data)
      ipcRenderer.on('engine:event', handler)
      return () => ipcRenderer.removeListener('engine:event', handler)
    },
    riskAlert: (cb: (event: RiskAlertEvent) => void): (() => void) => {
      const handler = (_: any, data: RiskAlertEvent) => cb(data)
      ipcRenderer.on('engine:risk-alert', handler)
      return () => ipcRenderer.removeListener('engine:risk-alert', handler)
    },
    balanceUpdate: (cb: (event: BalanceUpdateEvent) => void): (() => void) => {
      const handler = (_: any, data: BalanceUpdateEvent) => cb(data)
      ipcRenderer.on('conn:balance-update', handler)
      return () => ipcRenderer.removeListener('conn:balance-update', handler)
    },
    brokerOrderEvent: (cb: (data: any) => void): (() => void) => {
      const handler = (_: any, data: any) => cb(data)
      ipcRenderer.on('broker:order-event', handler)
      return () => ipcRenderer.removeListener('broker:order-event', handler)
    },
    brokerPositionEvent: (cb: (data: any) => void): (() => void) => {
      const handler = (_: any, data: any) => cb(data)
      ipcRenderer.on('broker:position-event', handler)
      return () => ipcRenderer.removeListener('broker:position-event', handler)
    },
  },
}

contextBridge.exposeInMainWorld('api', api)
