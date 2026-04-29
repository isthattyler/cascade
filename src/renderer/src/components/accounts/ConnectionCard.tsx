import { useState } from 'react'
import type { Connection, Account } from '../../../../shared/types'
import { useStore } from '../../store'
import { StatusIndicator } from '../shared/StatusIndicator'

interface Props {
  connection: Connection
  accounts: Account[]
}

export function ConnectionCard({ connection, accounts }: Props) {
  const state = useStore((s) => s.connectionStates[connection.id])
  const { connectBroker, disconnectBroker, deleteConnection } = useStore()
  const [connecting, setConnecting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const status = state?.status ?? 'disconnected'
  const isConnected = status === 'connected'
  const isLoading = status === 'connecting' || connecting

  const handleConnect = async () => {
    setConnecting(true)
    try {
      await connectBroker(connection.id, connection.label, connection.broker_type, connection.env)
    } catch {
      /* error toast is handled in store */
    }
    setConnecting(false)
  }

  const handleDisconnect = async () => {
    await disconnectBroker(connection.id)
  }

  const handleDelete = async () => {
    setDeleting(true)
    await deleteConnection(connection.id)
  }

  return (
    <div className="card-hover bg-raised border border-border rounded-lg overflow-hidden">
      <div
        className={`h-0.5 ${isConnected ? 'bg-green' : isLoading ? 'bg-amber' : 'bg-text-muted'}`}
        style={{
          background: isConnected ? 'var(--green)' : isLoading ? 'var(--amber)' : 'var(--text-muted)',
        }}
      />

      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <StatusIndicator status={status} size="lg" />
          <div className="min-w-0 flex-1">
            <h3 className="font-body font-semibold text-sm text-text-primary truncate">
              {connection.label}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{
                  background: connection.broker_type === 'tradovate' ? 'rgba(79, 195, 247, 0.12)' : 'rgba(245, 166, 35, 0.12)',
                  color: connection.broker_type === 'tradovate' ? 'var(--cyan)' : 'var(--accent)',
                }}
              >
                {connection.broker_type}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{
                  background: connection.env === 'live' ? 'rgba(239, 83, 80, 0.12)' : 'rgba(76, 175, 80, 0.12)',
                  color: connection.env === 'live' ? 'var(--red)' : 'var(--green)',
                }}
              >
                {connection.env}
              </span>
              {state?.errorMsg && (
                <span className="text-[10px] font-mono text-red truncate max-w-[140px]" title={state.errorMsg}>
                  {state.errorMsg}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Accounts */}
        {accounts.length > 0 && (
          <div className="mb-3 space-y-1">
            {accounts.map((acct) => (
              <div key={acct.id}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded text-sm"
                style={{ background: 'var(--bg-deep)' }}
              >
                <StatusIndicator status={isConnected ? 'connected' : 'disconnected'} size="sm" />
                <span className="font-mono text-xs text-text-primary">{acct.name}</span>
                {acct.is_simulated && (
                  <span className="text-[9px] font-mono uppercase tracking-wider px-1 py-0.5 rounded"
                    style={{ background: 'rgba(255, 179, 0, 0.12)', color: 'var(--amber)' }}
                  >
                    SIM
                  </span>
                )}
                {acct.balance != null && (
                  <span className="ml-auto font-mono text-xs text-text-secondary">
                    ${acct.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {!isConnected ? (
            <button className="btn btn-success" onClick={handleConnect} disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="inline-block w-3 h-3 rounded-full border-2 border-transparent border-t-green animate-spin" />
                  Connecting…
                </>
              ) : (
                'Connect'
              )}
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={handleDisconnect}>
              Disconnect
            </button>
          )}
          <button className="btn btn-danger ml-auto" onClick={handleDelete} disabled={deleting}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
