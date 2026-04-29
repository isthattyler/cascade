interface Props {
  broker: 'tradovate' | 'projectx'
  size?: number
}

export function BrokerLogo({ broker, size = 32 }: Props) {
  if (broker === 'tradovate') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* angled T — three ascending chevron bars projecting forward */}
        <path d="M6 8h20M6 16h20" stroke="#00A3E0" strokeWidth="3.5" strokeLinecap="round" />
        <path
          d="M18 8c0 8 8 14 14 22"
          stroke="#00A3E0"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.55"
        />
        <path
          d="M10 8c0 10 10 18 18 28"
          stroke="#00A3E0"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.3"
        />
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* X — two crossing bars with tapered ends */}
      <path
        d="M8 8l16 8 8 16"
        stroke="#00C853"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 8L16 16l-8 16"
        stroke="#00C853"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
    </svg>
  )
}
