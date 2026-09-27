import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import express from 'express'
import { readConfig, writeConfig } from '../src/desktop/config'
import { createApp } from '../src/server/app'
import { setupDatabase } from '../src/server/db/setup'
import { isDatabaseConnected } from '../src/server/db/client'

// Versão desktop: cada computador roda este app, que sobe o mesmo servidor
// Express + Prisma da versão web, mas só em 127.0.0.1 (invisível para a
// rede) e apontando para o dados.db na pasta compartilhada. A interface
// React fala com ele por HTTP, exatamente como na versão web.

const configPath = path.join(app.getPath('userData'), 'config.json')

// Em desenvolvimento o Vite (porta 5173) faz proxy de /api para esta porta
// fixa — ver vite.config.ts. Em produção a porta é escolhida pelo sistema.
const DEV_API_PORT = 3001

async function startServer(): Promise<string> {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL
  const frontend = devServerUrl ? undefined : express.static(path.join(__dirname, '../dist'))

  const server = createApp({ frontend }).listen(devServerUrl ? DEV_API_PORT : 0, '127.0.0.1')
  await once(server, 'listening')

  return devServerUrl ?? `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

function createWindow(url: string) {
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

  win.loadURL(url)
}

app.whenReady().then(async () => {
  // A tela de configuração só aparece enquanto o banco não está aberto —
  // inclusive quando a pasta salva ficou inacessível (ex: servidor
  // desligado), para o usuário poder apontar outro caminho.
  ipcMain.handle('config:get', () => (isDatabaseConnected() ? readConfig(configPath) : null))
  ipcMain.handle('config:set', async (_event, dbFolderPath: string) => {
    await setupDatabase(dbFolderPath)
    writeConfig(configPath, { dbFolderPath })
  })

  const existing = readConfig(configPath)
  if (existing) {
    try {
      await setupDatabase(existing.dbFolderPath)
    } catch (err) {
      console.error(`Não foi possível abrir o banco em ${existing.dbFolderPath}:`, err)
    }
  }

  createWindow(await startServer())
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
