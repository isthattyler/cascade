import { useState } from 'react'
import type { CopyRule } from '../../../../shared/types'
import { useStore } from '../../store'

interface Props {
  rule: CopyRule
  onClose: () => void
}

export function FollowerConfigPanel({ rule, onClose }: Props) {
  const updateCopyRule = useStore((s) => s.updateCopyRule)

  const [form, setForm] = useState({
    direction: rule.direction,
    lot_multiplier: rule.lot_multiplier,
    max_lot_size: rule.max_lot_size ?? null,
    min_lot_size: rule.min_lot_size ?? null,
    max_daily_loss: rule.max_daily_loss ?? null,
    max_open_contracts: rule.max_open_contracts ?? null,
    copy_stops: rule.copy_stops,
    copy_limits: rule.copy_limits,
  })

  const [saving, setSaving] = useState(false)

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateCopyRule(rule.id, form)
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
      <div className="modal-panel w-full max-w-sm">
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <h2 className="font-display text-lg text-text-primary">Follower Config</h2>
          <p className="text-text-secondary text-xs mt-1 font-mono">{rule.follower_account}</p>
        </div>

        <div className="px-6 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Direction</label>
            <div className="flex gap-2">
              <button
                className="flex-1 px-3 py-2 rounded text-sm font-medium transition-all duration-150"
                style={{
                  background: form.direction === 'same' ? 'var(--green-dim)' : 'var(--bg-raised)',
                  color: form.direction === 'same' ? 'var(--green)' : 'var(--text-secondary)',
                  border: `1px solid ${form.direction === 'same' ? 'var(--green)' : 'var(--border)'}`,
                }}
                onClick={() => update('direction', 'same')}
              >
                Same
              </button>
              <button
                className="flex-1 px-3 py-2 rounded text-sm font-medium transition-all duration-150"
                style={{
                  background: form.direction === 'opposite' ? 'var(--red-dim)' : 'var(--bg-raised)',
                  color: form.direction === 'opposite' ? 'var(--red)' : 'var(--text-secondary)',
                  border: `1px solid ${form.direction === 'opposite' ? 'var(--red)' : 'var(--border)'}`,
                }}
                onClick={() => update('direction', 'opposite')}
              >
                Opposite
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Lot Multiplier</label>
              <input
                className="input"
                type="number"
                step="0.05"
                min="0.01"
                value={form.lot_multiplier}
                onChange={(e) => update('lot_multiplier', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Max Lot Size</label>
              <input
                className="input"
                type="number"
                step="0.5"
                min="0"
                placeholder="Unlimited"
                value={form.max_lot_size ?? ''}
                onChange={(e) => update('max_lot_size', e.target.value ? parseFloat(e.target.value) : null)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Min Lot Size</label>
              <input
                className="input"
                type="number"
                step="0.5"
                min="0"
                placeholder="None"
                value={form.min_lot_size ?? ''}
                onChange={(e) => update('min_lot_size', e.target.value ? parseFloat(e.target.value) : null)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Max Daily Loss ($)</label>
              <input
                className="input"
                type="number"
                step="100"
                min="0"
                placeholder="Unlimited"
                value={form.max_daily_loss ?? ''}
                onChange={(e) => update('max_daily_loss', e.target.value ? parseFloat(e.target.value) : null)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Max Open Contracts</label>
            <input
              className="input"
              type="number"
              step="1"
              min="0"
              placeholder="Unlimited"
              value={form.max_open_contracts ?? ''}
              onChange={(e) => update('max_open_contracts', e.target.value ? parseInt(e.target.value) : null)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Copy Settings</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.copy_stops}
                  onChange={(e) => update('copy_stops', e.target.checked)}
                  className="accent-amber"
                />
                <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>Stop Losses</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.copy_limits}
                  onChange={(e) => update('copy_limits', e.target.checked)}
                  className="accent-amber"
                />
                <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>Limit Orders</span>
              </label>
            </div>
          </div>
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
