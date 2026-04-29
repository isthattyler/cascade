import { useEffect, useState, Component, type ReactNode } from 'react'
import { BarChart3, Link2, Users, Settings } from 'lucide-react'
import { useStore } from './store'
import { AppLogo } from './components/shared/AppLogo'
import { DashboardPage } from './pages/DashboardPage'
import { AccountsPage } from './pages/AccountsPage'
import { GroupsPage } from './pages/GroupsPage'
import { SettingsPage } from './pages/SettingsPage'
import { StatusIndicator } from './components/shared/StatusIndicator'
import { ToastContainer } from './components/shared/ToastContainer'
import type { ConnectionStatus } from '../../shared/types'

type Page = 'dashboard' | 'accounts' | 'groups' | 'settings'

const nav: { id: Page; icon: ReactNode; label: string; activeColor: string }[] = [
  { id: 'dashboard', icon: <BarChart3 size={16} />, label: 'Dashboard', activeColor: 'var(--accent)' },
  { id: 'accounts', icon: <Link2 size={16} />, label: 'Accounts', activeColor: 'var(--cyan)' },
  { id: 'groups', icon: <Users size={16} />, label: 'Groups', activeColor: 'var(--green)' },
  { id: 'settings', icon: <Settings size={16} />, label: 'Settings', activeColor: 'var(--amber)' },
]

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-deep)' }}>
          <div className="text-center max-w-md">
            <span className="text-3xl mb-3 block opacity-40">!</span>
            <h2 className="font-display text-lg mb-2" style={{ color: 'var(--text-primary)' }}>Something went wrong</h2>
            <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
              {this.state.error?.message ?? 'Unknown error'}
            </p>
            <button className="btn btn-primary mt-4" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function App() {
  const [page, setPage] = useState<Page>('accounts')
  const loading = useStore((s) => s.loading)
  const connections = useStore((s) => s.connections)
  const connectionStates = useStore((s) => s.connectionStates)
  const engineRunning = useStore((s) => s.engineRunning)
  const initialize = useStore((s) => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  const connected = connections.filter(
    (c) => connectionStates[c.id]?.status === 'connected'
  ).length

  const worstStatus: ConnectionStatus = connections.length === 0
    ? 'inactive'
    : connections.some((c) => connectionStates[c.id]?.status === 'error' || connectionStates[c.id]?.status === 'disconnected')
      ? 'disconnected'
      : connections.every((c) => connectionStates[c.id]?.status === 'connected')
        ? 'connected'
        : 'connecting'

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <DashboardPage />
      case 'accounts': return <AccountsPage />
      case 'groups': return <GroupsPage />
      case 'settings': return <SettingsPage />
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-deep)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-transparent animate-spin"
            style={{ borderTopColor: 'var(--accent)', borderRightColor: 'var(--accent)' }}
          />
          <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>Loading…</span>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>
      {/* Title Bar */}
        <header className="draggable h-10 flex items-center px-4 shrink-0"
          style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}
        >
          <AppLogo size={16} wordmarkSize="sm" />
        <div className="ml-auto flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
          <span className="font-mono text-[10px]">
            {connected}/{connections.length} active
          </span>
          <StatusIndicator status={worstStatus} size="sm" />
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-48 shrink-0 flex flex-col p-2 gap-0.5"
          style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
        >
          <div className="px-3 py-3 mb-1">
            <AppLogo size={20} wordmarkSize="md" />
          </div>
          {nav.map((item) => {
            const isActive = page === item.id
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className="flex items-center gap-2.5 px-3 py-2 rounded text-sm text-left transition-all duration-150"
                style={{
                  background: isActive ? 'var(--bg-hover)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: isActive ? 500 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent'
                }}
              >
                <span className="w-4 flex items-center justify-center shrink-0" style={{ color: isActive ? item.activeColor : undefined }}>{item.icon}</span>
                <span>{item.label}</span>
                {item.id === 'dashboard' && engineRunning && (
                  <span className="ml-auto w-2 h-2 rounded-full animate-pulse-glow inline-block"
                    style={{ background: 'var(--green)' }}
                  />
                )}
              </button>
            )
          })}

          {/* Status Bar */}
          <div className="mt-auto pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 px-3 py-2 rounded cursor-default"
              style={{ background: 'var(--bg-deep)' }}
            >
              <StatusIndicator status={worstStatus} size="sm" />
              <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {connected}/{connections.length} Connected
              </span>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {renderPage()}
        </main>
      </div>
      <ToastContainer />
    </div>
    </ErrorBoundary>
  )
}

export default App
