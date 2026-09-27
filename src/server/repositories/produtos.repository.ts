import { db, type DbClient } from '../db/client'
import type { Produto, CreateProdutoInput } from '../../shared/types'

export function findAll(): Promise<Produto[]> {
  return db().produto.findMany({ orderBy: { descricao: 'asc' } })
}

export function findById(id: number, client: DbClient = db()): Promise<Produto | null> {
  return client.produto.findUnique({ where: { id } })
}

export function findByCodigo(codigo: string, client: DbClient = db()): Promise<Produto | null> {
  return client.produto.findUnique({ where: { codigo } })
}

export function create(data: CreateProdutoInput, client: DbClient = db()): Promise<Produto> {
  return client.produto.create({
    data: {
      codigo: data.codigo,
      descricao: data.descricao,
      unidade: data.unidade,
      valorUnitarioPadrao: data.valorUnitarioPadrao,
    },
  })
}
