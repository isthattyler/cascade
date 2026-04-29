interface Props {
  size?: number
  showWordmark?: boolean
  wordmarkSize?: 'sm' | 'md'
}

export function AppLogo({ size = 22, showWordmark = true, wordmarkSize = 'sm' }: Props) {
  const fontSize = wordmarkSize === 'sm' ? 'text-sm' : 'text-base'

  const w = size * 1.2
  const h = size * 1.2
  const cx = w / 2
  const cy = h / 2
  const pad = w * 0.12
  const bodyThickness = w * 0.26

  const x1 = pad
  const y1 = h - pad
  const x2 = w - pad
  const y2 = pad

  const bodyLen = w * 0.38
  const bodyStart = bodyLen * 0.35

  const bx1 = cx - bodyStart * Math.cos(Math.PI / 4)
  const by1 = cy + bodyStart * Math.sin(Math.PI / 4)
  const bx2 = cx + bodyStart * Math.cos(Math.PI / 4)
  const by2 = cy - bodyStart * Math.sin(Math.PI / 4)

  return (
    <span className="inline-flex items-center gap-2" style={{ color: 'var(--accent)' }}>
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        fill="none"
        style={{ flexShrink: 0 }}
      >
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="currentColor"
          strokeWidth={bodyThickness * 0.3}
          strokeLinecap="round"
          opacity={0.35}
        />
        <line
          x1={bx1}
          y1={by1}
          x2={bx2}
          y2={by2}
          stroke="currentColor"
          strokeWidth={bodyThickness}
          strokeLinecap="butt"
        />
      </svg>
      {showWordmark && (
        <span
          className={`font-display ${fontSize} tracking-[0.12em]`}
          style={{ color: 'var(--accent)' }}
        >
          CASCADE
        </span>
      )}
    </span>
  )
}
