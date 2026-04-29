import { create } from 'zustand'
import type {
  Connection, ConnectionInput, Account, CopyRule, CopyRuleInput, Group, ActivityLogEntry,
  ConnectionStatus,
} from '../../../shared/types'

export interface ConnectionState {
  status: ConnectionStatus
  errorMsg?: string
  lastPing?: string
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

let toastCounter = 0

interface AppState {
  connections: Connection[]
  accounts: Account[]
  connectionStates: Record<string, ConnectionState>
  copyRules: CopyRule[]
  groups: Group[]
  logs: ActivityLogEntry[]
  engineRunning: boolean
  loading: boolean
  selectedLeaderId: string | null
  toasts: Toast[]

  setConnections: (connections: Connection[]) => void
  setAccounts: (accounts: Account[]) => void
  setCopyRules: (rules: CopyRule[]) => void
  setGroups: (groups: Group[]) => void
  setLogs: (logs: ActivityLogEntry[]) => void
  setConnectionState: (id: string, state: ConnectionState) => void
  setEngineRunning: (running: boolean) => void
  setLoading: (loading: boolean) => void
  setSelectedLeaderId: (id: string | null) => void

  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void

  loadConnections: () => Promise<void>
  loadAccounts: () => Promise<void>
  loadCopyRules: () => Promise<void>
  loadGroups: () => Promise<void>
  loadLogs: () => Promise<void>

  addConnection: (input: ConnectionInput) => Promise<Connection>
  deleteConnection: (id: string) => Promise<void>
  connectBroker: (connectionId: string, label: string, brokerType: 'tradovate' | 'projectx', env: 'live' | 'demo') => Promise<void>
  disconnectBroker: (connectionId: string) => Promise<void>

  createGroup: (name: string) => Promise<Group>
  deleteGroup: (id: string) => Promise<void>
  setGroupAccounts: (groupId: string, accountIds: string[]) => Promise<void>

  createCopyRule: (input: CopyRuleInput) => Promise<CopyRule>
  updateCopyRule: (id: string, data: Partial<CopyRule>) => Promise<void>
  deleteCopyRule: (id: string) => Promise<void>
  toggleCopyRule: (id: string, enabled: boolean) => Promise<void>

  initialize: () => Promise<void>
}

export const useStore = create<AppState>((set, get) => ({
  connections: [],
  accounts: [],
  connectionStates: {},
  copyRules: [],
  groups: [],
  logs: [],
  engineRunning: false,
  loading: true,
  selectedLeaderId: null,
  toasts: [],

  setConnections: (connections) => set({ connections }),
  setAccounts: (accounts) => set({ accounts }),
  setCopyRules: (rules) => set({ copyRules: rules }),
  setGroups: (groups) => set({ groups }),
  setLogs: (logs) => set({ logs }),
  setConnectionState: (id, state) =>
    set((s) => ({ connectionStates: { ...s.connectionStates, [id]: state } })),
  setEngineRunning: (running) => set({ engineRunning: running }),
  setLoading: (loading) => set({ loading }),
  setSelectedLeaderId: (id) => set({ selectedLeaderId: id }),

  addToast: (toast) => {
    const id = `toast_${++toastCounter}_${Date.now()}`
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  loadConnections: async () => {
    const connections = await window.api.db.getConnections()
    set({ connections })
  },

  loadAccounts: async () => {
    const accounts = await window.api.db.getAccounts()
    set({ accounts })
  },

  loadCopyRules: async () => {
    const rules = await window.api.db.getCopyRules()
    set({ copyRules: rules })
  },

  loadGroups: async () => {
    const groups = await window.api.db.getGroups()
    set({ groups })
  },

  loadLogs: async () => {
    const logs = await window.api.db.getRecentLogs(200)
    set({ logs })
  },

  addConnection: async (input) => {
    const encrypted = await window.api.credentials.encrypt(input.credentials)
    const conn = await window.api.db.createConnection({ ...input, credentials: encrypted })
    await get().loadConnections()
    get().addToast({ type: 'success', message: `Connection "${input.label}" added` })
    return conn
  },

  deleteConnection: async (id) => {
    const { connections } = get()
    const conn = connections.find((c) => c.id === id)
    await get().disconnectBroker(id)
    await window.api.db.deleteConnection(id)
    await Promise.all([get().loadConnections(), get().loadAccounts()])
    if (conn) get().addToast({ type: 'info', message: `Connection "${conn.label}" deleted` })
  },

  connectBroker: async (connectionId, label, brokerType, env) => {
    get().setConnectionState(connectionId, { status: 'connecting' })
    try {
      await window.api.broker.connect(connectionId, label, brokerType, env)
      await get().loadAccounts()
      get().addToast({ type: 'success', message: `"${label}" connected` })
    } catch (err) {
      get().setConnectionState(connectionId, {
        status: 'error',
        errorMsg: (err as Error).message,
      })
      get().addToast({ type: 'error', message: `"${label}" connection failed: ${(err as Error).message}` })
      throw err
    }
  },

  disconnectBroker: async (connectionId) => {
    await window.api.broker.disconnect(connectionId)
    get().setConnectionState(connectionId, { status: 'disconnected' })
    await get().loadAccounts()
  },

  createGroup: async (name) => {
    const group = await window.api.db.createGroup(name)
    await get().loadGroups()
    get().addToast({ type: 'success', message: `Group "${name}" created` })
    return group
  },

  deleteGroup: async (id) => {
    await window.api.db.deleteGroup(id)
    await get().loadGroups()
  },

  setGroupAccounts: async (groupId, accountIds) => {
    await window.api.db.setGroupAccounts(groupId, accountIds)
  },

  createCopyRule: async (input) => {
    const rule = await window.api.db.createCopyRule(input)
    await get().loadCopyRules()
    return rule
  },

  updateCopyRule: async (id, data) => {
    await window.api.db.updateCopyRule(id, data)
    await get().loadCopyRules()
  },

  deleteCopyRule: async (id) => {
    await window.api.db.deleteCopyRule(id)
    await get().loadCopyRules()
  },

  toggleCopyRule: async (id, enabled) => {
    await window.api.db.toggleCopyRule(id, enabled)
    await get().loadCopyRules()
  },

  initialize: async () => {
    const api = window.api

    await Promise.all([
      get().loadConnections(),
      get().loadAccounts(),
      get().loadCopyRules(),
      get().loadGroups(),
      get().loadLogs(),
    ])

    api.on.connStatusChange((event) => {
      get().setConnectionState(event.connectionId, {
        status: event.status,
        errorMsg: event.errorMsg,
        lastPing: event.lastPing,
      })
      if (event.status === 'error' && event.errorMsg) {
        get().addToast({ type: 'error', message: `Connection error: ${event.errorMsg}`, duration: 6000 })
      }
      if (event.status === 'connected') {
        get().addToast({ type: 'success', message: 'Connection established', duration: 3000 })
      }
    })

    api.on.accountStatus(() => {
      get().loadAccounts()
    })

    api.on.engineStatus((event) => {
      set({ engineRunning: event.running })
      get().addToast({
        type: event.running ? 'success' : 'info',
        message: event.running ? 'Copy engine started' : 'Copy engine stopped',
        duration: 3000,
      })
    })

    api.on.engineEvent((event) => {
      get().loadLogs()
      if (event.status === 'error' && event.errorMsg) {
        get().addToast({ type: 'error', message: `Copy error: ${event.errorMsg}`, duration: 5000 })
      }
    })

    api.on.riskAlert((event) => {
      get().addToast({
        type: 'warning',
        message: `Risk limit hit for ${event.followerId}: ${event.rule} (${event.current}/${event.limit})`,
        duration: 6000,
      })
    })

    api.on.balanceUpdate(() => {
      get().loadAccounts()
    })

    try {
      const status = await api.engine.getStatus()
      set({ engineRunning: status.running })
    } catch {
      /**/
    }

    set({ loading: false })
  },
}))
