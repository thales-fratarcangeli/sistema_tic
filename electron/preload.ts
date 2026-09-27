import { contextBridge, ipcRenderer } from 'electron'

// Toda a comunicação de dados passa pela API HTTP (src/renderer/api.ts).
// O IPC ficou só para o que é exclusivo do desktop: escolher a pasta
// compartilhada onde fica o dados.db.
contextBridge.exposeInMainWorld('desktop', {
  getDbFolderPath: (): Promise<{ dbFolderPath: string } | null> =>
    ipcRenderer.invoke('config:get'),
  setDbFolderPath: (dbFolderPath: string): Promise<void> =>
    ipcRenderer.invoke('config:set', dbFolderPath),
})
