import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../store'
import { GroupCard } from '../components/groups/GroupCard'
import { GroupEditor } from '../components/groups/GroupEditor'
import type { Group, Account } from '../../../shared/types'

export function GroupsPage() {
  const groups = useStore((s) => s.groups)
  const accounts = useStore((s) => s.accounts)
  const createGroup = useStore((s) => s.createGroup)
  const deleteGroup = useStore((s) => s.deleteGroup)
  const loadGroups = useStore((s) => s.loadGroups)

  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [creating, setCreating] = useState(false)

  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [editingMemberIds, setEditingMemberIds] = useState<Set<string>>(new Set())

  const [groupMembers, setGroupMembers] = useState<Record<string, Account[]>>({})

  const loadMembers = useCallback(async () => {
    const map: Record<string, Account[]> = {}
    for (const g of groups) {
      map[g.id] = await window.api.db.getGroupAccounts(g.id)
    }
    setGroupMembers(map)
  }, [groups])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const handleCreate = async () => {
    if (!createName.trim()) return
    setCreating(true)
    try {
      await createGroup(createName.trim())
      setCreateName('')
      setShowCreate(false)
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = async (group: Group) => {
    const members = await window.api.db.getGroupAccounts(group.id)
    setEditingMemberIds(new Set(members.map((m) => m.id)))
    setEditingGroup(group)
  }

  const handleDelete = async (id: string) => {
    await deleteGroup(id)
  }

  const handleOverlay = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setShowCreate(false)
  }

  return (
    <div className="page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-xl" style={{ color: 'var(--text-primary)' }}>Groups</h1>
          <p className="font-mono text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {groups.length} {groups.length === 1 ? 'group' : 'groups'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New Group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-3xl mb-3 opacity-30">👥</span>
          <p className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>
            No groups yet.
          </p>
          <p className="font-mono text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            Create groups to quickly select multiple followers at once.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              members={groupMembers[g.id] ?? []}
              onEdit={() => handleEdit(g)}
              onDelete={() => handleDelete(g.id)}
            />
          ))}
        </div>
      )}

      {/* Create Group Dialog */}
      {showCreate && (
        <div className="modal-overlay" onClick={handleOverlay}>
          <div className="modal-panel w-full max-w-sm">
            <div className="px-6 pt-6 pb-4 border-b border-border">
              <h2 className="font-display text-lg text-text-primary">New Group</h2>
              <p className="text-text-secondary text-xs mt-1">
                Give your group a name. You can add accounts next.
              </p>
            </div>
            <div className="px-6 py-4">
              <input
                className="input"
                placeholder="e.g. All Prop Combines"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate()
                  if (e.key === 'Escape') setShowCreate(false)
                }}
                autoFocus
              />
            </div>
            <div className="px-6 pb-6 pt-2 flex items-center justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating || !createName.trim()}>
                {creating ? 'Creating…' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Editor Dialog */}
      {editingGroup && (
        <GroupEditor
          group={editingGroup}
          memberIds={editingMemberIds}
          onClose={() => {
            setEditingGroup(null)
            loadMembers()
          }}
        />
      )}
    </div>
  )
}
