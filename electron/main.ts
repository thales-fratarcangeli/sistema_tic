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

function openDbAndRegisterIpc(dbFolderPath: string) {
  const { db, dbFilePath } = setupDatabase(dbFolderPath)

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

app.whenReady().then(() => {
  ipcMain.handle('config:get', () => readConfig(configPath))
  ipcMain.handle('config:set', (_event, dbFolderPath: string) => {
    writeConfig(configPath, { dbFolderPath })
    openDbAndRegisterIpc(dbFolderPath)
  })

  const existing = readConfig(configPath)
  if (existing) {
    openDbAndRegisterIpc(existing.dbFolderPath)
  }

  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
