import { useState, useEffect } from 'react'
import { Settings } from 'lucide-react'

export function SettingsPage() {
  const [defaultEnv, setDefaultEnv] = useState('demo')
  const [defaultLotMult, setDefaultLotMult] = useState('1.0')
  const [pruneDays, setPruneDays] = useState('90')
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const env = await window.api.db.getSetting('default_env')
      if (env) setDefaultEnv(env)
      const lot = await window.api.db.getSetting('default_lot_multiplier')
      if (lot) setDefaultLotMult(lot)
      const days = await window.api.db.getSetting('prune_log_days')
      if (days) setPruneDays(days)
    })()
  }, [])

  const save = async (key: string, value: string) => {
    setSaving(key)
    await window.api.db.setSetting(key, value)
    setSaving(null)
  }

  return (
    <div className="page-enter">
      <div className="flex items-center gap-3 mb-6">
        <Settings size={20} style={{ color: 'var(--accent)' }} />
        <h1 className="font-display text-xl" style={{ color: 'var(--text-primary)' }}>Settings</h1>
      </div>

      <div className="max-w-lg space-y-4">
        <div className="rounded-lg p-4" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
          <h3 className="font-display text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Defaults</h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Default Environment</label>
              <div className="flex gap-2">
                <button
                  className="flex-1 px-3 py-2 rounded text-sm font-medium transition-all duration-150"
                  style={{
                    background: defaultEnv === 'demo' ? 'rgba(76, 175, 80, 0.15)' : 'var(--bg-deep)',
                    color: defaultEnv === 'demo' ? 'var(--green)' : 'var(--text-secondary)',
                    border: `1px solid ${defaultEnv === 'demo' ? 'var(--green)' : 'var(--border)'}`,
                  }}
                  onClick={() => { setDefaultEnv('demo'); save('default_env', 'demo') }}
                  disabled={saving === 'default_env'}
                >
                  Demo
                </button>
                <button
                  className="flex-1 px-3 py-2 rounded text-sm font-medium transition-all duration-150"
                  style={{
                    background: defaultEnv === 'live' ? 'rgba(239, 83, 80, 0.15)' : 'var(--bg-deep)',
                    color: defaultEnv === 'live' ? 'var(--red)' : 'var(--text-secondary)',
                    border: `1px solid ${defaultEnv === 'live' ? 'var(--red)' : 'var(--border)'}`,
                  }}
                  onClick={() => { setDefaultEnv('live'); save('default_env', 'live') }}
                  disabled={saving === 'default_env'}
                >
                  Live
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Default Lot Multiplier</label>
              <input
                className="input"
                type="number"
                step="1"
                min="0.01"
                value={defaultLotMult}
                onChange={(e) => setDefaultLotMult(e.target.value)}
                onBlur={() => save('default_lot_multiplier', defaultLotMult)}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg p-4" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
          <h3 className="font-display text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Data</h3>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Auto-prune logs older than (days)</label>
            <input
              className="input"
              type="number"
              min="1"
              max="365"
              value={pruneDays}
              onChange={(e) => setPruneDays(e.target.value)}
              onBlur={() => save('prune_log_days', pruneDays)}
            />
            <p className="text-[10px] mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>
              Old activity log entries will be automatically pruned.
            </p>
          </div>
        </div>

        <div className="rounded-lg p-4" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
          <h3 className="font-display text-sm mb-1" style={{ color: 'var(--text-primary)' }}>About</h3>
          <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
            Cascade v1.0.0 — Real-time trade copier for Tradovate and TopstepX
          </p>
        </div>
      </div>
    </div>
  )
}
