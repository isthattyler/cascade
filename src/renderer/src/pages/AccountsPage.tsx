import { useState } from 'react'
import { useStore } from '../store'
import { ConnectionCard } from '../components/accounts/ConnectionCard'
import { AddConnectionDialog } from '../components/accounts/AddConnectionDialog'
import { Plug } from 'lucide-react'

export function AccountsPage() {
  const connections = useStore((s) => s.connections)
  const accounts = useStore((s) => s.accounts)
  const [showAdd, setShowAdd] = useState(false)

  const connectedCount = connections.filter(
    (c) => useStore.getState().connectionStates[c.id]?.status === 'connected'
  ).length

  return (
    <div className="page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-xl" style={{ color: 'var(--text-primary)' }}>Accounts</h1>
          <p className="font-mono text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {connectedCount}/{connections.length} connections active
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          + Add Connection
        </button>
      </div>

      {connections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Plug size={32} className="mb-3" style={{ opacity: 0.3, color: 'var(--text-muted)' }} />
          <p className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>
            No connections yet.
          </p>
          <p className="font-mono text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            Click "Add Connection" to link your Tradovate or TopstepX account.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {connections.map((conn) => (
            <ConnectionCard
              key={conn.id}
              connection={conn}
              accounts={accounts.filter((a) => a.connection_id === conn.id)}
            />
          ))}
        </div>
      )}

      <AddConnectionDialog open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  )
}
