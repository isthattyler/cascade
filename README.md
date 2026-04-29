# Cascade

Real-time trade copier for Tradovate and TopstepX futures accounts. Local-first Electron desktop app.

## Features

- **Multi-broker**: Connect Tradovate (live + demo) and TopstepX accounts simultaneously
- **Leader/follower**: Designate one account as leader, copy its trades to any number of followers
- **Order type control**: Choose which order types to copy — market, stop, limit — per follower
- **Risk management**: Per-follower limits on lot size, daily loss, and open contracts
- **Groups**: Save reusable account collections for quick follower selection
- **Real-time activity log**: Every copy action tracked with timestamp, symbol, and status
- **Dark theme**: "Amber Terminal" design system — warm charcoal palette with amber accents

## Architecture

```
Renderer (React + Vite + Zustand)
    ↕ IPC (contextBridge)
Main Process
  ├── Connection Manager (Tradovate WS + TopstepX REST)
  ├── Trade Copier Engine (OrderTransformer + RiskManager)
  ├── SQLite (better-sqlite3) with versioned migrations
  └── Credential Vault (Electron safeStorage)
```

## Quick Start

```bash
npm install
npm run dev        # watch mode — main, preload, renderer
```

Open another terminal and run:

```bash
npm run dev:electron    # launches the Electron window
```

## Build

```bash
npm run build       # compiles all three targets
npm run package     # electron-builder (NSIS for Windows, DMG for macOS)
```

Output goes to `release/`.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Concurrent watch for main, preload, renderer |
| `npm run dev:electron` | Launches Electron after all targets are ready |
| `npm run build` | Production build (main + preload + renderer) |
| `npm run package` | electron-builder distributable |
| `npm run generate-icons` | Rasterizes `assets/icon.svg` to PNGs in `build/` |

## Tech Stack

- **Desktop**: Electron 41
- **Frontend**: React 19 + TypeScript + Vite 8 + Tailwind 3
- **State**: Zustand
- **Database**: better-sqlite3 (WAL mode)
- **Encryption**: Electron safeStorage
- **Packaging**: electron-builder
- **Build tooling**: tsup (main/preload), Vite (renderer)

## Project Structure

```
cascade/
├── src/
│   ├── main/                # Electron main process
│   │   ├── index.ts         # Window creation, IPC handlers
│   │   ├── database/        # SQLite schema, migrations, repository
│   │   ├── broker/          # Tradovate + TopstepX connectors
│   │   ├── engine/          # TradeCopierEngine, OrderTransformer, RiskManager
│   │   └── utils/           # Credential vault
│   ├── renderer/            # React frontend
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── pages/       # Dashboard, Accounts, Groups, Settings
│   │   │   ├── components/  # Shared + feature components
│   │   │   ├── store/       # Zustand store
│   │   │   └── styles/      # Amber Terminal design system
│   │   └── preload/         # contextBridge IPC
│   └── shared/              # Shared types
├── assets/                  # Logo source SVGs
├── scripts/                 # Utility scripts
└── build/                   # Generated PNG icons
```

## License

MIT
