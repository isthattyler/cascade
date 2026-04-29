import type { ConnectionStatus } from '../../shared/types'
import type { BrokerConnector } from './types'
import { TradovateConnector } from './TradovateConnector'
import { ProjectXConnector } from './ProjectXConnector'
import { decryptCredentials } from '../utils/credentialVault'

type StatusChangeCallback = (connectionId: string, status: ConnectionStatus, errorMsg?: string) => void

interface ManagedConnector {
  connector: BrokerConnector
  connectionId: string
  label: string
  healthTimer: ReturnType<typeof setInterval> | null
}

export class ConnectionManager {
  private connectors: Map<string, ManagedConnector> = new Map()
  private statusListeners: Set<StatusChangeCallback> = new Set()
  private healthIntervalMs: number

  constructor(healthIntervalMs = 30000) {
    this.healthIntervalMs = healthIntervalMs
  }

  onStatusChange(cb: StatusChangeCallback): () => void {
    this.statusListeners.add(cb)
    return () => this.statusListeners.delete(cb)
  }

  private emitStatus(connectionId: string, status: ConnectionStatus, errorMsg?: string): void {
    for (const cb of this.statusListeners) {
      cb(connectionId, status, errorMsg)
    }
  }

  // ── Connection Lifecycle ───────────────────────────────────────────

  async connect(
    connectionId: string,
    label: string,
    brokerType: 'tradovate' | 'projectx',
    env: 'live' | 'demo',
    encryptedCredentials: string
  ): Promise<void> {
    const existing = this.connectors.get(connectionId)
    if (existing) {
      if (existing.connector.isConnected()) return
      await existing.connector.connect()
      return
    }

    const plaintext = decryptCredentials(encryptedCredentials)
    let connector: BrokerConnector

    if (brokerType === 'tradovate') {
      connector = new TradovateConnector(connectionId, env, plaintext)
    } else {
      connector = new ProjectXConnector(connectionId, plaintext)
    }

    const managed: ManagedConnector = {
      connector,
      connectionId,
      label,
      healthTimer: null,
    }

    connector.onStatusChange((status) => {
      this.emitStatus(connectionId, status)
      if (status === 'connected') {
        this.startHealthCheck(managed)
      } else if (status === 'disconnected' || status === 'error') {
        this.stopHealthCheck(managed)
      }
    })

    connector.onError((err) => {
      this.emitStatus(connectionId, 'error', err.message)
    })

    this.connectors.set(connectionId, managed)
    this.emitStatus(connectionId, 'connecting')

    try {
      await connector.connect()
      this.startHealthCheck(managed)
    } catch (err) {
      this.emitStatus(connectionId, 'error', (err as Error).message)
      this.connectors.delete(connectionId)
      throw err
    }
  }

  disconnect(connectionId: string): void {
    const managed = this.connectors.get(connectionId)
    if (!managed) return

    this.stopHealthCheck(managed)
    managed.connector.disconnect()
    this.connectors.delete(connectionId)
    this.emitStatus(connectionId, 'disconnected')
  }

  disconnectAll(): void {
    for (const [id] of this.connectors) {
      this.disconnect(id)
    }
  }

  getConnector(connectionId: string): BrokerConnector | undefined {
    return this.connectors.get(connectionId)?.connector
  }

  getConnectedIds(): string[] {
    return Array.from(this.connectors.entries())
      .filter(([, m]) => m.connector.isConnected())
      .map(([id]) => id)
  }

  isConnected(connectionId: string): boolean {
    return this.connectors.get(connectionId)?.connector.isConnected() ?? false
  }

  getStatus(connectionId: string): ConnectionStatus {
    return this.connectors.get(connectionId)?.connector.getStatus() ?? 'disconnected'
  }

  // ── Health Checks ─────────────────────────────────────────────────

  private startHealthCheck(managed: ManagedConnector): void {
    this.stopHealthCheck(managed)
    managed.healthTimer = setInterval(async () => {
      try {
        await managed.connector.getAccounts()
      } catch {
        this.emitStatus(managed.connectionId, 'error', 'Health check failed')
      }
    }, this.healthIntervalMs)
  }

  private stopHealthCheck(managed: ManagedConnector): void {
    if (managed.healthTimer) {
      clearInterval(managed.healthTimer)
      managed.healthTimer = null
    }
  }

  // ── Cleanup ───────────────────────────────────────────────────────

  destroy(): void {
    this.statusListeners.clear()
    this.disconnectAll()
  }
}

export const connectionManager = new ConnectionManager()
