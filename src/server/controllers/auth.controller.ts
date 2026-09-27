import type { Request, Response } from 'express'
import * as authService from '../services/auth.service'
import { usuarioLogado } from '../middlewares/auth'

export async function login(req: Request, res: Response) {
  const { login, senha } = req.body ?? {}
  res.status(200).json(await authService.login(login, senha))
}

export function logout(req: Request, res: Response) {
  if (req.token) authService.logout(req.token)
  res.status(204).end()
}

export function me(req: Request, res: Response) {
  res.status(200).json(usuarioLogado(req))
}
