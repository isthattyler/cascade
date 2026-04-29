import type Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type {
  Connection, ConnectionInput, Account, CopyRule, CopyRuleInput,
  Group, GroupWithAccounts, ActivityLogEntry,
} from '../../shared/types'

export class DatabaseRepository {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  // ── Connections ──────────────────────────────────────────────────────

  getConnections(): Connection[] {
    return this.db.prepare('SELECT * FROM connections ORDER BY created_at DESC').all() as Connection[]
  }

  createConnection(input: ConnectionInput): Connection {
    const id = randomUUID()
    const now = new Date().toISOString()
    this.db.prepare(
      'INSERT INTO connections (id, label, broker_type, env, credentials, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, input.label, input.broker_type, input.env, input.credentials, now, now)
    return this.db.prepare('SELECT * FROM connections WHERE id = ?').get(id) as Connection
  }

  deleteConnection(id: string): void {
    this.db.prepare('DELETE FROM connections WHERE id = ?').run(id)
  }

  // ── Accounts ─────────────────────────────────────────────────────────

  getAccounts(connectionId?: string): Account[] {
    if (connectionId) {
      return this.db.prepare('SELECT * FROM accounts WHERE connection_id = ? ORDER BY name').all(connectionId) as Account[]
    }
    return this.db.prepare('SELECT * FROM accounts ORDER BY name').all() as Account[]
  }

  upsertAccount(account: Omit<Account, 'id'>): Account {
    const existing = this.db.prepare(
      'SELECT * FROM accounts WHERE connection_id = ? AND external_id = ?'
    ).get(account.connection_id, account.external_id) as Account | undefined

    if (existing) {
      this.db.prepare(
        'UPDATE accounts SET name = ?, is_simulated = ?, balance = ? WHERE id = ?'
      ).run(account.name, account.is_simulated ? 1 : 0, account.balance, existing.id)
      return this.db.prepare('SELECT * FROM accounts WHERE id = ?').get(existing.id) as Account
    }

    const id = randomUUID()
    this.db.prepare(
      'INSERT INTO accounts (id, connection_id, external_id, name, broker_type, is_simulated, balance) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, account.connection_id, account.external_id, account.name, account.broker_type, account.is_simulated ? 1 : 0, account.balance)
    return this.db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as Account
  }

  deleteAccountsByConnection(connectionId: string): void {
    this.db.prepare('DELETE FROM accounts WHERE connection_id = ?').run(connectionId)
  }

  // ── Copy Rules ───────────────────────────────────────────────────────

  getCopyRules(leaderId?: string): CopyRule[] {
    if (leaderId) {
      return this.db.prepare('SELECT * FROM copy_rules WHERE leader_account = ? ORDER BY enabled DESC').all(leaderId) as CopyRule[]
    }
    return this.db.prepare('SELECT * FROM copy_rules ORDER BY enabled DESC').all() as CopyRule[]
  }

  createCopyRule(input: CopyRuleInput): CopyRule {
    const id = randomUUID()
    this.db.prepare(
      `INSERT INTO copy_rules (id, leader_account, follower_account, direction, lot_multiplier, max_lot_size, min_lot_size, max_daily_loss, max_open_contracts, copy_stops, copy_limits, copy_market)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, input.leader_account, input.follower_account,
      input.direction ?? 'same', input.lot_multiplier ?? 1.0,
      input.max_lot_size ?? null, input.min_lot_size ?? null,
      input.max_daily_loss ?? null, input.max_open_contracts ?? null,
      input.copy_stops != null ? (input.copy_stops ? 1 : 0) : 1,
      input.copy_limits != null ? (input.copy_limits ? 1 : 0) : 1,
      input.copy_market != null ? (input.copy_market ? 1 : 0) : 1
    )
    return this.db.prepare('SELECT * FROM copy_rules WHERE id = ?').get(id) as CopyRule
  }

  updateCopyRule(id: string, data: Partial<CopyRule>): void {
    const fields: string[] = []
    const values: any[] = []

    for (const [key, value] of Object.entries(data)) {
      if (key === 'id') continue
      fields.push(`${key} = ?`)
      values.push(typeof value === 'boolean' ? (value ? 1 : 0) : value)
    }

    if (fields.length > 0) {
      values.push(id)
      this.db.prepare(`UPDATE copy_rules SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    }
  }

  deleteCopyRule(id: string): void {
    this.db.prepare('DELETE FROM copy_rules WHERE id = ?').run(id)
  }

  toggleCopyRule(id: string, enabled: boolean): void {
    this.db.prepare('UPDATE copy_rules SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id)
  }

  // ── Groups ───────────────────────────────────────────────────────────

  getGroups(): Group[] {
    return this.db.prepare('SELECT * FROM groups ORDER BY name').all() as Group[]
  }

  createGroup(name: string): Group {
    const id = randomUUID()
    const now = new Date().toISOString()
    this.db.prepare('INSERT INTO groups (id, name, created_at) VALUES (?, ?, ?)').run(id, name, now)
    return this.db.prepare('SELECT * FROM groups WHERE id = ?').get(id) as Group
  }

  deleteGroup(id: string): void {
    this.db.prepare('DELETE FROM groups WHERE id = ?').run(id)
  }

  getGroupAccounts(groupId: string): Account[] {
    return this.db.prepare(
      'SELECT a.* FROM accounts a INNER JOIN group_accounts ga ON a.id = ga.account_id WHERE ga.group_id = ? ORDER BY a.name'
    ).all(groupId) as Account[]
  }

  setGroupAccounts(groupId: string, accountIds: string[]): void {
    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM group_accounts WHERE group_id = ?').run(groupId)
      const insert = this.db.prepare('INSERT INTO group_accounts (group_id, account_id) VALUES (?, ?)')
      for (const accountId of accountIds) {
        insert.run(groupId, accountId)
      }
    })
    tx()
  }

  // ── Activity Log ─────────────────────────────────────────────────────

  addLogEntry(entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>): ActivityLogEntry {
    const id = randomUUID()
    const now = new Date().toISOString()
    this.db.prepare(
      `INSERT INTO activity_log (id, timestamp, event_type, leader_id, follower_id, order_id, symbol, side, quantity, price, status, error_msg, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, now, entry.event_type, entry.leader_id, entry.follower_id,
      entry.order_id, entry.symbol, entry.side, entry.quantity, entry.price,
      entry.status, entry.error_msg, entry.details
    )
    return this.db.prepare('SELECT * FROM activity_log WHERE id = ?').get(id) as ActivityLogEntry
  }

  getRecentLogs(limit = 100): ActivityLogEntry[] {
    return this.db.prepare('SELECT * FROM activity_log ORDER BY timestamp DESC LIMIT ?').all(limit) as ActivityLogEntry[]
  }

  pruneLogs(days: number): void {
    this.db.prepare("DELETE FROM activity_log WHERE datetime(timestamp) < datetime('now', '-' || ? || ' days')").run(days)
  }

  // ── Settings ─────────────────────────────────────────────────────────

  getSetting(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
    return row?.value ?? null
  }

  setSetting(key: string, value: string): void {
    this.db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    ).run(key, value)
  }
}
