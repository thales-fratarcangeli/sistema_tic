import { db, type DbClient } from '../db/client'
import type { Pedido, PedidoItem } from '../../shared/types'

export async function proximoNumero(client: DbClient = db()): Promise<number> {
  const { _max } = await client.pedido.aggregate({ _max: { numero: true } })
  return (_max.numero ?? 0) + 1
}

export function create(
  data: {
    numero: number
    clienteId: number
    usuarioId: number
    condicaoPagamento: string | null
    dataPedido: string
    prazoEntrega: string | null
    observacoes: string | null
  },
  client: DbClient = db()
): Promise<Pedido> {
  return client.pedido.create({ data })
}

export function createItem(
  data: {
    pedidoId: number
    produtoId: number
    quantidade: number
    valorUnitario: number
    valorTotal: number
  },
  client: DbClient = db()
): Promise<PedidoItem> {
  return client.pedidoItem.create({ data })
}

/**
 * Pedidos com o nome do cliente e, em cada item, o produto, a OP e os
 * tipos de movimento de estoque — tudo que o service precisa para calcular
 * o status de cada item.
 */
export function findAllComItens() {
  return db().pedido.findMany({
    orderBy: { numero: 'desc' },
    include: {
      cliente: { select: { nome: true } },
      itens: {
        orderBy: { id: 'asc' },
        include: {
          produto: { select: { descricao: true } },
          ordemProducao: true,
          estoqueMovimentos: { select: { tipo: true } },
        },
      },
    },
  })
}
