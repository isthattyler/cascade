import { useState, useMemo } from 'react'
import type { Group, Account } from '../../../../shared/types'
import { useStore } from '../../store'

interface Props {
  group: Group
  memberIds: Set<string>
  onClose: () => void
}

export function GroupEditor({ group, memberIds, onClose }: Props) {
  const accounts = useStore((s) => s.accounts)
  const setGroupAccounts = useStore((s) => s.setGroupAccounts)
  const [selected, setSelected] = useState<Set<string>>(new Set(memberIds))
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () => accounts.filter((a) => a.name.toLowerCase().includes(search.toLowerCase())),
    [accounts, search]
  )

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await setGroupAccounts(group.id, Array.from(selected))
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
      <div className="modal-panel w-full max-w-lg">
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <h2 className="font-display text-lg text-text-primary">{group.name}</h2>
          <p className="text-text-secondary text-xs mt-1">
            Select the accounts that belong to this group.
          </p>
        </div>

        <div className="px-6 py-4 space-y-3">
          <input
            className="input"
            placeholder="Search accounts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />

          <div className="max-h-64 overflow-y-auto space-y-1 -mx-2 px-2">
            {filtered.length === 0 && (
              <p className="font-mono text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>
                {accounts.length === 0 ? 'No accounts available. Connect a broker first.' : 'No accounts match your search.'}
              </p>
            )}
            {filtered.map((acct) => {
              const isChecked = selected.has(acct.id)
              return (
                <label
                  key={acct.id}
                  className="flex items-center gap-3 px-2.5 py-2 rounded cursor-pointer transition-colors text-sm"
                  style={{
                    background: isChecked ? 'var(--bg-hover)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isChecked) e.currentTarget.style.background = 'var(--bg-hover)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isChecked) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(acct.id)}
                    className="accent-amber"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-xs text-text-primary">{acct.name}</span>
                  </div>
                  {acct.is_simulated && (
                    <span
                      className="text-[9px] font-mono uppercase tracking-wider px-1 py-0.5 rounded flex-shrink-0"
                      style={{ background: 'rgba(255, 179, 0, 0.12)', color: 'var(--amber)' }}
                    >
                      SIM
                    </span>
                  )}
                  {acct.balance != null && (
                    <span className="font-mono text-xs text-text-secondary flex-shrink-0">
                      ${acct.balance.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </span>
                  )}
                </label>
              )
            })}
          </div>

          <p className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {selected.size} of {accounts.length} accounts selected
          </p>
        </div>

        <div className="px-6 pb-6 pt-2 flex items-center justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
