import type { Request, Response } from 'express'
import * as produtosService from '../services/produtos.service'

export async function listar(_req: Request, res: Response) {
  res.status(200).json(await produtosService.listar())
}

export async function criar(req: Request, res: Response) {
  res.status(201).json(await produtosService.criar(req.body))
}
