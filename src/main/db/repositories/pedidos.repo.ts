import type Database from 'better-sqlite3'
import { withWriteLock } from '../lock'
import type { Pedido, StatusItemPedido } from '../../../shared/types'

interface CreatePedidoItemInput {
  produtoId: number
  quantidade: number
  valorUnitario: number
}

interface CreatePedidoInput {
  clienteId: number
  usuarioId: number
  condicaoPagamento?: string | null
  prazoEntrega?: string | null
  observacoes?: string | null
  itens: CreatePedidoItemInput[]
}

export interface PedidoItemComStatus {
  id: number
  produtoId: number
  produtoDescricao: string
  quantidade: number
  valorUnitario: number
  valorTotal: number
  opNumero: number
  opStatus: string
  status: StatusItemPedido
}

export interface PedidoComItens extends Pedido {
  clienteNome: string
  itens: PedidoItemComStatus[]
}

function rowToPedido(row: any): Pedido {
  return {
    id: row.id,
    numero: row.numero,
    clienteId: row.cliente_id,
    usuarioId: row.usuario_id,
    condicaoPagamento: row.condicao_pagamento,
    dataPedido: row.data_pedido,
    prazoEntrega: row.prazo_entrega,
    observacoes: row.observacoes,
  }
}

export async function createPedido(
  db: Database.Database,
  dbFilePath: string,
  input: CreatePedidoInput
): Promise<Pedido> {
  if (input.itens.length === 0) {
    throw new Error('Pedido precisa de ao menos um item')
  }

  return withWriteLock(dbFilePath, () => {
    const insert = db.transaction(() => {
      const nextNumero = (
        db.prepare('SELECT COALESCE(MAX(numero), 0) + 1 AS n FROM pedidos').get() as { n: number }
      ).n
      const dataPedido = new Date().toISOString()

      const pedidoResult = db
        .prepare(
          `INSERT INTO pedidos (numero, cliente_id, usuario_id, condicao_pagamento, data_pedido, prazo_entrega, observacoes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          nextNumero,
          input.clienteId,
          input.usuarioId,
          input.condicaoPagamento ?? null,
          dataPedido,
          input.prazoEntrega ?? null,
          input.observacoes ?? null
        )
      const pedidoId = pedidoResult.lastInsertRowid as number

      for (const item of input.itens) {
        const valorTotal = item.quantidade * item.valorUnitario
        const itemResult = db
          .prepare(
            `INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, valor_unitario, valor_total)
             VALUES (?, ?, ?, ?, ?)`
          )
          .run(pedidoId, item.produtoId, item.quantidade, item.valorUnitario, valorTotal)
        const pedidoItemId = itemResult.lastInsertRowid as number

        const nextOpNumero = (
          db.prepare('SELECT COALESCE(MAX(numero), 0) + 1 AS n FROM ordens_producao').get() as {
            n: number
          }
        ).n
        db.prepare(
          `INSERT INTO ordens_producao (numero, pedido_item_id, quantidade_solicitada, quantidade_produzida, status, data_abertura)
           VALUES (?, ?, ?, 0, 'aberta', ?)`
        ).run(nextOpNumero, pedidoItemId, item.quantidade, dataPedido)
      }

      return pedidoId
    })

    const pedidoId = insert()
    const row = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(pedidoId)
    return rowToPedido(row)
  })
}

const ITEM_STATUS_SQL = `
  CASE
    WHEN EXISTS (SELECT 1 FROM estoque_movimentos em WHERE em.pedido_item_id = pi.id AND em.tipo = 'saida')
      THEN 'finalizado'
    WHEN EXISTS (SELECT 1 FROM estoque_movimentos em WHERE em.pedido_item_id = pi.id AND em.tipo = 'entrada')
      THEN 'em_estoque'
    WHEN op.status = 'encerrada'
      THEN 'aguardando_estoque'
    WHEN op.quantidade_produzida > 0
      THEN 'em_producao'
    ELSE 'aberto'
  END
`

export function listPedidos(db: Database.Database): PedidoComItens[] {
  const pedidoRows = db.prepare('SELECT p.*, c.nome AS cliente_nome FROM pedidos p JOIN clientes c ON c.id = p.cliente_id ORDER BY p.numero DESC').all() as any[]

  const itemStmt = db.prepare(`
    SELECT
      pi.id, pi.produto_id, pr.descricao AS produto_descricao,
      pi.quantidade, pi.valor_unitario, pi.valor_total,
      op.numero AS op_numero, op.status AS op_status,
      (${ITEM_STATUS_SQL}) AS status
    FROM pedido_itens pi
    JOIN produtos pr ON pr.id = pi.produto_id
    JOIN ordens_producao op ON op.pedido_item_id = pi.id
    WHERE pi.pedido_id = ?
    ORDER BY pi.id
  `)

  return pedidoRows.map((row) => {
    const itemRows = itemStmt.all(row.id) as any[]
    return {
      ...rowToPedido(row),
      clienteNome: row.cliente_nome,
      itens: itemRows.map((i) => ({
        id: i.id,
        produtoId: i.produto_id,
        produtoDescricao: i.produto_descricao,
        quantidade: i.quantidade,
        valorUnitario: i.valor_unitario,
        valorTotal: i.valor_total,
        opNumero: i.op_numero,
        opStatus: i.op_status,
        status: i.status as StatusItemPedido,
      })),
    }
  })
}
