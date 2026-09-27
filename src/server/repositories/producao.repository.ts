import { db, type DbClient } from '../db/client'
import type { OrdemProducao, ApontamentoProducao, StatusOrdemProducao } from '../../shared/types'

// Contexto que as telas mostram ao lado de cada OP: pedido, cliente e produto.
const opContextoInclude = {
  pedidoItem: {
    include: {
      pedido: { select: { numero: true, cliente: { select: { nome: true } } } },
      produto: { select: { descricao: true } },
    },
  },
} as const

function toOp<T extends { status: string }>(row: T): T & { status: StatusOrdemProducao } {
  return { ...row, status: row.status as StatusOrdemProducao }
}

export async function findOpsAbertas() {
  const rows = await db().ordemProducao.findMany({
    where: { status: { in: ['aberta', 'em_andamento'] } },
    include: opContextoInclude,
    orderBy: [{ dataAbertura: 'asc' }, { id: 'asc' }],
  })
  return rows.map(toOp)
}

export async function findOpById(id: number, client: DbClient = db()): Promise<OrdemProducao | null> {
  const row = await client.ordemProducao.findUnique({ where: { id } })
  return row ? toOp(row) : null
}

export async function findOpComApontamentos(id: number) {
  const row = await db().ordemProducao.findUnique({
    where: { id },
    include: { ...opContextoInclude, apontamentos: { orderBy: { id: 'asc' } } },
  })
  return row ? toOp(row) : null
}

export function findApontamentosDaOp(opId: number): Promise<ApontamentoProducao[]> {
  return db().apontamentoProducao.findMany({ where: { opId }, orderBy: { id: 'asc' } })
}

export async function proximoNumeroOp(client: DbClient = db()): Promise<number> {
  const { _max } = await client.ordemProducao.aggregate({ _max: { numero: true } })
  return (_max.numero ?? 0) + 1
}

export async function createOp(
  data: { numero: number; pedidoItemId: number; quantidadeSolicitada: number; dataAbertura: string },
  client: DbClient = db()
): Promise<OrdemProducao> {
  return toOp(await client.ordemProducao.create({ data }))
}

export function createApontamento(
  data: { opId: number; usuarioId: number; quantidade: number; dataHora: string; observacao: string | null },
  client: DbClient = db()
): Promise<ApontamentoProducao> {
  return client.apontamentoProducao.create({ data })
}

export async function incrementarProducao(
  opId: number,
  quantidade: number,
  novoStatus: StatusOrdemProducao,
  client: DbClient = db()
): Promise<OrdemProducao> {
  const row = await client.ordemProducao.update({
    where: { id: opId },
    data: { quantidadeProduzida: { increment: quantidade }, status: novoStatus },
  })
  return toOp(row)
}

export async function encerrarOp(
  id: number,
  dataEncerramento: string,
  client: DbClient = db()
): Promise<OrdemProducao> {
  const row = await client.ordemProducao.update({
    where: { id },
    data: { status: 'encerrada', dataEncerramento },
  })
  return toOp(row)
}
