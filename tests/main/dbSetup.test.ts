import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { setupDatabase } from '../../src/main/dbSetup'

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'btfitas-dbsetup-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('setupDatabase', () => {
  it('creates the target folder, the database, and a backup on a brand new (nonexistent) path', () => {
    const dbFolderPath = path.join(tmpDir, 'nao-existe-ainda', 'bt_fitas')
    expect(fs.existsSync(dbFolderPath)).toBe(false)

    const { db, dbFilePath } = setupDatabase(dbFolderPath)

    expect(fs.existsSync(dbFilePath)).toBe(true)
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'")
      .all()
    expect(tables.length).toBe(1)

    const today = new Date().toISOString().slice(0, 10)
    const backupPath = path.join(dbFolderPath, 'backups', `dados-${today}.db`)
    expect(fs.existsSync(backupPath)).toBe(true)

    db.close()
  })

  it('is safe to call again on an already-set-up folder', () => {
    const dbFolderPath = path.join(tmpDir, 'bt_fitas')
    const first = setupDatabase(dbFolderPath)
    first.db.close()

    const second = setupDatabase(dbFolderPath)
    expect(fs.existsSync(second.dbFilePath)).toBe(true)
    second.db.close()
  })
})
