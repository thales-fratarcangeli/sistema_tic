import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import { IpcChannels } from '../../shared/ipc-channels'
import { verifyLogin, ensureSeedAdmin } from '../db/repositories/usuarios.repo'

export function registerAuthIpc(db: Database.Database, dbFilePath: string) {
  ipcMain.handle(IpcChannels.AUTH_LOGIN, (_event, login: string, senha: string) => {
    return verifyLogin(db, login, senha)
  })

  // setupDatabase() already seeds the admin on every startup; this handler
  // stays as a no-op-if-already-seeded safety net for the setup screen's
  // explicit call.
  ipcMain.handle('auth:ensureSeedAdmin', () => ensureSeedAdmin(db, dbFilePath))
}
