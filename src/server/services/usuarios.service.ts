import bcrypt from 'bcryptjs'
import { AppError } from '../errors/AppError'
import { writeTransaction } from '../db/client'
import * as usuariosRepository from '../repositories/usuarios.repository'
import type { Usuario, Perfil, CreateUsuarioInput } from '../../shared/types'
import { textoObrigatorio } from './validacao'

const PERFIS: Perfil[] = ['financeiro', 'admin', 'producao', 'estoque']

function perfilValido(perfil: unknown): Perfil {
  if (!PERFIS.includes(perfil as Perfil)) {
    throw new AppError(`Perfil inválido (use: ${PERFIS.join(', ')})`, 400)
  }
  return perfil as Perfil
}

export function listar(): Promise<Usuario[]> {
  return usuariosRepository.findAll()
}

export async function buscarPorId(id: number): Promise<Usuario> {
  const usuario = await usuariosRepository.findById(id)
  if (!usuario) throw new AppError('Usuário não encontrado', 404)
  return usuario
}

export async function criar(input: CreateUsuarioInput): Promise<Usuario> {
  const nome = textoObrigatorio(input?.nome, 'Nome do usuário é obrigatório')
  const login = textoObrigatorio(input?.login, 'Login do usuário é obrigatório')
  const senha = textoObrigatorio(input?.senha, 'Senha do usuário é obrigatória')
  const perfil = perfilValido(input?.perfil)

  // bcrypt é lento de propósito — calcula fora do lock/transação.
  const senhaHash = await bcrypt.hash(senha, 10)
  return writeTransaction(async (tx) => {
    if (await usuariosRepository.existeLogin(login, tx)) {
      throw new AppError('Login já está em uso', 409)
    }
    return usuariosRepository.create({ nome, login, senhaHash, perfil }, tx)
  })
}

async function atualizar(id: number, data: { ativo?: boolean; perfil?: Perfil; senhaHash?: string }) {
  return writeTransaction(async (tx) => {
    const usuario = await usuariosRepository.findById(id, tx)
    if (!usuario) throw new AppError('Usuário não encontrado', 404)
    return usuariosRepository.update(id, data, tx)
  })
}

export function definirAtivo(id: number, ativo: unknown): Promise<Usuario> {
  if (typeof ativo !== 'boolean') throw new AppError('Campo "ativo" precisa ser true ou false', 400)
  return atualizar(id, { ativo })
}

export function definirPerfil(id: number, perfil: unknown): Promise<Usuario> {
  return atualizar(id, { perfil: perfilValido(perfil) })
}

export async function redefinirSenha(id: number, novaSenha: unknown): Promise<Usuario> {
  const senha = textoObrigatorio(novaSenha, 'Nova senha é obrigatória')
  return atualizar(id, { senhaHash: await bcrypt.hash(senha, 10) })
}

/** Devolve o usuário se login/senha conferem e ele está ativo; senão null. */
export async function verificarLogin(login: string, senha: string): Promise<Usuario | null> {
  if (typeof login !== 'string' || typeof senha !== 'string') return null
  const row = await usuariosRepository.findByLoginComSenha(login)
  if (!row || !row.ativo) return null
  if (!(await bcrypt.compare(senha, row.senhaHash))) return null
  return { id: row.id, nome: row.nome, login: row.login, perfil: row.perfil as Perfil, ativo: row.ativo }
}

/**
 * Cria o admin padrão (admin / admin123) se o banco ainda não tem nenhum
 * usuário. Chamado toda vez que o banco é aberto — um banco pode ficar com
 * schema mas sem usuário (ex: crash antes de semear), e aí ninguém entra.
 */
export async function garantirAdminInicial(): Promise<void> {
  if ((await usuariosRepository.count()) > 0) return
  await criar({ nome: 'Administrador', login: 'admin', senha: 'admin123', perfil: 'admin' })
}
