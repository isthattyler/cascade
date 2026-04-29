import { useState } from 'react'
import type { BrokerType, EnvType } from '../../../../shared/types'
import { useStore } from '../../store'
import { BrokerLogo } from '../shared/BrokerLogo'

interface Props {
  open: boolean
  onClose: () => void
}

type FormData = {
  label: string
  broker_type: BrokerType
  env: EnvType
  email: string
  password: string
  username: string
  apiKey: string
}

const emptyForm: FormData = {
  label: '',
  broker_type: 'tradovate',
  env: 'demo',
  email: '',
  password: '',
  username: '',
  apiKey: '',
}

function EnvButton({
  label, active, activeBg, activeColor, onClick,
}: {
  label: string
  active: boolean
  activeBg: string
  activeColor: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 px-3 py-2 rounded text-sm font-medium transition-all duration-150"
      style={{
        background: active ? activeBg : 'var(--bg-raised)',
        color: active ? activeColor : 'var(--text-secondary)',
        border: `1px solid ${active ? activeColor : 'var(--border)'}`,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = 'var(--border-light)'
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = 'var(--border)'
        }
      }}
    >
      {label}
    </button>
  )
}

function BrokerCard({
  broker, label, subtitle, brandColor, selected, onClick, delay,
}: {
  broker: 'tradovate' | 'projectx'
  label: string
  subtitle: string
  brandColor: string
  selected: boolean
  onClick: () => void
  delay: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-2.5 px-4 py-4 rounded-lg transition-all duration-200"
      style={{
        background: selected ? `${brandColor}12` : 'var(--bg-raised)',
        border: `1px solid ${selected ? brandColor : 'var(--border)'}`,
        boxShadow: selected ? `0 0 20px ${brandColor}30` : 'none',
        animation: `card-pop 0.25s ease-out ${delay} both`,
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = brandColor
          e.currentTarget.style.background = `${brandColor}08`
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.background = 'var(--bg-raised)'
        }
      }}
    >
      <BrokerLogo broker={broker} size={36} />
      <div className="text-center">
        <div
          className="text-sm font-semibold"
          style={{ color: selected ? brandColor : 'var(--text-primary)' }}
        >
          {label}
        </div>
        <div className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {subtitle}
        </div>
      </div>
    </button>
  )
}

export function AddConnectionDialog({ open, onClose }: Props) {
  const addConnection = useStore((s) => s.addConnection)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const isTradovate = form.broker_type === 'tradovate'

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSave = async () => {
    setError(null)

    if (!form.label.trim()) { setError('Label is required'); return }

    if (isTradovate) {
      if (!form.email.trim() || !form.password.trim()) { setError('Email and password are required'); return }
    } else {
      if (!form.username.trim() || !form.apiKey.trim()) { setError('Username and API key are required'); return }
    }

    setSaving(true)
    try {
      const credentials = isTradovate
        ? JSON.stringify({ email: form.email.trim(), password: form.password.trim() })
        : JSON.stringify({ username: form.username.trim(), apiKey: form.apiKey.trim() })

      await addConnection({
        label: form.label.trim(),
        broker_type: form.broker_type,
        env: form.env,
        credentials,
      })

      setForm(emptyForm)
      onClose()
    } catch (err) {
      setError((err as Error).message)
    }
    setSaving(false)
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-panel w-full max-w-md">
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <h2 className="font-display text-lg text-text-primary">Add Connection</h2>
          <p className="text-text-secondary text-xs mt-1">Enter your broker credentials to add a new connection.</p>
        </div>

        <div className="px-6 py-4 space-y-3">
          {/* Broker Type */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">Broker</label>
            <div className="flex gap-3">
              <BrokerCard
                broker="tradovate"
                label="Tradovate"
                subtitle="Tradovate API"
                brandColor="#00A3E0"
                selected={isTradovate}
                onClick={() => update('broker_type', 'tradovate')}
                delay="0ms"
              />
              <BrokerCard
                broker="projectx"
                label="TopstepX"
                subtitle="ProjectX API"
                brandColor="#00C853"
                selected={!isTradovate}
                onClick={() => update('broker_type', 'projectx')}
                delay="60ms"
              />
            </div>
          </div>

          {/* Environment */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Environment</label>
            <div className="flex gap-2">
              <EnvButton
                label="Demo"
                active={form.env === 'demo'}
                activeBg="var(--green-dim)"
                activeColor="var(--green)"
                onClick={() => update('env', 'demo')}
              />
              <EnvButton
                label="Live"
                active={form.env === 'live'}
                activeBg="var(--red-dim)"
                activeColor="var(--red)"
                onClick={() => update('env', 'live')}
              />
            </div>
          </div>

          {/* Label */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Label</label>
            <input
              className="input"
              placeholder="e.g. My Tradovate Demo"
              value={form.label}
              onChange={(e) => update('label', e.target.value)}
              autoFocus
            />
          </div>

          {/* Tradovate fields */}
          {isTradovate && (
            <>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Email</label>
                <input
                  className="input"
                  type="email"
                  placeholder="trader@example.com"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                />
              </div>
            </>
          )}

          {/* ProjectX fields */}
          {!isTradovate && (
            <>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Username</label>
                <input
                  className="input"
                  placeholder="username"
                  value={form.username}
                  onChange={(e) => update('username', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">API Key</label>
                <input
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={form.apiKey}
                  onChange={(e) => update('apiKey', e.target.value)}
                />
              </div>
            </>
          )}

          {error && (
            <div className="text-xs font-mono text-red px-3 py-2 rounded"
              style={{ background: 'var(--red-dim)' }}
            >
              {error}
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-2 flex items-center justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Add Connection'}
          </button>
        </div>
      </div>
    </div>
  )
}
