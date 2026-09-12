import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import { IpcChannels } from '../../shared/ipc-channels'
import type { CreateUsuarioInput, Perfil } from '../../shared/types'
import { createUser, listUsers, setActive, setPerfil, resetPassword } from '../db/repositories/usuarios.repo'

export function registerAdminIpc(db: Database.Database, dbFilePath: string) {
  ipcMain.handle(IpcChannels.USUARIOS_CREATE, (_event, input: CreateUsuarioInput) =>
    createUser(db, dbFilePath, input)
  )
  ipcMain.handle(IpcChannels.USUARIOS_LIST, () => listUsers(db))
  ipcMain.handle(IpcChannels.USUARIOS_SET_ACTIVE, (_event, id: number, ativo: boolean) =>
    setActive(db, dbFilePath, id, ativo)
  )
  ipcMain.handle(IpcChannels.USUARIOS_SET_PERFIL, (_event, id: number, perfil: Perfil) =>
    setPerfil(db, dbFilePath, id, perfil)
  )
  ipcMain.handle(IpcChannels.USUARIOS_RESET_PASSWORD, (_event, id: number, novaSenha: string) =>
    resetPassword(db, dbFilePath, id, novaSenha)
  )
}
