# Cascade — Architecture

## Overview

Cascade is a local-first Electron desktop application that connects to Tradovate and TopstepX brokerage accounts, enabling real-time trade copying from a designated leader account to multiple follower accounts with minimal latency.

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Electron Shell                           │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Renderer Process (React + Vite)            │  │
│  │                                                         │  │
  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │  │
  │  │  │ Dashboard │  │ Accounts │  │  Groups  │  │ Settings │   │  │
  │  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │  │
│  │                                                         │  │
│  │  State: Zustand  │  UI: React  │  Styling: Tailwind    │  │
│  └───────────────────────┬─────────────────────────────────┘  │
│                          │ IPC (contextBridge)                 │
│  ┌───────────────────────▼─────────────────────────────────┐  │
│  │                 Main Process                            │  │
│  │                                                         │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │           Connection Manager                     │   │  │
│  │  │  ┌────────────────┐  ┌──────────────────────┐   │   │  │
│  │  │  │ TradovateConn  │  │ ProjectXConnector    │   │   │  │
│  │  │  │  (WS + REST)   │  │  (REST + WS)         │   │   │  │
│  │  │  └────────────────┘  └──────────────────────┘   │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  │                                                         │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │           Trade Copier Engine                    │   │  │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────┐  │   │  │
│  │  │  │OrderWatcher │  │OrderXformer │  │RiskMgr  │  │   │  │
│  │  │  └─────────────┘  └─────────────┘  └─────────┘  │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  │                                                         │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │           SQLite (better-sqlite3)                │   │  │
│  │  │  connections │ accounts │ copy_rules │ groups    │   │  │
│  │  │  activity_log │ settings                         │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  │                                                         │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │           Credential Vault                        │   │  │
│  │  │           (Electron safeStorage + AES-GCM)       │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Process Model

### Main Process
- **Single Node.js process** running in Electron's main thread
- Owns all broker connections (WebSocket + HTTP pools)
- Runs the Trade Copier Engine event loop
- Manages the SQLite database
- Handles credential encryption/decryption via `safeStorage`
- Exposes IPC handlers to the renderer

### Renderer Process
- **React application** bootstrapped by Vite
- Communicates with main process exclusively through `contextBridge` IPC
- No direct network access (all broker traffic goes through main process)
- Zustand store for client-side state, synced with main process data

### Why not a separate worker process for connections?
Keeping all broker connections in the main process eliminates IPC overhead for the hot path (order events → copy execution). Each WebSocket message from a leader account needs to trigger orders to followers — routing through IPC would add 1-3ms per message. For minimal latency, the entire copy pipeline runs in-process.

---

## Data Flow — Trade Copy

```
Leader Account (Tradovate/ProjectX)
       │
       │  WebSocket: user/syncRequest (Tradovate)
       │  or         /api/Position/searchOpen poll (ProjectX)
       ▼
┌──────────────────┐
│  OrderWatcher    │  Receives: fill events, position changes, order updates
│  (per account)   │  Filters: only care about new fills and position entries
└────────┬─────────┘
         │ onOrderFill(orderEvent)
         ▼
┌──────────────────┐
│  TradeCopier     │  1. Load active copy_rules where leader = this account
│  Engine          │  2. For each enabled follower:
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼ (parallel per follower)
┌─────────┐  ┌─────────┐
│Order    │  │Risk     │
│Xformer  │  │Manager  │
└────┬────┘  └────┬────┘
     │            │
     │  Apply:    │  Check:
     │  - lot_mult│  - max_daily_loss
     │  - dir     │  - max_lot_size
     │  - sym map │  - open pos limits
     │  - price   │
     ▼            ▼
┌──────────────────┐
│  Submit Order    │  placeOrder() via follower's API
│  (per follower)  │
└────────┬─────────┘
         │ result
         ▼
┌──────────────────┐
│  Activity Log    │  Write: timestamp, type, leader, follower, details, success/error
└──────────────────┘
         │
         ▼
┌──────────────────┐
│  IPC to Renderer │  Push: engine:event to update UI in real-time
└──────────────────┘
```

---

## Module Architecture

### `src/main/broker/BaseConnector.ts`
Abstract interface that all broker connectors implement:

```typescript
interface BrokerConnector {
  connect(): Promise<void>
  disconnect(): void
  isConnected(): boolean
  getAccounts(): Promise<Account[]>
  getPositions(accountId: string): Promise<Position[]>
  placeOrder(order: OrderRequest): Promise<OrderResult>
  cancelOrder(accountId: string, orderId: string): Promise<void>
  subscribeOrders(accountId: string, cb: (e: OrderEvent) => void): UnsubscribeFn
  subscribePositions(accountId: string, cb: (e: PositionEvent) => void): UnsubscribeFn
  onError(cb: (err: Error) => void): void
}
```

### `src/main/broker/ConnectionManager.ts`
Singleton that manages all active broker connections:
- Pool of connectors keyed by `connection_id`
- Credential decryption on connect
- Health checks every 30s (ping/pong on WS, lightweight auth verify on REST)
- Auto-reconnect with exponential backoff: 1s → 2s → 4s → 8s → max 60s
- Graceful shutdown on app quit (close all WS, cancel pending orders if configured)

### `src/main/engine/TradeCopierEngine.ts`
Central event loop:
- Subscribes to all designated leader accounts via their connectors
- Receives `OrderEvent` and `PositionEvent` callbacks
- Queries `copy_rules` table for matching follower configs
- Executes per-follower transforms and risk checks in parallel
- Batches order submissions and collects results
- Pushes real-time status to renderer via IPC `engine:event`

### `src/main/engine/OrderTransformer.ts`
Stateless order mapping:
- **Lot multiplier**: `follower_qty = round(leader_qty * rule.lot_multiplier, min=rule.min_lot_size, max=rule.max_lot_size)`
- **Direction**: `same` (buy→buy), `reverse` (buy→sell), `both` (mirror with configurable offset)
- **Symbol mapping**: identical tickers assumed by default (ES, NQ, CL, etc.); extensible via symbol_map table
- **Order type passthrough**: preserves leader's order type (market, limit, stop, stop_limit) on fill events; position events always emit market
- **Type guards**: `copy_market`, `copy_stops`, `copy_limits` booleans control which order types are copied

### `src/main/engine/RiskManager.ts`
Per-follower risk checks before order submission:
- **Max daily loss**: cumulative realized loss since market open
- **Max lot size per order**: caps the follower's exposure
- **Max open contracts**: total position limit per symbol
- **Daily trade count limit**: optional throttle

---

## Database Schema

```sql
CREATE TABLE connections (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  broker_type TEXT NOT NULL CHECK(broker_type IN ('tradovate', 'projectx')),
  env         TEXT NOT NULL DEFAULT 'demo' CHECK(env IN ('live', 'demo')),
  credentials TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE accounts (
  id            TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  external_id   TEXT NOT NULL,
  name          TEXT NOT NULL,
  broker_type   TEXT NOT NULL,
  is_simulated  INTEGER NOT NULL DEFAULT 1,
  balance       REAL,
  UNIQUE(connection_id, external_id)
);

CREATE TABLE copy_rules (
  id               TEXT PRIMARY KEY,
  leader_account   TEXT NOT NULL REFERENCES accounts(id),
  follower_account TEXT NOT NULL REFERENCES accounts(id),
  enabled          INTEGER NOT NULL DEFAULT 1,
  direction        TEXT NOT NULL DEFAULT 'same' CHECK(direction IN ('same','reverse','both')),
  lot_multiplier   REAL NOT NULL DEFAULT 1.0,
  max_lot_size     REAL,
  min_lot_size     REAL,
  max_daily_loss   REAL,
  max_open_contracts INTEGER,
  copy_stops       INTEGER NOT NULL DEFAULT 1,
  copy_limits      INTEGER NOT NULL DEFAULT 1,
  copy_market      INTEGER NOT NULL DEFAULT 1,
  UNIQUE(leader_account, follower_account)
);

CREATE TABLE groups (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE group_accounts (
  group_id   TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, account_id)
);

CREATE TABLE activity_log (
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

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE symbol_map (
  id           TEXT PRIMARY KEY,
  from_broker  TEXT NOT NULL,
  from_symbol  TEXT NOT NULL,
  to_broker    TEXT NOT NULL,
  to_symbol    TEXT NOT NULL,
  UNIQUE(from_broker, from_symbol, to_broker)
);
```

---

## Broker API Integration

### Tradovate

| Aspect | Detail |
|---|---|
| **Base URL (live)** | `https://live.tradovateapi.com/v1` |
| **Base URL (demo)** | `https://demo.tradovateapi.com/v1` |
| **Auth** | `POST /auth/userloginwithtradingpermission` → returns `accessToken` |
| **Real-time** | WebSocket `wss://{env}.tradovateapi.com/v1/websocket` with `user/syncRequest` subscription |
| **REST endpoints** | `/account/list`, `/position/list`, `/order/place`, `/order/list`, `/order/cancel` |
| **Place order** | `POST /order/place` with `{ accountId, symbol, orderQty, orderType, price, stopPrice }` |
| **Entity system** | Standardized CRUD: `/entityType/list`, `/entityType/item`, `/entityType/find` |
| **Rate limits** | Variable per endpoint; implement retry with backoff |

### TopstepX

| Aspect | Detail |
|---|---|
| **Base URL** | `https://api.topstepx.com` |
| **Auth** | `POST /api/Auth/loginKey` with `userName` + `apiKey` → returns JWT `token` |
| **Real-time** | REST polling at 2000ms interval for `/api/Position/searchOpen` |
| **REST endpoints** | `/api/Account/search`, `/api/Position/searchOpen`, `/api/Order/place`, `/api/Order/cancel`, `/api/Trade/search`, `/api/Contract/search` |
| **Place order** | `POST /api/Order/place` with `{ accountId, contractId, type, side, size, limitPrice?, stopPrice? }` |
| **Demo detection** | `account.simulated` field; set `isLive = !account.simulated` after login |

---

## Latency Strategy

| Technique | Detail |
|---|---|
| **WebSocket primary** | Tradovate real-time push via user sync subscription — sub-100ms delivery |
| **REST polling fallback** | ProjectX poll at 500ms interval; configurable per connection |
| **In-process pipeline** | No IPC between order receipt and order submission — same event loop tick |
| **Parallel follower execution** | Promise.allSettled across all followers for a single leader order |
| **Connection pooling** | HTTP keep-alive with axios; reuse TCP connections |
| **Minimal transformations** | OrderTransformer is synchronous — no async overhead in hot path |
| **Configurable delay** | Default 0ms; user can add 100-500ms intentional delay if desired |

---

## Security

- **Credentials at rest**: Encrypted via Electron `safeStorage` (OS-level encryption; Keychain on macOS, DPAPI on Windows, libsecret on Linux)
- **Credentials in memory**: Decrypted only when needed by ConnectionManager, held in plain JS objects (same as any trading app)
- **No external network except broker APIs**: App connects only to Tradovate and ProjectX API endpoints
- **Database file**: Stored in Electron's `app.getPath('userData')` — OS-protected user directory
- **No telemetry**: Zero external analytics, no phone-home

---

## Project Structure

```
cascade/
├── package.json
├── tsconfig.json
├── electron-builder.yml
├── vite.config.ts
├── tailwind.config.ts
├── src/
│   ├── main/
│   │   ├── index.ts
│   │   ├── database/
│   │   │   ├── schema.ts
│   │   │   ├── migrations.ts
│   │   │   └── repository.ts
│   │   ├── broker/
│   │   │   ├── types.ts
│   │   │   ├── BaseConnector.ts
│   │   │   ├── TradovateConnector.ts
│   │   │   ├── ProjectXConnector.ts
│   │   │   └── ConnectionManager.ts
│   │   ├── engine/
│   │   │   ├── TradeCopierEngine.ts
│   │   │   ├── OrderTransformer.ts
│   │   │   └── RiskManager.ts
│   │   ├── ipc/
│   │   │   └── handlers.ts
│   │   └── utils/
│   │       ├── logger.ts
│   │       └── config.ts
│   ├── renderer/
│   │   ├── index.html
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── accounts/
│   │   │   │   ├── copier/
│   │   │   │   └── groups/
│   │   │   ├── hooks/
│   │   │   ├── store/
│   │   │   └── styles/
│   │   └── preload/
│   │       └── preload.ts
│   └── shared/
│       └── types.ts
```
