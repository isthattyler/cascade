import { getDb } from './schema'

const MIGRATIONS_TABLE = '_migrations'

const migrations: { version: number; up: string }[] = [
  {
    version: 1,
    up: `
      CREATE TABLE IF NOT EXISTS connections (
        id          TEXT PRIMARY KEY,
        label       TEXT NOT NULL,
        broker_type TEXT NOT NULL CHECK(broker_type IN ('tradovate', 'projectx')),
        env         TEXT NOT NULL DEFAULT 'demo' CHECK(env IN ('live', 'demo')),
        credentials TEXT NOT NULL,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id            TEXT PRIMARY KEY,
        connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
        external_id   TEXT NOT NULL,
        name          TEXT NOT NULL,
        broker_type   TEXT NOT NULL,
        is_simulated  INTEGER NOT NULL DEFAULT 1,
        balance       REAL,
        UNIQUE(connection_id, external_id)
      );

      CREATE TABLE IF NOT EXISTS copy_rules (
        id                 TEXT PRIMARY KEY,
        leader_account     TEXT NOT NULL REFERENCES accounts(id),
        follower_account   TEXT NOT NULL REFERENCES accounts(id),
        enabled            INTEGER NOT NULL DEFAULT 1,
        direction          TEXT NOT NULL DEFAULT 'same' CHECK(direction IN ('same', 'reverse', 'both')),
        lot_multiplier     REAL NOT NULL DEFAULT 1.0,
        max_lot_size       REAL,
        min_lot_size       REAL,
        max_daily_loss     REAL,
        max_open_contracts INTEGER,
        copy_stops         INTEGER NOT NULL DEFAULT 1,
        copy_limits        INTEGER NOT NULL DEFAULT 1,
        UNIQUE(leader_account, follower_account)
      );

      CREATE TABLE IF NOT EXISTS groups (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS group_accounts (
        group_id   TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        PRIMARY KEY (group_id, account_id)
      );

      CREATE TABLE IF NOT EXISTS activity_log (
        id          TEXT PRIMARY KEY,
        timestamp   TEXT NOT NULL DEFAULT (datetime('now')),
        event_type  TEXT NOT NULL,
        leader_id   TEXT REFERENCES accounts(id),
        follower_id TEXT REFERENCES accounts(id),
        order_id    TEXT,
        symbol      TEXT,
        side        TEXT,
        quantity    REAL,
        price       REAL,
        status      TEXT NOT NULL DEFAULT 'pending',
        error_msg   TEXT,
        details     TEXT
      );

      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS symbol_map (
        id          TEXT PRIMARY KEY,
        from_broker TEXT NOT NULL,
        from_symbol TEXT NOT NULL,
        to_broker   TEXT NOT NULL,
        to_symbol   TEXT NOT NULL,
        UNIQUE(from_broker, from_symbol, to_broker)
      );
    `,
  },
  {
    version: 2,
    up: `ALTER TABLE copy_rules ADD COLUMN copy_market INTEGER NOT NULL DEFAULT 1;`,
  },
]

export function migrate(): void {
  const db = getDb()

  db.exec(`CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)`)

  const applied = db.prepare(`SELECT version FROM ${MIGRATIONS_TABLE}`).all() as { version: number }[]
  const appliedVersions = new Set(applied.map((r) => r.version))

  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      db.exec(migration.up)
      db.prepare(`INSERT INTO ${MIGRATIONS_TABLE} (version, applied_at) VALUES (?, datetime('now'))`).run(migration.version)
    }
  }
}
