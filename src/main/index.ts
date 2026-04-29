import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { initDatabase, getRepository } from './database/schema'
import { migrate } from './database/migrations'
import { connectionManager } from './broker/ConnectionManager'
import { TradeCopierEngine } from './engine/TradeCopierEngine'
import { encryptCredentials } from './utils/credentialVault'
import type { ConnectionInput } from '../shared/types'

let mainWindow: BrowserWindow | null = null

function getWindow(): BrowserWindow | null {
  return mainWindow
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../../build/icon.png'),
    show: false,
    backgroundColor: '#1a1a2e',
  })

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function pushToRenderer(channel: string, data: any): void {
  const win = getWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data)
  }
}

app.whenReady().then(async () => {
  initDatabase()
  migrate()
  const repo = getRepository()

  // ── Database IPC ──────────────────────────────────────────────

  ipcMain.handle('db:getConnections', () => repo.getConnections())
  ipcMain.handle('db:createConnection', (_, input: ConnectionInput) => repo.createConnection(input))
  ipcMain.handle('db:deleteConnection', (_, id: string) => {
    connectionManager.disconnect(id)
    return repo.deleteConnection(id)
  })
  ipcMain.handle('db:getAccounts', (_, connectionId?: string) => repo.getAccounts(connectionId))
  ipcMain.handle('db:getCopyRules', (_, leaderId?: string) => repo.getCopyRules(leaderId))
  ipcMain.handle('db:createCopyRule', (_, input) => repo.createCopyRule(input))
  ipcMain.handle('db:updateCopyRule', (_, id, data) => repo.updateCopyRule(id, data))
  ipcMain.handle('db:deleteCopyRule', (_, id: string) => repo.deleteCopyRule(id))
  ipcMain.handle('db:toggleCopyRule', (_, id: string, enabled: boolean) => repo.toggleCopyRule(id, enabled))
  ipcMain.handle('db:getGroups', () => repo.getGroups())
  ipcMain.handle('db:createGroup', (_, name: string) => repo.createGroup(name))
  ipcMain.handle('db:deleteGroup', (_, id: string) => repo.deleteGroup(id))
  ipcMain.handle('db:getGroupAccounts', (_, groupId: string) => repo.getGroupAccounts(groupId))
  ipcMain.handle('db:setGroupAccounts', (_, groupId: string, accountIds: string[]) => repo.setGroupAccounts(groupId, accountIds))
  ipcMain.handle('db:getRecentLogs', (_, limit?: number) => repo.getRecentLogs(limit))
  ipcMain.handle('db:getSetting', (_, key: string) => repo.getSetting(key))
  ipcMain.handle('db:setSetting', (_, key: string, value: string) => repo.setSetting(key, value))

  // ── Broker IPC ────────────────────────────────────────────────

  ipcMain.handle('broker:connect', async (_, connectionId: string, label: string, brokerType: 'tradovate' | 'projectx', env: 'live' | 'demo') => {
    const conn = repo.getConnections().find((c) => c.id === connectionId)
    if (!conn) throw new Error('Connection not found')
    await connectionManager.connect(connectionId, label, brokerType, env, conn.credentials)

    const broker = connectionManager.getConnector(connectionId)
    if (broker) {
      const accounts = await broker.getAccounts()
      for (const a of accounts) {
        repo.upsertAccount({
          connection_id: connectionId,
          external_id: a.id,
          name: a.name,
          broker_type: brokerType,
          is_simulated: a.isSimulated,
          balance: a.balance ?? null,
        })
      }
      pushToRenderer('conn:account-status', {
        accountId: connectionId,
        connectionId,
        status: 'connected',
      })
    }
  })

  ipcMain.handle('broker:disconnect', (_, connectionId: string) => {
    connectionManager.disconnect(connectionId)
    pushToRenderer('conn:account-status', {
      accountId: connectionId,
      connectionId,
      status: 'disconnected',
    })
  })

  ipcMain.handle('broker:status', (_, connectionId: string) => {
    return connectionManager.getStatus(connectionId)
  })

  ipcMain.handle('broker:getAccounts', async (_, connectionId: string) => {
    const connector = connectionManager.getConnector(connectionId)
    if (!connector) throw new Error('Not connected')
    return connector.getAccounts()
  })

  ipcMain.handle('broker:getPositions', async (_, connectionId: string, accountId: string) => {
    const connector = connectionManager.getConnector(connectionId)
    if (!connector) throw new Error('Not connected')
    return connector.getPositions(accountId)
  })

  ipcMain.handle('broker:placeOrder', async (_, connectionId: string, order) => {
    const connector = connectionManager.getConnector(connectionId)
    if (!connector) throw new Error('Not connected')
    return connector.placeOrder(order)
  })

  ipcMain.handle('broker:cancelOrder', async (_, connectionId: string, accountId: string, orderId: string) => {
    const connector = connectionManager.getConnector(connectionId)
    if (!connector) throw new Error('Not connected')
    return connector.cancelOrder(accountId, orderId)
  })

  ipcMain.handle('broker:subscribeOrders', (_, connectionId: string) => {
    const connector = connectionManager.getConnector(connectionId)
    if (!connector) return
    return connector.onOrderEvent((event) => {
      pushToRenderer('broker:order-event', { connectionId, event })
    })
  })

  ipcMain.handle('broker:subscribePositions', (_, connectionId: string) => {
    const connector = connectionManager.getConnector(connectionId)
    if (!connector) return
    return connector.onPositionEvent((event) => {
      pushToRenderer('broker:position-event', { connectionId, event })
    })
  })

  ipcMain.handle('credentials:encrypt', (_, plaintext: string) => encryptCredentials(plaintext))

  // ── Engine IPC ────────────────────────────────────────────────

  const engine = new TradeCopierEngine(pushToRenderer)

  ipcMain.handle('engine:start', async (_, leaderAccountId: string) => {
    const repo = getRepository()
    await engine.start(leaderAccountId, repo, connectionManager)
  })

  ipcMain.handle('engine:stop', () => {
    engine.stop()
  })

  ipcMain.handle('engine:status', () => {
    return engine.getStatus()
  })

  // ── Wire ConnectionManager → Renderer ─────────────────────────

  connectionManager.onStatusChange((connectionId, status, errorMsg) => {
    pushToRenderer('conn:status-change', { connectionId, status, errorMsg, lastPing: new Date().toISOString() })
  })

  // ── Graceful Shutdown ─────────────────────────────────────────

  app.on('before-quit', () => {
    engine.stop()
    connectionManager.destroy()
  })

  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
