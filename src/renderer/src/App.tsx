import { useEffect, useState } from 'react'
import type { Connection } from '../../shared/types'

function App() {
  return (
    <div className="h-screen w-screen bg-surface text-gray-100 flex flex-col">
      <header className="h-10 bg-surface-light flex items-center px-4 border-b border-gray-700/50 draggable shrink-0">
        <span className="text-sm font-semibold tracking-wide text-gray-300">Trade Copier</span>
        <span className="ml-auto text-xs text-gray-500">(3/4 ● Connected)</span>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <nav className="w-48 bg-surface-light border-r border-gray-700/50 p-2 flex flex-col gap-1 shrink-0">
          <NavItem icon="📊" label="Dashboard" active />
          <NavItem icon="🔗" label="Accounts" badge="● 3/4" />
          <NavItem icon="📋" label="Copy" badge="● Running" />
          <NavItem icon="👥" label="Groups" />
          <NavItem icon="⚙" label="Settings" />
          <div className="mt-auto pt-2 border-t border-gray-700/50">
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 bg-surface rounded cursor-default">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse-glow inline-block" />
              3/4 ● Connected
            </div>
          </div>
        </nav>
        <main className="flex-1 p-6 overflow-y-auto">
          <h1 className="text-lg font-semibold mb-4">Dashboard</h1>
          <p className="text-gray-400 text-sm">Select a leader account and configure followers to start copying trades.</p>
        </main>
      </div>
    </div>
  )
}

function NavItem({ icon, label, active, badge }: { icon: string; label: string; active?: boolean; badge?: string }) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer text-sm transition-colors ${
        active
          ? 'bg-surface-lighter text-white'
          : 'text-gray-400 hover:bg-surface-lighter hover:text-gray-200'
      }`}
    >
      <span className="w-4 text-center">{icon}</span>
      <span>{label}</span>
      {badge && <span className="ml-auto text-xs text-gray-500">{badge}</span>}
    </div>
  )
}

export default App
