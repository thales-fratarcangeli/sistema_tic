import type { Request, Response } from 'express'
import * as producaoService from '../services/producao.service'
import { usuarioLogado } from '../middlewares/auth'
import { idDaRota } from './params'

export async function listarOpsAbertas(_req: Request, res: Response) {
  res.status(200).json(await producaoService.listarOpsAbertas())
}

export async function buscarOp(req: Request, res: Response) {
  res.status(200).json(await producaoService.buscarOp(idDaRota(req)))
}

export async function listarApontamentos(req: Request, res: Response) {
  res.status(200).json(await producaoService.listarApontamentos(idDaRota(req)))
}

export async function criarApontamento(req: Request, res: Response) {
  const apontamento = await producaoService.criarApontamento({
    ...req.body,
    usuarioId: usuarioLogado(req).id,
  })
  res.status(201).json(apontamento)
}

export async function encerrarOp(req: Request, res: Response) {
  res.status(200).json(await producaoService.encerrarOp(idDaRota(req)))
}
