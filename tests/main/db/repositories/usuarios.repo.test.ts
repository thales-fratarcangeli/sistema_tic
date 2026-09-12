import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { openDatabase } from '../../../../src/main/db/connection'
import {
  createUser,
  verifyLogin,
  listUsers,
  setActive,
} from '../../../../src/main/db/repositories/usuarios.repo'

let tmpDir: string
let dbPath: string
let db: ReturnType<typeof openDatabase>

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'btfitas-usuarios-'))
  dbPath = path.join(tmpDir, 'dados.db')
  db = openDatabase(dbPath)
})

afterEach(() => {
  db.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('usuarios.repo', () => {
  it('creates a user with a hashed password and verifies login', async () => {
    await createUser(db, dbPath, {
      nome: 'Ana Financeiro',
      login: 'ana',
      senha: 'senha123',
      perfil: 'financeiro',
    })

    const found = verifyLogin(db, 'ana', 'senha123')
    expect(found).not.toBeNull()
    expect(found!.nome).toBe('Ana Financeiro')
    expect(found!.perfil).toBe('financeiro')

    const wrongPassword = verifyLogin(db, 'ana', 'errada')
    expect(wrongPassword).toBeNull()
  })

  it('does not return a user that is inactive', async () => {
    const user = await createUser(db, dbPath, {
      nome: 'Bob Producao',
      login: 'bob',
      senha: 'senha123',
      perfil: 'producao',
    })
    await setActive(db, dbPath, user.id, false)

    expect(verifyLogin(db, 'bob', 'senha123')).toBeNull()
  })

  it('lists all users', async () => {
    await createUser(db, dbPath, {
      nome: 'Ana',
      login: 'ana',
      senha: 'x',
      perfil: 'financeiro',
    })
    const users = listUsers(db)
    expect(users.length).toBe(1)
    expect(users[0].login).toBe('ana')
  })
})
