import { db, type DbClient } from '../db/client'
import type { Usuario, Perfil } from '../../shared/types'

// Nunca devolve senhaHash para fora do repository, exceto em findByLoginComSenha.
const usuarioSelect = { id: true, nome: true, login: true, perfil: true, ativo: true } as const

function toUsuario(row: { id: number; nome: string; login: string; perfil: string; ativo: boolean }): Usuario {
  return { ...row, perfil: row.perfil as Perfil }
}

export async function findAll(): Promise<Usuario[]> {
  const rows = await db().usuario.findMany({ select: usuarioSelect, orderBy: { nome: 'asc' } })
  return rows.map(toUsuario)
}

export async function findById(id: number, client: DbClient = db()): Promise<Usuario | null> {
  const row = await client.usuario.findUnique({ where: { id }, select: usuarioSelect })
  return row ? toUsuario(row) : null
}

/** Único ponto que devolve o hash da senha — usado só pelo login. */
export function findByLoginComSenha(login: string) {
  return db().usuario.findUnique({ where: { login } })
}

export async function existeLogin(login: string, client: DbClient = db()): Promise<boolean> {
  return (await client.usuario.count({ where: { login } })) > 0
}

export function count(): Promise<number> {
  return db().usuario.count()
}

export async function create(
  data: { nome: string; login: string; senhaHash: string; perfil: Perfil },
  client: DbClient = db()
): Promise<Usuario> {
  const row = await client.usuario.create({ data, select: usuarioSelect })
  return toUsuario(row)
}

export async function update(
  id: number,
  data: { ativo?: boolean; perfil?: Perfil; senhaHash?: string },
  client: DbClient = db()
): Promise<Usuario> {
  const row = await client.usuario.update({ where: { id }, data, select: usuarioSelect })
  return toUsuario(row)
}
