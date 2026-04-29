import { useState } from 'react'
import type { Group, Account } from '../../../../shared/types'

interface Props {
  group: Group
  members: Account[]
  onEdit: () => void
  onDelete: () => void
}

export function GroupCard({ group, members, onEdit, onDelete }: Props) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  const createdDate = new Date(group.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="card-hover bg-raised border border-border rounded-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-body font-semibold text-sm text-text-primary truncate">
              {group.name}
            </h3>
            <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {members.length} {members.length === 1 ? 'account' : 'accounts'} · Created {createdDate}
            </p>
          </div>
        </div>

        {members.length > 0 && (
          <div className="mb-3 space-y-1">
            {members.slice(0, 4).map((acct) => (
              <div
                key={acct.id}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded text-sm"
                style={{ background: 'var(--bg-deep)' }}
              >
                <span className="font-mono text-xs text-text-primary truncate">{acct.name}</span>
                {acct.is_simulated && (
                  <span
                    className="text-[9px] font-mono uppercase tracking-wider px-1 py-0.5 rounded flex-shrink-0"
                    style={{ background: 'rgba(255, 179, 0, 0.12)', color: 'var(--amber)' }}
                  >
                    SIM
                  </span>
                )}
                {acct.balance != null && (
                  <span className="ml-auto font-mono text-xs text-text-secondary flex-shrink-0">
                    ${acct.balance.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </span>
                )}
              </div>
            ))}
            {members.length > 4 && (
              <p className="font-mono text-[10px] text-center pt-1" style={{ color: 'var(--text-muted)' }}>
                +{members.length - 4} more
              </p>
            )}
          </div>
        )}

        {members.length === 0 && (
          <div className="mb-3 px-2.5 py-3 rounded text-center" style={{ background: 'var(--bg-deep)' }}>
            <p className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
              No accounts assigned
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button className="btn btn-ghost text-xs" onClick={onEdit}>
            Edit Members
          </button>
          <button className="btn btn-danger ml-auto text-xs" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
