import { db, type DbClient } from '../db/client'
import type { EstoqueMovimento, TipoMovimentoEstoque } from '../../shared/types'

const itemContextoInclude = {
  pedido: { select: { numero: true, cliente: { select: { nome: true } } } },
  produto: { select: { descricao: true } },
} as const

function toMovimento<T extends { tipo: string }>(row: T): T & { tipo: TipoMovimentoEstoque } {
  return { ...row, tipo: row.tipo as TipoMovimentoEstoque }
}

/** Itens cuja OP foi encerrada e que ainda não tiveram entrada no estoque. */
export function findAguardandoEntrada() {
  return db().pedidoItem.findMany({
    where: {
      ordemProducao: { status: 'encerrada' },
      estoqueMovimentos: { none: { tipo: 'entrada' } },
    },
    include: { ...itemContextoInclude, ordemProducao: { select: { numero: true } } },
    orderBy: { ordemProducao: { dataEncerramento: 'asc' } },
  })
}

/** Itens com entrada confirmada e ainda sem saída/expedição. */
export function findEmEstoque() {
  return db().pedidoItem.findMany({
    where: {
      AND: [
        { estoqueMovimentos: { some: { tipo: 'entrada' } } },
        { estoqueMovimentos: { none: { tipo: 'saida' } } },
      ],
    },
    include: {
      ...itemContextoInclude,
      estoqueMovimentos: {
        where: { tipo: 'entrada' },
        orderBy: { dataHora: 'desc' },
        take: 1,
        select: { dataHora: true },
      },
    },
  })
}

export function findPedidoItemComOp(pedidoItemId: number, client: DbClient = db()) {
  return client.pedidoItem.findUnique({
    where: { id: pedidoItemId },
    include: { ordemProducao: { select: { status: true } } },
  })
}

export async function findMovimento(
  pedidoItemId: number,
  tipo: TipoMovimentoEstoque,
  client: DbClient = db()
): Promise<EstoqueMovimento | null> {
  const row = await client.estoqueMovimento.findFirst({ where: { pedidoItemId, tipo } })
  return row ? toMovimento(row) : null
}

export async function createMovimento(
  data: {
    pedidoItemId: number
    tipo: TipoMovimentoEstoque
    quantidade: number
    usuarioId: number
    dataHora: string
    observacao: string | null
  },
  client: DbClient = db()
): Promise<EstoqueMovimento> {
  return toMovimento(await client.estoqueMovimento.create({ data }))
}
