import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ensureDailyBackup } from '../../src/main/backup'

let tmpDir: string
let dbFilePath: string
let backupsDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'btfitas-backup-'))
  dbFilePath = path.join(tmpDir, 'dados.db')
  fs.writeFileSync(dbFilePath, 'fake-db-content')
  backupsDir = path.join(tmpDir, 'backups')
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('ensureDailyBackup', () => {
  it('creates a backup file named with the given date if none exists', () => {
    ensureDailyBackup(dbFilePath, backupsDir, '2026-09-12')

    const expected = path.join(backupsDir, 'dados-2026-09-12.db')
    expect(fs.existsSync(expected)).toBe(true)
    expect(fs.readFileSync(expected, 'utf-8')).toBe('fake-db-content')
  })

  it('does not overwrite an existing backup for the same day', () => {
    fs.mkdirSync(backupsDir, { recursive: true })
    const expected = path.join(backupsDir, 'dados-2026-09-12.db')
    fs.writeFileSync(expected, 'original-backup')

    ensureDailyBackup(dbFilePath, backupsDir, '2026-09-12')

    expect(fs.readFileSync(expected, 'utf-8')).toBe('original-backup')
  })
})
