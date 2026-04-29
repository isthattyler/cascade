import { useState, useRef, useEffect } from 'react'
import type { Account } from '../../../../shared/types'

interface Props {
  accounts: Account[]
  selectedId: string | null
  onSelect: (accountId: string) => void
}

export function LeaderSelector({ accounts, selectedId, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const selected = accounts.find((a) => a.id === selectedId)

  const filtered = accounts.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors"
        style={{
          background: 'var(--bg-raised)',
          border: `1px solid var(--border)`,
          color: 'var(--text-primary)',
        }}
        onClick={() => setOpen(!open)}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-light)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
      >
        {selected ? (
          <>
            <span className="w-2 h-2 rounded-full animate-pulse-glow shrink-0" style={{ background: 'var(--green)' }} />
            <span className="font-mono text-sm truncate">{selected.name}</span>
            {selected.balance != null && (
              <span className="ml-auto font-mono text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                ${selected.balance.toLocaleString('en-US', { minimumFractionDigits: 0 })}
              </span>
            )}
          </>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>Select leader account…</span>
        )}
        <span className="ml-auto text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>▼</span>
      </button>

      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1 z-20 rounded border overflow-hidden"
          style={{
            background: 'var(--bg-raised)',
            borderColor: 'var(--border)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          <div className="p-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <input
              className="input text-xs"
              placeholder="Search accounts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="font-mono text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
                No connected accounts
              </p>
            )}
            {filtered.map((acct) => {
              const isSelected = acct.id === selectedId
              return (
                <button
                  key={acct.id}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-mono text-left transition-colors"
                  style={{
                    background: isSelected ? 'var(--bg-hover)' : 'transparent',
                    color: 'var(--text-primary)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent'
                  }}
                  onClick={() => { onSelect(acct.id); setOpen(false); setSearch('') }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: isSelected ? 'var(--green)' : 'var(--text-muted)' }}
                  />
                  <span className="truncate">{acct.name}</span>
                  {acct.balance != null && (
                    <span className="ml-auto shrink-0" style={{ color: 'var(--text-muted)' }}>
                      ${acct.balance.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
