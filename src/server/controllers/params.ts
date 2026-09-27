import type { Request } from 'express'
import { AppError } from '../errors/AppError'

/** Lê o parâmetro de rota :id como inteiro positivo, ou responde 400. */
export function idDaRota(req: Request): number {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) throw new AppError('Id inválido na URL', 400)
  return id
}
