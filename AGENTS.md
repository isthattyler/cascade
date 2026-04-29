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
| `npm run package` | electron-builder distributable (NSIS/DMG), invokes `electron-builder install-app-deps` |

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
- Nav icons use lucide-react SVG icons (BarChart3, Link2, Users, Settings). Emojis were replaced in Phase 7.
- Toast system via Zustand store (toasts[], addToast, removeToast) + ToastContainer component at bottom-right. IPC events (riskAlert, engineEvent, connStatusChange) wire into toasts.

## Pages
1. **Dashboard** — Leader selector, follower list, start/stop engine, activity log. State persists `selectedLeaderId` in Zustand store across tab switches.
2. **Accounts** — Connection grid, add/delete/connect/disconnect broker logins. Uses lucide-react Plug icon in empty state.
3. **Groups** — Create/edit/delete reusable account collections. Uses lucide-react Users icon in empty state.
4. **Settings** — Default environment (live/demo), default lot multiplier, log pruning days, about section. Uses pre-existing `settings` DB table via `getSetting`/`setSetting`.

## UI Components
- **ErrorBoundary** — Class-based React error boundary wrapping entire app in App.tsx, displays error message + reload button on crash.
- **ToastContainer** — Fixed bottom-right, supports success/error/warning/info types, auto-dismiss with configurable duration (default 4s). Slide-in animation from right.
- **StatusIndicator** — Reusable colored dot. 5 states with CSS `pulse-glow` and `flash-fast` animations.
- **ConnectionCard** — Card per broker login. Colored top bar, status dot, broker/env badges, accounts list with SIM badge, balance, actions.
- **AddConnectionDialog** — Broker selection (Tradovate/TopstepX branded cards), env toggle, credential forms, validation, safeStorage encryption.
- **FollowerRow** — Direction/multiplier/risk badges, order type badges (MO/SL/LI), toggle switch, Config button, delete. Direction display fixed to use `'reverse'` (matching DB CHECK constraint).
- **FollowerConfigPanel** — Direction toggle (Same/Opposite → `'reverse'`), lot multiplier, risk limits, Market/Stop/Limit checkboxes.
- **ActivityLog** — Scrollable timeline. Auto-scrolls to bottom on new entries via `useRef` + `useEffect`.

## Database
- 9 tables: `connections`, `accounts`, `copy_rules`, `groups`, `group_accounts`, `activity_log`, `settings`, `symbol_map`
- `copy_rules` columns: id, leader_account, follower_account, enabled, direction (CHECK: 'same'|'reverse'|'both'), lot_multiplier, max_lot_size, min_lot_size, max_daily_loss, max_open_contracts, copy_stops, copy_limits, copy_market
- `settings` table: key TEXT PRIMARY KEY, value TEXT
- SQLite boolean columns are INTEGER (0/1). Repository handles boolean→int conversion.
- Migrations are versioned. Current version: 2 (added `copy_market`).
- `pruneLogs(days)` repository method available. Settings page provides UI to configure auto-prune days.

## Broker APIs
- **Tradovate**: WS for real-time (`user/syncRequest`), REST for CRUD. Base URL: `https://{env}.tradovateapi.com/v1`
- **TopstepX**: REST polling at 2000ms. Base URL: `https://api.topstepx.com`. Auth: `POST /api/Auth/loginKey`
- Both connectors handle rate limiting with exponential backoff retry.

## Design System
- "Amber Terminal" — warm charcoal background (#0E0E10), amber accent (#F5A623)
- Fonts: DM Serif Display (headings), DM Sans (body), JetBrains Mono (code/monospace)
- Status indicator: 5 states (connected/connecting/disconnected/error/inactive) with color + pulse/flash animations
- CSS variables in `global.css`, utility classes (`.btn`, `.input`, `.modal-overlay`, etc.)
- Toast slide-in animation: `@keyframes slide-in` (translateX(24px) → translateX(0))

## Brand
- Name: **Cascade**
- App ID: `com.cascade.app`
- Favicon: SVG rotated candlestick mark (amber) at `src/renderer/public/favicon.svg`
- App icon: PNG generated from `assets/icon.svg` via `scripts/generate-icon.js`
- electron-builder configured with NSIS (Windows) and DMG (macOS x64+arm64), hardened runtime for macOS, entitlements at `build/entitlements.mac.plist`, native module paths explicitly included in `files` glob
