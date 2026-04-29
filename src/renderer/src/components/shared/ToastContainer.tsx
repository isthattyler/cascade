import { useEffect } from 'react'
import { useStore, type Toast } from '../../store'

const typeStyles: Record<Toast['type'], React.CSSProperties> = {
  success: { borderLeft: '3px solid var(--green)', background: 'var(--green-dim)' },
  error: { borderLeft: '3px solid var(--red)', background: 'var(--red-dim)' },
  warning: { borderLeft: '3px solid var(--amber)', background: 'var(--amber-dim)' },
  info: { borderLeft: '3px solid var(--cyan)', background: 'rgba(79, 195, 247, 0.10)' },
}

const typeIcons: Record<Toast['type'], string> = {
  success: '✓',
  error: '✕',
  warning: '▲',
  info: '●',
}

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useStore((s) => s.removeToast)

  useEffect(() => {
    const timer = setTimeout(() => removeToast(toast.id), toast.duration ?? 4000)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, removeToast])

  return (
    <div
      className="flex items-start gap-2.5 px-3 py-2.5 rounded text-xs font-mono shadow-lg"
      style={{
        ...typeStyles[toast.type],
        color: 'var(--text-primary)',
        border: '1px solid var(--border)',
        animation: 'slide-in 0.2s ease-out',
        maxWidth: '360px',
        wordBreak: 'break-word',
      }}
    >
      <span style={{ color: toast.type === 'success' ? 'var(--green)' : toast.type === 'error' ? 'var(--red)' : toast.type === 'warning' ? 'var(--amber)' : 'var(--cyan)', flexShrink: 0 }}>
        {typeIcons[toast.type]}
      </span>
      <span className="flex-1" style={{ color: 'var(--text-primary)' }}>{toast.message}</span>
      <button
        onClick={() => removeToast(toast.id)}
        style={{ color: 'var(--text-muted)', flexShrink: 0 }}
        className="hover:opacity-80"
      >
        ✕
      </button>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  )
}
