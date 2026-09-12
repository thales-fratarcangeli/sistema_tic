import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { setupDatabase } from '../../src/main/dbSetup'
import { openDatabase } from '../../src/main/db/connection'
import { listUsers } from '../../src/main/db/repositories/usuarios.repo'

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'btfitas-dbsetup-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('setupDatabase', () => {
  it('creates the target folder, the database, a backup, and a seed admin on a brand new (nonexistent) path', async () => {
    const dbFolderPath = path.join(tmpDir, 'nao-existe-ainda', 'bt_fitas')
    expect(fs.existsSync(dbFolderPath)).toBe(false)

    const { db, dbFilePath } = await setupDatabase(dbFolderPath)

    expect(fs.existsSync(dbFilePath)).toBe(true)
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'")
      .all()
    expect(tables.length).toBe(1)

    const today = new Date().toISOString().slice(0, 10)
    const backupPath = path.join(dbFolderPath, 'backups', `dados-${today}.db`)
    expect(fs.existsSync(backupPath)).toBe(true)

    const users = listUsers(db)
    expect(users.length).toBe(1)
    expect(users[0].login).toBe('admin')
    expect(users[0].perfil).toBe('admin')

    db.close()
  })

  it('is safe to call again on an already-set-up folder', async () => {
    const dbFolderPath = path.join(tmpDir, 'bt_fitas')
    const first = await setupDatabase(dbFolderPath)
    first.db.close()

    const second = await setupDatabase(dbFolderPath)
    expect(fs.existsSync(second.dbFilePath)).toBe(true)
    expect(listUsers(second.db).length).toBe(1)
    second.db.close()
  })

  it('seeds the admin on an existing database that has schema but no users yet', async () => {
    // Reproduces the real-world failure: dados.db already exists (e.g. from
    // a previous run that crashed before ever seeding a user), so the
    // "brand new path" case above never applies, but nobody can log in.
    const dbFolderPath = path.join(tmpDir, 'bt_fitas')
    fs.mkdirSync(dbFolderPath, { recursive: true })
    const preExisting = openDatabase(path.join(dbFolderPath, 'dados.db'))
    expect(listUsers(preExisting).length).toBe(0)
    preExisting.close()

    const { db } = await setupDatabase(dbFolderPath)
    const users = listUsers(db)
    expect(users.length).toBe(1)
    expect(users[0].login).toBe('admin')

    db.close()
  })
})
