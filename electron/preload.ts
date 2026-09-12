import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '../src/shared/ipc-channels'
import type { Usuario } from '../src/shared/types'

contextBridge.exposeInMainWorld('api', {
  getDbFolderPath: (): Promise<{ dbFolderPath: string } | null> =>
    ipcRenderer.invoke('config:get'),
  setDbFolderPath: (dbFolderPath: string): Promise<void> =>
    ipcRenderer.invoke('config:set', dbFolderPath),
  login: (login: string, senha: string): Promise<Usuario | null> =>
    ipcRenderer.invoke(IpcChannels.AUTH_LOGIN, login, senha),
  ensureSeedAdmin: (): Promise<void> => ipcRenderer.invoke('auth:ensureSeedAdmin'),
})
