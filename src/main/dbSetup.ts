import fs from 'node:fs'
import path from 'node:path'
import type Database from 'better-sqlite3'
import { openDatabase } from './db/connection'
import { ensureDailyBackup } from './backup'

export interface DbSetupResult {
  db: Database.Database
  dbFilePath: string
}

/**
 * Prepares dbFolderPath for use: creates it if missing, opens (and on
 * first use, creates) dados.db inside it, then ensures today's backup.
 * Order matters — ensureDailyBackup copies dados.db, so it must run
 * after openDatabase creates that file, not before.
 */
export function setupDatabase(dbFolderPath: string): DbSetupResult {
  fs.mkdirSync(dbFolderPath, { recursive: true })

  const dbFilePath = path.join(dbFolderPath, 'dados.db')
  const backupsDir = path.join(dbFolderPath, 'backups')

  const db = openDatabase(dbFilePath)

  const today = new Date().toISOString().slice(0, 10)
  ensureDailyBackup(dbFilePath, backupsDir, today)

  return { db, dbFilePath }
}
