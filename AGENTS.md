# Cascade — Agent Context

## Project Overview
Local-first Electron desktop trade copier for Tradovate and TopstepX futures accounts. A leader account's trades are copied in real-time to multiple follower accounts with configurable risk limits, direction, and order type filtering.

## Stack
- Electron 41 + TypeScript + React 19 + Vite 8
- Tailwind 3 (custom "Amber Terminal" design system)
- Zustand (renderer state)
- better-sqlite3 (WAL mode, versioned migrations)
- Electron safeStorage (credential encryption)
- tsup (main/preload bundling), Vite (renderer)

## Build Commands
| Command | Description |
|---|---|
| `npm run build` | Production build: main + preload + renderer |
| `npm run dev` | Concurrent watch for all three targets |
| `npm run dev:electron` | Launch Electron after targets are ready |
| `npm run package` | electron-builder distributable (NSIS/DMG) |

## Architecture
- **Main process**: DB (SQLite), broker connectors (WS + REST), TradeCopierEngine, credential vault
- **Renderer**: React 19, Zustand store, Tailwind dark theme
- **IPC**: contextBridge with typed channels (`db:*`, `broker:*`, `engine:*`, `conn:*`, `credentials:*`)
- **Engine**: subscribes to leader connector's `onPositionEvent` + `onOrderEvent`, loads copy rules, runs RiskManager + OrderTransformer per follower, parallel `Promise.allSettled`, writes activity_log + pushes to renderer

## Key Conventions
- Types in `src/shared/types.ts` — shared between main and renderer
- Preload bridge in `src/renderer/preload/preload.ts`
- DB repository (DAO pattern) in `src/main/database/repository.ts`
- All migrations in `src/main/database/migrations.ts`
- Broker connectors extend `BaseConnector` in `src/main/broker/`
- Engine files in `src/main/engine/` (TradeCopierEngine, OrderTransformer, RiskManager)
- Pages in `src/renderer/src/pages/`, components in feature-named dirs under `src/renderer/src/components/`
- CSS variables in `src/renderer/src/styles/global.css`

## Pages
1. **Dashboard** — Leader selector, follower list, start/stop engine, activity log. State persists `selectedLeaderId` in Zustand store across tab switches.
2. **Accounts** — Connection grid, add/delete/connect/disconnect broker logins.
3. **Groups** — Create/edit/delete reusable account collections.
4. **Settings** — App configuration.

## Database
- 8 tables: `connections`, `accounts`, `copy_rules`, `groups`, `group_accounts`, `activity_log`, `settings`, `symbol_map`
- `copy_rules` columns: id, leader_account, follower_account, enabled, direction, lot_multiplier, max_lot_size, min_lot_size, max_daily_loss, max_open_contracts, copy_stops, copy_limits, copy_market
- SQLite boolean columns are INTEGER (0/1). Repository handles boolean→int conversion.
- Migrations are versioned. Current version: 2 (added `copy_market`).

## Broker APIs
- **Tradovate**: WS for real-time (`user/syncRequest`), REST for CRUD. Base URL: `https://{env}.tradovateapi.com/v1`
- **TopstepX**: REST polling at 2000ms. Base URL: `https://api.topstepx.com`. Auth: `POST /api/Auth/loginKey`
- Both connectors handle rate limiting with exponential backoff retry.

## Design System
- "Amber Terminal" — warm charcoal background (#0E0E10), amber accent (#F5A623)
- Fonts: DM Serif Display (headings), DM Sans (body), JetBrains Mono (code/monospace)
- Status indicator: 5 states (connected/connecting/disconnected/error/inactive) with color + pulse/flash animations
- CSS variables in `global.css`, utility classes (`.btn`, `.input`, `.modal-overlay`, etc.)

## Brand
- Name: **Cascade**
- App ID: `com.cascade.app`
- Favicon: SVG rotated candlestick mark (amber)
- App icon: PNG generated from `assets/icon.svg` via `scripts/generate-icon.js`
