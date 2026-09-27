import type { Request, Response } from 'express'
import * as pedidosService from '../services/pedidos.service'
import { usuarioLogado } from '../middlewares/auth'

export async function listar(_req: Request, res: Response) {
  res.status(200).json(await pedidosService.listar())
}

export async function criar(req: Request, res: Response) {
  // O autor do pedido é sempre quem está logado, nunca o que vier no corpo.
  const pedido = await pedidosService.criar({ ...req.body, usuarioId: usuarioLogado(req).id })
  res.status(201).json(pedido)
}
