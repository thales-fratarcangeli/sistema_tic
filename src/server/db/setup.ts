import fs from 'node:fs'
import path from 'node:path'
import { connectDatabase } from './client'
import { ensureDailyBackup } from './backup'
import { garantirAdminInicial } from '../services/usuarios.service'

/**
 * Prepara dbFolderPath para uso: cria a pasta se não existir, abre (e, no
 * primeiro uso, cria) o dados.db dentro dela, garante o backup do dia e
 * cria o admin padrão se o banco não tiver nenhum usuário. Roda toda vez
 * que o banco é aberto — não só na primeira configuração — para que um
 * banco que ficou com schema mas sem usuário (ex: crash no meio de uma
 * execução anterior) ainda ganhe um login válido na próxima abertura.
 * A ordem importa: o backup copia o dados.db, então precisa rodar depois
 * que connectDatabase criou o arquivo.
 */
export async function setupDatabase(dbFolderPath: string): Promise<string> {
  fs.mkdirSync(dbFolderPath, { recursive: true })

  const dbFilePath = path.join(dbFolderPath, 'dados.db')
  const backupsDir = path.join(dbFolderPath, 'backups')

  await connectDatabase(dbFilePath)

  const today = new Date().toISOString().slice(0, 10)
  ensureDailyBackup(dbFilePath, backupsDir, today)

  await garantirAdminInicial()

  return dbFilePath
}
