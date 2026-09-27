import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../errors/AppError'
import * as authService from '../services/auth.service'
import type { Perfil, Usuario } from '../../shared/types'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: Usuario
      token?: string
    }
  }
}

/** Exige "Authorization: Bearer <token>" de uma sessão válida. */
export async function autenticar(req: Request, _res: Response, next: NextFunction) {
  const [tipo, token] = (req.headers.authorization ?? '').split(' ')
  if (tipo !== 'Bearer' || !token) throw new AppError('Faça login para continuar', 401)

  req.usuario = await authService.usuarioDaSessao(token)
  req.token = token
  next()
}

/** Libera a rota só para os perfis informados (o admin sempre passa). */
export function exigirPerfil(...perfis: Perfil[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const perfil = req.usuario?.perfil
    if (perfil !== 'admin' && !perfis.includes(perfil as Perfil)) {
      throw new AppError('Seu perfil não tem acesso a esta operação', 403)
    }
    next()
  }
}

/** Usuário autenticado da requisição (as rotas protegidas garantem que existe). */
export function usuarioLogado(req: Request): Usuario {
  if (!req.usuario) throw new AppError('Faça login para continuar', 401)
  return req.usuario
}
