import type { Request, Response } from 'express'
import * as clientesService from '../services/clientes.service'

export async function listar(_req: Request, res: Response) {
  res.status(200).json(await clientesService.listar())
}

export async function criar(req: Request, res: Response) {
  res.status(201).json(await clientesService.criar(req.body))
}
