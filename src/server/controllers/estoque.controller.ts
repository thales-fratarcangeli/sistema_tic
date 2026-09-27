import type { Request, Response } from 'express'
import * as estoqueService from '../services/estoque.service'
import { usuarioLogado } from '../middlewares/auth'

export async function listarAguardandoEntrada(_req: Request, res: Response) {
  res.status(200).json(await estoqueService.listarAguardandoEntrada())
}

export async function listarEmEstoque(_req: Request, res: Response) {
  res.status(200).json(await estoqueService.listarEmEstoque())
}

export async function registrarEntrada(req: Request, res: Response) {
  const movimento = await estoqueService.registrarEntrada({
    ...req.body,
    usuarioId: usuarioLogado(req).id,
  })
  res.status(201).json(movimento)
}

export async function registrarSaida(req: Request, res: Response) {
  const movimento = await estoqueService.registrarSaida({
    ...req.body,
    usuarioId: usuarioLogado(req).id,
  })
  res.status(201).json(movimento)
}
