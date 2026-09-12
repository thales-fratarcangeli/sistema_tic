import type Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import { withWriteLock } from '../lock'
import type { Usuario, Perfil, CreateUsuarioInput } from '../../../shared/types'

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
  input: CreateUsuarioInput
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

/**
 * Bootstraps a default admin user if the database has none yet. Must be
 * called every time the database is opened (not just on first-ever setup)
 * — a database can otherwise end up schema-ready but userless, e.g. if a
 * previous run wrote the config pointing at this folder but crashed before
 * ever seeding a user, leaving nobody able to log in.
 */
export async function ensureSeedAdmin(db: Database.Database, dbFilePath: string): Promise<void> {
  if (listUsers(db).length > 0) return
  await createUser(db, dbFilePath, {
    nome: 'Administrador',
    login: 'admin',
    senha: 'admin123',
    perfil: 'admin',
  })
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

export async function setPerfil(
  db: Database.Database,
  dbFilePath: string,
  id: number,
  perfil: Perfil
): Promise<void> {
  await withWriteLock(dbFilePath, () => {
    db.prepare('UPDATE usuarios SET perfil = ? WHERE id = ?').run(perfil, id)
  })
}

export async function resetPassword(
  db: Database.Database,
  dbFilePath: string,
  id: number,
  novaSenha: string
): Promise<void> {
  const senhaHash = await bcrypt.hash(novaSenha, 10)
  await withWriteLock(dbFilePath, () => {
    db.prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?').run(senhaHash, id)
  })
}
