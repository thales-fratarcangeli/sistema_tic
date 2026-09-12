import fs from 'node:fs'
import path from 'node:path'
import type Database from 'better-sqlite3'
import { openDatabase } from './db/connection'
import { ensureDailyBackup } from './backup'
import { ensureSeedAdmin } from './db/repositories/usuarios.repo'

export interface DbSetupResult {
  db: Database.Database
  dbFilePath: string
}

/**
 * Prepares dbFolderPath for use: creates it if missing, opens (and on
 * first use, creates) dados.db inside it, ensures today's backup, and
 * seeds a default admin user if the database has none. Runs every time
 * the app opens the database — not only on first-ever setup — so a
 * database that ended up schema-ready but userless (e.g. from a crash
 * partway through a previous run) still gets a working login next time.
 * Order matters: ensureDailyBackup copies dados.db, so it must run after
 * openDatabase creates that file, not before.
 */
export async function setupDatabase(dbFolderPath: string): Promise<DbSetupResult> {
  fs.mkdirSync(dbFolderPath, { recursive: true })

  const dbFilePath = path.join(dbFolderPath, 'dados.db')
  const backupsDir = path.join(dbFolderPath, 'backups')

  const db = openDatabase(dbFilePath)

  const today = new Date().toISOString().slice(0, 10)
  ensureDailyBackup(dbFilePath, backupsDir, today)

  await ensureSeedAdmin(db, dbFilePath)

  return { db, dbFilePath }
}
