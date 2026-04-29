import { useState, useCallback } from 'react'
import { useStore } from '../store'
import { LeaderSelector } from '../components/dashboard/LeaderSelector'
import { FollowerRow } from '../components/dashboard/FollowerRow'
import { FollowerConfigPanel } from '../components/dashboard/FollowerConfigPanel'
import { AddFollowerDialog } from '../components/dashboard/AddFollowerDialog'
import { ActivityLog } from '../components/dashboard/ActivityLog'
import type { CopyRule } from '../../shared/types'

export function DashboardPage() {
  const accounts = useStore((s) => s.accounts)
  const copyRules = useStore((s) => s.copyRules)
  const engineRunning = useStore((s) => s.engineRunning)
  const leaderId = useStore((s) => s.selectedLeaderId)
  const setLeaderId = useStore((s) => s.setSelectedLeaderId)
  const loadCopyRules = useStore((s) => s.loadCopyRules)
  const toggleCopyRule = useStore((s) => s.toggleCopyRule)
  const deleteCopyRule = useStore((s) => s.deleteCopyRule)

  const [showAdd, setShowAdd] = useState(false)
  const [editingRule, setEditingRule] = useState<CopyRule | null>(null)
  const [engineLoading, setEngineLoading] = useState(false)

  const leaderRules = copyRules.filter((r) => r.leader_account === leaderId)
  const followerIds = new Set(leaderRules.map((r) => r.follower_account))

  const handleStart = useCallback(async () => {
    if (!leaderId) return
    setEngineLoading(true)
    try {
      if (engineRunning) {
        await window.api.engine.stop()
      } else {
        await window.api.engine.start(leaderId)
      }
    } finally {
      setEngineLoading(false)
    }
  }, [leaderId, engineRunning])

  const handleDelete = async (rule: CopyRule) => {
    await deleteCopyRule(rule.id)
  }

  const connectedAccounts = accounts.filter((a) => {
    const connState = useStore.getState().connectionStates
    const conn = useStore.getState().connections.find((c) => c.id === a.connection_id)
    return conn && connState[conn.id]?.status === 'connected'
  })

  return (
    <div className="page-enter">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-xl" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
        {engineRunning && (
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded flex items-center gap-1.5"
            style={{ background: 'var(--green-dim)', color: 'var(--green)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse-glow inline-block" />
            Engine Running
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-5">
          {/* Leader */}
          <div
            className="rounded-lg p-4"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}
          >
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Leader Account
            </label>
            <LeaderSelector
              accounts={connectedAccounts}
              selectedId={leaderId}
              onSelect={setLeaderId}
            />

            {leaderId && (
              <div className="flex items-center gap-2 mt-3">
                <button
                  className={`btn ${engineRunning ? 'btn-danger' : 'btn-success'} text-xs`}
                  onClick={handleStart}
                  disabled={engineLoading}
                >
                  {engineLoading ? (
                    <>
                      <span className="inline-block w-3 h-3 rounded-full border-2 border-transparent border-t-current animate-spin" />
                      {engineRunning ? 'Stopping…' : 'Starting…'}
                    </>
                  ) : engineRunning ? (
                    'Stop Engine'
                  ) : (
                    '▶ Start Copying'
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Followers */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-sm" style={{ color: 'var(--text-primary)' }}>
                Followers
                {leaderRules.length > 0 && (
                  <span className="ml-2 font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    ({leaderRules.length})
                  </span>
                )}
              </h3>
              {leaderId && (
                <button className="btn btn-ghost text-xs" onClick={() => setShowAdd(true)}>
                  + Add Follower
                </button>
              )}
            </div>

            {!leaderId ? (
              <div className="py-12 text-center">
                <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                  Select a leader account to configure followers.
                </p>
              </div>
            ) : leaderRules.length === 0 ? (
              <div className="py-8 text-center" style={{ background: 'var(--bg-raised)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <p className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                  No followers configured yet.
                </p>
                <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  Click "Add Follower" to set up copying.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderRules.map((rule) => (
                  <FollowerRow
                    key={rule.id}
                    rule={rule}
                    account={accounts.find((a) => a.id === rule.follower_account)}
                    onToggle={(enabled) => toggleCopyRule(rule.id, enabled)}
                    onEdit={() => setEditingRule(rule)}
                    onDelete={() => handleDelete(rule)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Activity Log */}
        <div>
          <ActivityLog />
        </div>
      </div>

      {/* Dialogs */}
      {showAdd && leaderId && (
        <AddFollowerDialog
          leaderId={leaderId}
          existingFollowerIds={followerIds}
          accounts={connectedAccounts}
          onClose={() => {
            setShowAdd(false)
            loadCopyRules()
          }}
        />
      )}

      {editingRule && (
        <FollowerConfigPanel
          rule={editingRule}
          onClose={() => setEditingRule(null)}
        />
      )}
    </div>
  )
}
