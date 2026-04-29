import type { ConnectionStatus } from '../../../../shared/types'

interface Props {
  status: ConnectionStatus
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = { sm: 'status-dot-sm', md: 'status-dot-md', lg: 'status-dot-lg' }
const statusClasses: Record<ConnectionStatus, string> = {
  connected: 'status-connected',
  connecting: 'status-connecting',
  disconnected: 'status-disconnected',
  error: 'status-disconnected',
  inactive: 'status-inactive',
}

const statusLabels: Record<ConnectionStatus, string> = {
  connected: 'Connected',
  connecting: 'Connecting…',
  disconnected: 'Disconnected',
  error: 'Error',
  inactive: 'Inactive',
}

export function StatusIndicator({ status, size = 'md' }: Props) {
  return (
    <span
      className={`status-dot ${sizeClasses[size]} ${statusClasses[status] ?? 'status-unknown'}`}
      title={statusLabels[status] ?? 'Unknown'}
    />
  )
}
