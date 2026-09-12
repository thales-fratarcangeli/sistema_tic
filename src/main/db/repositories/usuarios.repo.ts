import type Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import { withWriteLock } from '../lock'
import type { Usuario, Perfil } from '../../../shared/types'

interface CreateUserInput {
  nome: string
  login: string
  senha: string
  perfil: Perfil
}

function rowToUsuario(row: any): Usuario {
  return {
    id: row.id,
    nome: row.nome,
    login: row.login,
    perfil: row.perfil,
    ativo: row.ativo === 1,
  }
}

export async function createUser(
  db: Database.Database,
  dbFilePath: string,
  input: CreateUserInput
): Promise<Usuario> {
  const senhaHash = await bcrypt.hash(input.senha, 10)
  return withWriteLock(dbFilePath, () => {
    const stmt = db.prepare(
      `INSERT INTO usuarios (nome, login, senha_hash, perfil, ativo) VALUES (?, ?, ?, ?, 1)`
    )
    const result = stmt.run(input.nome, input.login, senhaHash, input.perfil)
    const row = db
      .prepare('SELECT * FROM usuarios WHERE id = ?')
      .get(result.lastInsertRowid)
    return rowToUsuario(row)
  })
}

export function verifyLogin(
  db: Database.Database,
  login: string,
  senha: string
): Usuario | null {
  const row: any = db
    .prepare('SELECT * FROM usuarios WHERE login = ? AND ativo = 1')
    .get(login)
  if (!row) return null
  if (!bcrypt.compareSync(senha, row.senha_hash)) return null
  return rowToUsuario(row)
}

export function listUsers(db: Database.Database): Usuario[] {
  const rows = db.prepare('SELECT * FROM usuarios ORDER BY nome').all()
  return rows.map(rowToUsuario)
}

export async function setActive(
  db: Database.Database,
  dbFilePath: string,
  id: number,
  ativo: boolean
): Promise<void> {
  await withWriteLock(dbFilePath, () => {
    db.prepare('UPDATE usuarios SET ativo = ? WHERE id = ?').run(ativo ? 1 : 0, id)
  })
}
