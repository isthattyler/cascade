import type { CopyRule, Account } from '../../../../shared/types'

interface Props {
  rule: CopyRule
  account: Account | undefined
  onToggle: (enabled: boolean) => void
  onEdit: () => void
  onDelete: () => void
}

export function FollowerRow({ rule, account, onToggle, onEdit, onDelete }: Props) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded transition-colors text-sm"
      style={{
        background: 'var(--bg-raised)',
        border: `1px solid var(--border)`,
        opacity: rule.enabled ? 1 : 0.5,
      }}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: rule.enabled ? 'var(--green)' : 'var(--text-muted)' }}
      />

      <div className="min-w-0 flex-1">
        <span className="font-mono text-xs text-text-primary truncate block">
          {account?.name ?? rule.follower_account}
        </span>
        <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {rule.direction === 'opposite' ? 'Opposite' : 'Same'} · {rule.lot_multiplier}x
          {rule.max_lot_size != null && ` · Max ${rule.max_lot_size}`}
          {rule.max_daily_loss != null && ` · -$${rule.max_daily_loss}`}
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {rule.copy_market && (
          <span className="text-[9px] font-mono px-1 py-0.5 rounded" style={{ background: 'rgba(245, 166, 35, 0.12)', color: 'var(--accent)' }}>
            MO
          </span>
        )}
        {rule.copy_stops && (
          <span className="text-[9px] font-mono px-1 py-0.5 rounded" style={{ background: 'rgba(245, 166, 35, 0.12)', color: 'var(--accent)' }}>
            SL
          </span>
        )}
        {rule.copy_limits && (
          <span className="text-[9px] font-mono px-1 py-0.5 rounded" style={{ background: 'rgba(79, 195, 247, 0.12)', color: 'var(--cyan)' }}>
            LI
          </span>
        )}
      </div>

      <button
        className="px-2 py-1 rounded text-[10px] font-mono transition-colors"
        style={{
          background: 'var(--bg-deep)',
          color: 'var(--text-secondary)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-deep)' }}
        onClick={onEdit}
      >
        Config
      </button>

      <button
        className="relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200"
        style={{
          background: rule.enabled ? 'var(--green)' : 'var(--border)',
        }}
        onClick={() => onToggle(!rule.enabled)}
        role="switch"
        aria-checked={rule.enabled}
      >
        <span
          className="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform ring-0 transition duration-200"
          style={{ transform: rule.enabled ? 'translateX(18px)' : 'translateX(0)' }}
        />
      </button>

      <button
        className="text-xs shrink-0"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
        onClick={onDelete}
        title="Remove"
      >
        ✕
      </button>
    </div>
  )
}
