import { db, type DbClient } from '../db/client'
import type { Cliente, CreateClienteInput } from '../../shared/types'

export function findAll(): Promise<Cliente[]> {
  return db().cliente.findMany({ orderBy: { nome: 'asc' } })
}

export function findById(id: number, client: DbClient = db()): Promise<Cliente | null> {
  return client.cliente.findUnique({ where: { id } })
}

export function findByCodigo(codigo: string, client: DbClient = db()): Promise<Cliente | null> {
  return client.cliente.findUnique({ where: { codigo } })
}

export function create(data: CreateClienteInput, client: DbClient = db()): Promise<Cliente> {
  return client.cliente.create({
    data: {
      codigo: data.codigo,
      nome: data.nome,
      cnpjCpf: data.cnpjCpf,
      inscricaoRg: data.inscricaoRg ?? null,
      endereco: data.endereco ?? null,
      bairro: data.bairro ?? null,
      cidade: data.cidade ?? null,
      cep: data.cep ?? null,
      telefone: data.telefone ?? null,
      celular: data.celular ?? null,
    },
  })
}
