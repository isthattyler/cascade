export function SettingsPage() {
  return (
    <div className="page-enter">
      <h1 className="font-display text-xl mb-6" style={{ color: 'var(--text-primary)' }}>Settings</h1>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-3xl mb-3 opacity-30">⚙</span>
        <p className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>
          Configure default environment, latency delay, and risk limits.
        </p>
        <p className="font-mono text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
          Coming in a future phase
        </p>
      </div>
    </div>
  )
}
