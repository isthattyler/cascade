import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import { DatabaseRepository } from './repository'

let db: Database.Database | null = null
let repo: DatabaseRepository | null = null

export function getDbPath(): string {
  return path.join(app.getPath('userData'), 'trade-copier.db')
}

export function initDatabase(): Database.Database {
  if (db) return db

  db = new Database(getDbPath())
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('synchronous = NORMAL')

  return db
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.')
  return db
}

export function getRepository(): DatabaseRepository {
  if (!repo) {
    repo = new DatabaseRepository(getDb())
  }
  return repo
}
