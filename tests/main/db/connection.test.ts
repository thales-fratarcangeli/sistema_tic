import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { openDatabase } from '../../../src/main/db/connection'

let tmpDir: string
let dbPath: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'btfitas-db-'))
  dbPath = path.join(tmpDir, 'dados.db')
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('openDatabase', () => {
  it('creates the file, sets journal_mode to DELETE, and runs migrations', () => {
    const db = openDatabase(dbPath)

    const journalMode = db.pragma('journal_mode', { simple: true })
    expect(journalMode).toBe('delete')

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'")
      .all()
    expect(tables.length).toBe(1)

    db.close()
    expect(fs.existsSync(dbPath)).toBe(true)
  })
})
