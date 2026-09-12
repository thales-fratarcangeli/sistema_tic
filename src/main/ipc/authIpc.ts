import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import { IpcChannels } from '../../shared/ipc-channels'
import { verifyLogin, createUser, listUsers } from '../db/repositories/usuarios.repo'

export function registerAuthIpc(db: Database.Database, dbFilePath: string) {
  ipcMain.handle(IpcChannels.AUTH_LOGIN, (_event, login: string, senha: string) => {
    return verifyLogin(db, login, senha)
  })

  // Seeds the first admin user if none exist yet — bootstraps the system
  // before there is any UI to create users. Default credentials must be
  // changed after first login (enforced by the Admin screens, later plan).
  ipcMain.handle('auth:ensureSeedAdmin', async () => {
    const users = listUsers(db)
    if (users.length === 0) {
      await createUser(db, dbFilePath, {
        nome: 'Administrador',
        login: 'admin',
        senha: 'admin123',
        perfil: 'admin',
      })
    }
  })
}
