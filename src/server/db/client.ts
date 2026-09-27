import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient, type Prisma } from '../generated/prisma/client'
import { AppError } from '../errors/AppError'
import { ensureSchema } from './schema'
import { withWriteLock } from './lock'

/** Um PrismaClient ou o client de dentro de uma $transaction. */
export type DbClient = PrismaClient | Prisma.TransactionClient

let prisma: PrismaClient | null = null
let currentDbFilePath: string | null = null

/**
 * Abre (e, no primeiro uso, cria) o dados.db em dbFilePath e passa a usá-lo
 * como banco da aplicação. Fecha o banco anterior, se houver — o app
 * desktop pode trocar de pasta pela tela de configuração.
 */
export async function connectDatabase(dbFilePath: string): Promise<PrismaClient> {
  await disconnectDatabase()

  // busy_timeout alto como segunda camada de proteção, além do lock de
  // arquivo: o dados.db pode estar numa pasta de rede usada por várias
  // máquinas ao mesmo tempo (versão desktop).
  const adapter = new PrismaBetterSqlite3({ url: dbFilePath, timeout: 5000 })
  const client = new PrismaClient({ adapter })

  // WAL não é confiável sobre SMB — mantém o journal tradicional.
  await client.$queryRawUnsafe('PRAGMA journal_mode = DELETE')
  await ensureSchema(client)

  prisma = client
  currentDbFilePath = dbFilePath
  return client
}

export async function disconnectDatabase(): Promise<void> {
  if (prisma) await prisma.$disconnect()
  prisma = null
  currentDbFilePath = null
}

export function isDatabaseConnected(): boolean {
  return prisma !== null
}

export function db(): PrismaClient {
  if (!prisma) throw new AppError('Banco de dados ainda não configurado', 503)
  return prisma
}

/**
 * Executa fn dentro de uma transação do Prisma, com o lock de arquivo do
 * dados.db adquirido antes. O lock serializa as escritas entre processos
 * (várias máquinas apontando para o mesmo arquivo na versão desktop); a
 * transação garante o "tudo ou nada" dentro de cada escrita.
 */
export function writeTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  const client = db()
  return withWriteLock(currentDbFilePath!, () => client.$transaction(fn))
}
