# Trade Copier — Design Document

## Overview

A desktop application for copying trades in real-time between Tradovate and TopstepX/ProjectX futures trading accounts. Designed for prop firm traders who manage multiple evaluation combines and funded accounts.

---

## Core User Stories

1. **As a prop trader**, I want to connect multiple Tradovate and TopstepX logins so I can see all my accounts in one place.
2. **As a prop trader**, I want to designate one account as the "leader" and have my other accounts automatically mirror its trades.
3. **As a prop trader**, I want to toggle individual followers on/off without removing them from the configuration.
4. **As a prop trader**, I want to create groups of accounts (e.g., "All Topstep Combines") so I can quickly select multiple followers at once.
5. **As a prop trader**, I want per-follower risk limits (max lot size, max daily loss) so I don't blow up an evaluation combine.
6. **As a prop trader**, I want to see real-time activity logs showing what was copied, to which account, and whether it succeeded.

---

## User Interface Design

### Main Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ [logo] Trade Copier                                 (3/4 ●) [─][□][×]│
├──────────┬───────────────────────────────────────────────────────┤
│          │                                                       │
│  📊 ●    │  ┌─────────────────────────────────────────────────┐  │
│  Dashboard│  │  LEADER                                         │  │
│          │  │  ┌─────────────────────────────────────────────┐ │  │
│  🔗 ●    │  │  │  ● My Tradovate Demo  ▼                    │ │  │
│  Accounts│  │  │  └─ ● ES Demo Acct #2  $52,430   Long 2 ES │ │  │
│          │  │  └─────────────────────────────────────────────┘ │  │
│  📋 ●    │  │  [▶ Start Copying]                              │  │
│  Copy    │  └─────────────────────────────────────────────────┘  │
│          │                                                       │
│  👥      │  ┌─────────────────────────────────────────────────┐  │
│  Groups  │  │  FOLLOWERS                                       │  │
│          │  │                                                 │  │
│  ⚙       │  │  ● ES Demo Acct #1       ×1.0     [●─ ─ ─ ○]  │  │
│  Settings│  │  ● Topstep Combine #1     ×0.5     [○─ ─ ─ ○]  │  │
│          │  │  ✕ Topstep Combine #2     ×0.5     [●─ ─ ─ ○]  │  │
│          │  │  ● Topstep Combine #3     ×0.5     [●─ ─ ─ ○]  │  │
│          │  │  ◐ Group: All Prop  (2/3) ×0.75    [●─ ─ ─ ○]  │  │
│          │  │                                                 │  │
│          │  │  [+ Add Follower]  [Quick Add Group]            │  │
│          │  └─────────────────────────────────────────────────┘  │
│          │                                                       │
│          │  ┌─────────────────────────────────────────────────┐  │
│          │  │  ACTIVITY LOG                    [Clear] [Auto] │  │
│          │  │  14:32:05  Buy 2 ES → Topstep C1  ✓ $12,450    │  │
│          │  │  14:32:05  Buy 2 ES → Topstep C2  ✓ $12,450    │  │
│          │  │  14:28:10  Sell 1 NQ → ES Demo #1 ✓ $3,200     │  │
│          │  │  14:28:09  Sell 1 NQ → Group All  ✓ $3,200     │  │
│          │  │  14:22:00  ❌ Topstep C3 → Max daily loss hit  │  │
│          │  └─────────────────────────────────────────────────┘  │
│          │                                                       │
└──────────┴───────────────────────────────────────────────────────┘

Status dot legend:
  ● Connected  (green, gentle pulse)
  ◐ Connecting  (amber, fast flash)
  ✕ Disconnected / Error  (red, solid)
  ○ Inactive / Off  (gray, hollow)
```

### Screen Flow

```
┌─────────────┐    ┌────────────────┐    ┌──────────────────┐
│  Dashboard   │───▶│  Accounts      │───▶│  Add Connection  │
│  (main view) │    │  (manage all)  │    │  (broker login)  │
└──────┬──────┘    └────────────────┘    └──────────────────┘
       │
       │          ┌────────────────┐    ┌──────────────────┐
       ├─────────▶│  Copy Settings │───▶│  Follower Config │
       │          │  (leader+foll) │    │  (risk,multiplr) │
       │          └────────────────┘    └──────────────────┘
       │
       │          ┌────────────────┐
       └─────────▶│  Groups        │
                  │  (create/manage)│
                  └────────────────┘
```

---

## Component Tree (React)

```
App
├── Sidebar
│   ├── NavItem (Dashboard)  ● connection status summary
│   ├── NavItem (Accounts)   ● connection status summary
│   ├── NavItem (Copy)       ● engine status
│   ├── NavItem (Groups)
│   └── NavItem (Settings)
│   └── ConnectionStatusBar (aggregate: "3/4 ● Connected")
│
├── MainContent (route-based switching)
│   │
│   ├── DashboardPage
│   │   ├── LeaderSelector
│   │   │   ├── AccountDropdown (searchable, grouped by connection)
│   │   │   │   └── StatusIndicator per account in dropdown
│   │   │   └── LeaderStatus (balance, position summary, status dot)
│   │   ├── StartStopButton
│   │   ├── FollowerList
│   │   │   ├── FollowerRow (per account or group)
│   │   │   │   ├── StatusIndicator (account connection state)
│   │   │   │   ├── AccountLabel
│   │   │   │   ├── LotMultiplierInput
│   │   │   │   ├── ToggleSwitch
│   │   │   │   └── SettingsButton → opens FollowerConfigPanel
│   │   │   └── AddFollowerButton
│   │   │       ├── AccountPicker (shows StatusIndicator per entry)
│   │   │       └── GroupPicker
│   │   └── ActivityLog
│   │       ├── LogEntry (timestamp, action, symbol, accounts, status)
│   │       └── LogControls (filter, clear, auto-scroll)
│   │
│   ├── AccountsPage
│   │   ├── ConnectionCard (per broker login)
│   │   │   ├── StatusIndicator (connection-level: large dot)
│   │   │   ├── ConnectionHeader (label, broker, env)
│   │   │   ├── AccountList (accounts discovered under this login)
│   │   │   │   └── AccountRow (StatusIndicator, name, balance, simulated badge)
│   │   │   └── ConnectionActions (connect, disconnect, delete, refresh)
│   │   └── AddConnectionDialog
│   │       ├── BrokerTypeSelect (Tradovate | TopstepX)
│   │       ├── EnvToggle (Live | Demo)
│   │       ├── LabelInput
│   │       ├── CredentialForm (email+password or username+apiKey)
│   │       └── TestConnectButton (shows StatusIndicator during test)
│   │
│   ├── GroupsPage
│   │   ├── GroupList
│   │   │   └── GroupCard
│   │   │       ├── GroupHeader (name, account count)
│   │   │       ├── GroupMemberList (account chips with StatusIndicator)
│   │   │       └── GroupActions (edit, delete)
│   │   ├── CreateGroupButton → GroupEditor
│   │   └── GroupEditor dialog
│   │       ├── GroupNameInput
│   │       ├── AccountSelector (multi-select with search, StatusIndicator per account)
│   │       └── SaveButton
│   │
│   └── SettingsPage
│       ├── GeneralSection (default env, latency delay, theme)
│       ├── RiskSection (global defaults for followers)
│       └── DataSection (clear logs, export config, import config)
│
└── ToastNotifications (global, for errors and confirmations)
```

---

## Component Specifications

### StatusIndicator (shared component)
Reusable indicator dot used across all components. Renders as a small circle with color + animation representing connection state.

| State | Color | CSS Class | Animation |
|---|---|---|---|
| `connected` | `#22c55e` (green) | `status-connected` | Gentle CSS pulse: `box-shadow` expands/contracts over 2s, opacity 0.7→1 |
| `connecting` | `#f59e0b` (amber) | `status-connecting` | Fast flash: opacity 0.3→1 over 500ms |
| `disconnected` | `#ef4444` (red / error) | `status-disconnected` | Solid, no animation |
| `inactive` | `#6b7280` (gray, hollow) | `status-inactive` | No fill, `border: 2px solid #6b7280`, no animation |
| `unknown` | `#9ca3af` (gray, filled) | `status-unknown` | Solid gray, no animation (initial state before first heartbeat) |

**Sizes**: `sm` (8px — used inline in dropdowns, account chips), `md` (12px — used in FollowerRow, sidebar), `lg` (16px — used in ConnectionCard header)

**Tooltip**: Hovering shows the human-readable state + last health check timestamp (e.g. "Connected · last ping 12s ago")

### LeaderSelector
- Searchable dropdown populated from `accounts` table
- Grouped by `connection.label` for visual organization
- Each connection group header has a **StatusIndicator** showing the broker connection state
- Each account option has a **StatusIndicator** (`sm` size) showing account-level connection
- Shows account name, broker type badge, and simulated indicator
- Displays live balance + open position summary when selected (with large status dot in summary)
- Only one leader can be active at a time
- Selecting a different leader while engine is running prompts confirmation
- If the selected leader's status drops to `disconnected`, the leader area shows a red pulsing border and a "Reconnecting..." badge

### FollowerRow
- Each row represents either a single account or a group
- **StatusIndicator** (`md` size) at the start of the row showing the account's current connection state — this is the primary visual cue for connectivity
- **Group rows**: StatusIndicator shows aggregate state (e.g. `◐` amber if any member is connecting, `●` green only if ALL members are connected)
- **Toggle switch**: controls `copy_rules.enabled` — green = active, gray = inactive. When toggled off, the StatusIndicator switches to the `inactive` state
- **Lot multiplier**: inline editable number input (± buttons)
- **Direction indicator**: visual badge showing same/reverse
- **Risk status**: shows warning icon if daily loss limit is approaching
- **Settings button**: opens inline panel for advanced config:
  - Direction (same/reverse/both)
  - Max lot size, min lot size
  - Max daily loss
  - Max open contracts
  - Copy stop/limit orders (checkboxes)

### AddFollowerButton
- Opens a dialog with two tabs: "Accounts" and "Groups"
- **Accounts tab**: multi-select checkboxes from available accounts (excluding the current leader)
- **Groups tab**: list of existing groups with info on how many accounts they contain
- On confirm, creates `copy_rules` entries for each selected account
- Groups auto-expand to their constituent accounts for individual risk settings

### ConnectionCard
- Visual card per broker login entry
- **Large StatusIndicator** (`lg` size) in the top-left of the card — most prominent indicator in the app
- **Status text label** next to the indicator: "Connected" / "Connecting..." / "Disconnected" / "Error: [msg]"
- **Status color bar**: thin colored bar across the top edge of the entire card (green/amber/red) for glanceable status even when scrolling
- **Refresh button**: re-fetches accounts list from broker (disabled during `connecting` state)
- **Delete button**: removes connection + cascades to accounts + copy_rules
- Connection can be disconnected without deleting (keeps config for later)
- **Reconnecting state**: when auto-reconnect is active, shows "Reconnecting in Xs..." countdown badge
- **Error state**: card background gets a subtle red tint; error message shown inline with a dismiss button

### ActivityLog
- Virtualized scrollable list (react-window) for performance with large logs
- Color-coded entries: green (success), red (error), yellow (skipped)
- Each entry shows: timestamp, event type (buy/sell/cancel/error), symbol, quantity, follower account, status, and P&L if available
- Auto-scroll enabled by default, toggleable
- Filter bar: filter by account, event type, or date range
- Clear button with confirmation

### Sidebar Connection Summary
- **Aggregate StatusIndicator** (`sm` size) shown next to each nav item based on the accounts relevant to that view
  - Dashboard: status of the leader account + all active followers
  - Accounts: worst status across all connections
  - Copy: status of the engine (running/stopped/errored)
- **ConnectionStatusBar** pinned at sidebar bottom — shows aggregate count: `"3/4 ● Connected"`
  - Tooltip on hover expands to per-connection breakdown:
    ```
    ● My Tradovate Demo      Connected
    ● Topstep Live           Connected
    ✕ Topstep Combine #2    Disconnected
    ● Topstep Combine #3    Connected
    ```
  - Clicking the bar navigates to Accounts page for details
- When all connections are healthy, the bar is subtle (green text on transparent bg)
- When any connection is down, the bar gets a red background highlight

### Account-Level Status Propagation
When an account's connection status changes, it cascades through the UI automatically:

```
conn:status-change (connectionId, "disconnected")
  ↓
  ConnectionManager emits IPC event to renderer
  ↓
  Zustand store updates connectionStates map
  ↓
  ┌─ ConnectionCard      → StatusIndicator → red, card top bar → red
  ├─ All AccountRows     → StatusIndicator → disconnected for each child
  ├─ FollowerRow         → StatusIndicator → disconnected (if used as follower)
  ├─ LeaderSelector      → StatusIndicator → red + pulsing red border + "Reconnecting..." badge
  ├─ Sidebar aggregate   → recalculates health → shows amber/warning
  └─ ToastNotification  → "Connection lost: My Tradovate Demo (auto-reconnecting...)"
```

---

## Groups Feature Design

### Purpose
Groups allow users to define reusable collections of accounts that can be quickly added as followers. This is essential for prop traders who need to copy trades to a standard set of combines every session.

### Data Model
```sql
groups (id, name, created_at)
group_accounts (group_id, account_id) -- M:N relationship
```

### Behavior
1. **Creating a group**: User names the group, selects accounts from a multi-select list
2. **Using a group as follower**: When a group is added as a follower, the engine creates individual `copy_rules` for each account in the group. The group's common multiplier is applied to all members.
3. **Editing a group**: Adding/removing accounts from the group asks: "Apply changes to active copy rules?" — propagates changes to running engine if user confirms.
4. **Deleting a group**: Cascading delete — removes all `group_accounts` entries; does NOT remove individual `copy_rules` (prevents accidental disruption of live copying).
5. **Group in follower list**: Displayed as a single row with an expandable chevron to show member accounts and their individual toggle states.

### UI States
- **Empty state**: "No groups yet. Create your first group of accounts for quick selection."
- **Normal state**: Group cards showing name, member count, and action buttons
- **Group selector in AddFollower**: Groups shown with a "Select All" toggle button

---

## Follower Configuration Panel

When expanding/settings for a follower:

```
┌──────────────────────────────────────────────────────────┐
│  Follower: ES Demo Acct #1                               │
│                                                          │
│  Direction    ○ Same  ○ Reverse  ● Both                  │
│                                                          │
│  Lot Settings                                            │
│  ┌──────┐ ┌──────┐ ┌──────┐                              │
│  │ ×0.5 │ │ Min  │ │ Max  │  (lot multiplier)            │
│  └──────┘ └──────┘ └──────┘                              │
│                                                          │
│  Risk Limits                                              │
│  Max Daily Loss:  [─$1,500───┐  (set to 0 for no limit) │
│  Max Open Contracts: [──5────┘                            │
│                                                          │
│  Copy Order Types                                         │
│  ☑ Market Orders   ☑ Stop Orders   ☑ Limit Orders        │
│                                                          │
│  [Save]  [Cancel]  [Remove Follower]                     │
└──────────────────────────────────────────────────────────┘
```

---

## Real-Time Sync

### Renderer receives live updates via IPC push channels:

| Channel | Payload | Trigger |
|---|---|---|
| `engine:status` | `{ running: boolean, leaderId, startedAt }` | Start/stop engine |
| `engine:event` | `{ timestamp, type, leader, follower, symbol, qty, price, status }` | Each copy action |
| `engine:risk-alert` | `{ followerId, rule, current, limit }` | Risk limit approaching |
| `conn:status-change` | `{ connectionId, status: 'connected'\|'connecting'\|'disconnected'\|'error', errorMsg?, lastPing? }` | Connection state change |
| `conn:account-status` | `{ accountId, connectionId, status: 'connected'\|'disconnected', balance?, position? }` | Account-level status (derived from parent connection) |
| `conn:balance-update` | `{ accountId, balance, equity }` | Periodic balance push |

---

## Settings

| Key | Type | Default | Description |
|---|---|---|---|
| `default_env` | `'live' \| 'demo'` | `'demo'` | Default environment for new connections |
| `latency_delay_ms` | number | `0` | Intentional delay before copying to followers |
| `theme` | `'light' \| 'dark'` | `'dark'` | UI theme |
| `log_retention_days` | number | `30` | Auto-prune activity log older than this |
| `polling_interval_ms` | number | `500` | REST polling interval for ProjectX (ms) |
| `global_max_lot_size` | number | `0` | 0 = no limit |
| `global_max_daily_loss` | number | `0` | 0 = no limit |
| `heartbeat_interval_sec` | number | `30` | Connection health check interval |
| `auto_reconnect` | boolean | `true` | Auto-reconnect on disconnect |

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Leader connection drops | Engine pauses, logs error, attempts reconnect. Resumes when connection restored. |
| Follower connection drops | Skips that follower, logs warning, continues with others. Retries on next event. |
| Follower order rejected | Logs full error details to activity log. Continues engine. |
| Risk limit hit | Skips order for that follower, logs "Risk limit exceeded" in activity log. |
| Rate limited by broker | Applies exponential backoff for that broker's requests. Logs warning. |
| Credentials expired | Displays notification in UI. Disables that connection until re-authenticated. |
| App crash on order submission | Orders are submitted per-event. No multi-order transaction — each is independent. |
