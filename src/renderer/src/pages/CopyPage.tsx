export function CopyPage() {
  return (
    <div className="page-enter">
      <h1 className="font-display text-xl mb-6" style={{ color: 'var(--text-primary)' }}>Copy Rules</h1>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-3xl mb-3 opacity-30">📋</span>
        <p className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>
          Copy configuration is on the Dashboard.
        </p>
        <p className="font-mono text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
          Navigate to Dashboard to select a leader and configure followers.
        </p>
      </div>
    </div>
  )
}
