import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../errors/AppError'
import { Prisma } from '../generated/prisma/client'

/**
 * Converte qualquer erro lançado nas rotas em uma resposta JSON
 * { error: string }. Precisa ser registrado depois de todas as rotas: o
 * Express só entrega um erro aos middlewares de 4 parâmetros que vêm depois
 * de quem o lançou na cadeia.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }

  // Rede de segurança para restrições do banco que escaparam das
  // validações dos services (ex: duas máquinas gravando ao mesmo tempo).
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Já existe um registro com esse valor único' })
      return
    }
    if (err.code === 'P2003') {
      res.status(409).json({ error: 'Registro relacionado não existe ou ainda está em uso' })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Registro não encontrado' })
      return
    }
  }

  // JSON malformado no corpo da requisição (lançado pelo express.json()).
  if (typeof err === 'object' && err !== null && (err as { type?: string }).type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Corpo da requisição não é um JSON válido' })
    return
  }

  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor' })
}
