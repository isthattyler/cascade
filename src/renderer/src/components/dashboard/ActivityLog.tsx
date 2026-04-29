import { useEffect, useRef } from 'react'
import { useStore } from '../../store'

export function ActivityLog() {
  const logs = useStore((s) => s.logs)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm" style={{ color: 'var(--text-primary)' }}>Activity Log</h3>
        {logs.length > 0 && (
          <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Last {logs.length}
          </span>
        )}
      </div>

      <div
        className="rounded overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
      >
        <div className="max-h-64 overflow-y-auto" ref={scrollRef}>
          {logs.length === 0 ? (
            <div className="py-8 text-center">
              <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                No activity yet. Start the engine to see copy events.
              </p>
            </div>
          ) : (
            logs.map((entry) => {
              const time = new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false })
              const isError = entry.status === 'error'
              const isSkip = entry.status === 'skipped'

              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-2.5 px-3 py-1.5 text-xs font-mono border-b last:border-b-0"
                  style={{
                    borderColor: 'var(--border)',
                    background: isError ? 'var(--red-dim)' : isSkip ? 'transparent' : 'transparent',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{time}</span>

                  {isError ? (
                    <span style={{ color: 'var(--red)', flexShrink: 0 }}>✕</span>
                  ) : isSkip ? (
                    <span style={{ color: 'var(--accent)', flexShrink: 0 }}>—</span>
                  ) : (
                    <span style={{ color: 'var(--green)', flexShrink: 0 }}>✓</span>
                  )}

                  {entry.side && entry.quantity != null && entry.symbol ? (
                    <span style={{ color: 'var(--text-primary)' }}>
                      {entry.side.toUpperCase()} {entry.quantity} {entry.symbol}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-primary)' }}>{entry.event_type}</span>
                  )}

                  <span className="truncate" style={{ color: 'var(--text-muted)' }}>
                    → {entry.follower_id ?? entry.details ?? ''}
                  </span>

                  {isError && entry.error_msg && (
                    <span className="ml-auto truncate max-w-[140px]" style={{ color: 'var(--red)' }} title={entry.error_msg}>
                      {entry.error_msg}
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
