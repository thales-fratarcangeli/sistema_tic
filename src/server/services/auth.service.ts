import crypto from 'node:crypto'
import { AppError } from '../errors/AppError'
import * as usuariosRepository from '../repositories/usuarios.repository'
import type { LoginResponse, Usuario } from '../../shared/types'
import { verificarLogin } from './usuarios.service'

// Sessões em memória: token → id do usuário. Reiniciar o servidor desloga
// todo mundo, o que é aceitável para um sistema interno de fábrica.
const sessoes = new Map<string, number>()

export async function login(login: string, senha: string): Promise<LoginResponse> {
  const usuario = await verificarLogin(login, senha)
  if (!usuario) throw new AppError('Usuário ou senha inválidos', 401)

  const token = crypto.randomBytes(32).toString('hex')
  sessoes.set(token, usuario.id)
  return { token, usuario }
}

export function logout(token: string): void {
  sessoes.delete(token)
}

/**
 * Resolve o usuário de um token. Relê o usuário do banco a cada chamada,
 * então desativar alguém ou trocar seu perfil vale imediatamente, sem
 * esperar ele sair do sistema.
 */
export async function usuarioDaSessao(token: string): Promise<Usuario> {
  const usuarioId = sessoes.get(token)
  const usuario = usuarioId ? await usuariosRepository.findById(usuarioId) : null
  if (!usuario || !usuario.ativo) {
    sessoes.delete(token)
    throw new AppError('Sessão expirada, entre novamente', 401)
  }
  return usuario
}
