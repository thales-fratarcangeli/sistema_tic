import type { Request, Response } from 'express'
import * as usuariosService from '../services/usuarios.service'
import { idDaRota } from './params'

export async function listar(_req: Request, res: Response) {
  res.status(200).json(await usuariosService.listar())
}

export async function criar(req: Request, res: Response) {
  res.status(201).json(await usuariosService.criar(req.body))
}

export async function definirAtivo(req: Request, res: Response) {
  res.status(200).json(await usuariosService.definirAtivo(idDaRota(req), req.body?.ativo))
}

export async function definirPerfil(req: Request, res: Response) {
  res.status(200).json(await usuariosService.definirPerfil(idDaRota(req), req.body?.perfil))
}

export async function redefinirSenha(req: Request, res: Response) {
  await usuariosService.redefinirSenha(idDaRota(req), req.body?.senha)
  res.status(204).end()
}
