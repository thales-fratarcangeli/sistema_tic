import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { readConfig, writeConfig } from '../src/main/config'
import { setupDatabase } from '../src/main/dbSetup'
import { registerAuthIpc } from '../src/main/ipc/authIpc'
import { registerFinanceiroIpc } from '../src/main/ipc/financeiroIpc'
import { registerProducaoIpc } from '../src/main/ipc/producaoIpc'
import { registerEstoqueIpc } from '../src/main/ipc/estoqueIpc'
import { registerAdminIpc } from '../src/main/ipc/adminIpc'

const configPath = path.join(app.getPath('userData'), 'config.json')

async function openDbAndRegisterIpc(dbFolderPath: string) {
  const { db, dbFilePath } = await setupDatabase(dbFolderPath)

  registerAuthIpc(db, dbFilePath)
  registerFinanceiroIpc(db, dbFilePath)
  registerProducaoIpc(db, dbFilePath)
  registerEstoqueIpc(db, dbFilePath)
  registerAdminIpc(db, dbFilePath)
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    // Packaged builds already carry this icon on the .exe itself (see
    // build.win.icon in package.json) — build-resources/ isn't bundled
    // into the app, so only set it explicitly in dev, where the window
    // would otherwise show the default Electron icon.
    ...(process.env.VITE_DEV_SERVER_URL
      ? { icon: path.join(__dirname, '../build-resources/icon.ico') }
      : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(async () => {
  ipcMain.handle('config:get', () => readConfig(configPath))
  ipcMain.handle('config:set', async (_event, dbFolderPath: string) => {
    writeConfig(configPath, { dbFolderPath })
    await openDbAndRegisterIpc(dbFolderPath)
  })

  const existing = readConfig(configPath)
  if (existing) {
    await openDbAndRegisterIpc(existing.dbFolderPath)
  }

  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
