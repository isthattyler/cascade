import { useState, useMemo } from 'react'
import type { Account, Group } from '../../../../shared/types'
import { useStore } from '../../store'

interface Props {
  leaderId: string
  existingFollowerIds: Set<string>
  accounts: Account[]
  onClose: () => void
}

export function AddFollowerDialog({ leaderId, existingFollowerIds, accounts, onClose }: Props) {
  const groups = useStore((s) => s.groups)
  const createCopyRule = useStore((s) => s.createCopyRule)
  const [tab, setTab] = useState<'accounts' | 'groups'>('accounts')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const available = useMemo(() => {
    if (tab === 'accounts') {
      return accounts.filter((a) => a.id !== leaderId && !existingFollowerIds.has(a.id))
        .filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    }
    return []
  }, [tab, accounts, leaderId, existingFollowerIds, search])

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const handleAdd = async () => {
    setSaving(true)
    try {
      if (tab === 'accounts') {
        for (const accountId of selected) {
          await createCopyRule({ leader_account: leaderId, follower_account: accountId })
        }
      } else {
        for (const groupId of selected) {
          const groupAccounts = await window.api.db.getGroupAccounts(groupId)
          for (const acct of groupAccounts) {
            if (acct.id !== leaderId && !existingFollowerIds.has(acct.id)) {
              await createCopyRule({ leader_account: leaderId, follower_account: acct.id })
            }
          }
        }
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleOverlay = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlay}>
      <div className="modal-panel w-full max-w-md">
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <h2 className="font-display text-lg text-text-primary">Add Follower</h2>
          <p className="text-text-secondary text-xs mt-1">Choose accounts or groups to follow the leader.</p>
        </div>

        <div className="px-6 py-4 space-y-3">
          <div className="flex gap-2">
            <button
              className="flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all"
              style={{
                background: tab === 'accounts' ? 'var(--bg-hover)' : 'transparent',
                color: tab === 'accounts' ? 'var(--text-primary)' : 'var(--text-muted)',
                border: `1px solid ${tab === 'accounts' ? 'var(--border-light)' : 'transparent'}`,
              }}
              onClick={() => { setTab('accounts'); setSelected(new Set()) }}
            >
              Accounts
            </button>
            <button
              className="flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all"
              style={{
                background: tab === 'groups' ? 'var(--bg-hover)' : 'transparent',
                color: tab === 'groups' ? 'var(--text-primary)' : 'var(--text-muted)',
                border: `1px solid ${tab === 'groups' ? 'var(--border-light)' : 'transparent'}`,
              }}
              onClick={() => { setTab('groups'); setSelected(new Set()) }}
            >
              Groups
            </button>
          </div>

          {tab === 'accounts' && (
            <>
              <input
                className="input"
                placeholder="Search accounts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />

              <div className="max-h-60 overflow-y-auto space-y-1 -mx-2 px-2">
                {available.length === 0 && (
                  <p className="font-mono text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>
                    {accounts.length <= 1 ? 'Connect more broker accounts first.' : 'All accounts are already followers.'}
                  </p>
                )}
                {available.map((acct) => {
                  const isChecked = selected.has(acct.id)
                  return (
                    <label
                      key={acct.id}
                      className="flex items-center gap-3 px-2.5 py-2 rounded cursor-pointer transition-colors text-sm"
                      style={{ background: isChecked ? 'var(--bg-hover)' : 'transparent' }}
                      onMouseEnter={(e) => { if (!isChecked) e.currentTarget.style.background = 'var(--bg-hover)' }}
                      onMouseLeave={(e) => { if (!isChecked) e.currentTarget.style.background = 'transparent' }}
                    >
                      <input type="checkbox" checked={isChecked} onChange={() => toggle(acct.id)} className="accent-amber" />
                      <span className="font-mono text-xs text-text-primary flex-1 truncate">{acct.name}</span>
                      {acct.balance != null && (
                        <span className="font-mono text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                          ${acct.balance.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            </>
          )}

          {tab === 'groups' && (
            <div className="max-h-60 overflow-y-auto space-y-1 -mx-2 px-2">
              {groups.length === 0 && (
                <p className="font-mono text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>
                  No groups yet. Create one on the Groups page.
                </p>
              )}
              {groups.map((g) => {
                const isChecked = selected.has(g.id)
                return (
                  <label
                    key={g.id}
                    className="flex items-center gap-3 px-2.5 py-2 rounded cursor-pointer transition-colors text-sm"
                    style={{ background: isChecked ? 'var(--bg-hover)' : 'transparent' }}
                    onMouseEnter={(e) => { if (!isChecked) e.currentTarget.style.background = 'var(--bg-hover)' }}
                    onMouseLeave={(e) => { if (!isChecked) e.currentTarget.style.background = 'transparent' }}
                  >
                    <input type="checkbox" checked={isChecked} onChange={() => toggle(g.id)} className="accent-amber" />
                    <span className="font-mono text-xs text-text-primary">{g.name}</span>
                  </label>
                )
              })}
            </div>
          )}

          <p className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {selected.size} selected
          </p>
        </div>

        <div className="px-6 pb-6 pt-2 flex items-center justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving || selected.size === 0}>
            {saving ? 'Adding…' : `Add ${selected.size > 0 ? `(${selected.size})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
