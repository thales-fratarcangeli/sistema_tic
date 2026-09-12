import type { Usuario } from '../shared/types'

declare global {
  interface Window {
    api: {
      getDbFolderPath(): Promise<{ dbFolderPath: string } | null>
      setDbFolderPath(dbFolderPath: string): Promise<void>
      login(login: string, senha: string): Promise<Usuario | null>
      ensureSeedAdmin(): Promise<void>
    }
  }
}

export {}
