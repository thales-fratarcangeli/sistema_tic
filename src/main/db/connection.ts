import Database from 'better-sqlite3'
import { migrate } from './schema'

export function openDatabase(dbFilePath: string): Database.Database {
  const db = new Database(dbFilePath)
  db.pragma('journal_mode = DELETE')
  db.pragma('busy_timeout = 5000')
  migrate(db)
  return db
}
