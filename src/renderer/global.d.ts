declare global {
  interface Window {
    /** Só existe na versão desktop (exposto pelo electron/preload.ts). */
    desktop?: {
      getDbFolderPath(): Promise<{ dbFolderPath: string } | null>
      setDbFolderPath(dbFolderPath: string): Promise<void>
    }
  }
}

export {}
