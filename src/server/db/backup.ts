import fs from 'node:fs'
import path from 'node:path'

export function ensureDailyBackup(
  dbFilePath: string,
  backupsDir: string,
  today: string
): void {
  const backupPath = path.join(backupsDir, `dados-${today}.db`)
  if (fs.existsSync(backupPath)) return

  fs.mkdirSync(backupsDir, { recursive: true })
  fs.copyFileSync(dbFilePath, backupPath)
}
