import type Database from 'better-sqlite3'
import { withWriteLock } from '../lock'
import type {
  EstoqueMovimento,
  ItemAguardandoEntrada,
  ItemEmEstoque,
  CreateMovimentoEstoqueInput,
} from '../../../shared/types'

function rowToMovimento(row: any): EstoqueMovimento {
  return {
    id: row.id,
    pedidoItemId: row.pedido_item_id,
    tipo: row.tipo,
    quantidade: row.quantidade,
    usuarioId: row.usuario_id,
    dataHora: row.data_hora,
    observacao: row.observacao,
  }
}

export function listAguardandoEntrada(db: Database.Database): ItemAguardandoEntrada[] {
  const rows = db
    .prepare(
      `SELECT pi.id AS pedido_item_id, p.numero AS pedido_numero, c.nome AS cliente_nome,
              pr.descricao AS produto_descricao, pi.quantidade, op.numero AS op_numero
       FROM pedido_itens pi
       JOIN ordens_producao op ON op.pedido_item_id = pi.id
       JOIN pedidos p ON p.id = pi.pedido_id
       JOIN clientes c ON c.id = p.cliente_id
       JOIN produtos pr ON pr.id = pi.produto_id
       WHERE op.status = 'encerrada'
         AND NOT EXISTS (
           SELECT 1 FROM estoque_movimentos em WHERE em.pedido_item_id = pi.id AND em.tipo = 'entrada'
         )
       ORDER BY op.data_encerramento ASC`
    )
    .all() as any[]

  return rows.map((r) => ({
    pedidoItemId: r.pedido_item_id,
    pedidoNumero: r.pedido_numero,
    clienteNome: r.cliente_nome,
    produtoDescricao: r.produto_descricao,
    quantidade: r.quantidade,
    opNumero: r.op_numero,
  }))
}

export function listEmEstoque(db: Database.Database): ItemEmEstoque[] {
  const rows = db
    .prepare(
      `SELECT pi.id AS pedido_item_id, p.numero AS pedido_numero, c.nome AS cliente_nome,
              pr.descricao AS produto_descricao, pi.quantidade,
              (SELECT em.data_hora FROM estoque_movimentos em
               WHERE em.pedido_item_id = pi.id AND em.tipo = 'entrada'
               ORDER BY em.data_hora DESC LIMIT 1) AS data_entrada
       FROM pedido_itens pi
       JOIN pedidos p ON p.id = pi.pedido_id
       JOIN clientes c ON c.id = p.cliente_id
       JOIN produtos pr ON pr.id = pi.produto_id
       WHERE EXISTS (
           SELECT 1 FROM estoque_movimentos em WHERE em.pedido_item_id = pi.id AND em.tipo = 'entrada'
         )
         AND NOT EXISTS (
           SELECT 1 FROM estoque_movimentos em WHERE em.pedido_item_id = pi.id AND em.tipo = 'saida'
         )
       ORDER BY data_entrada ASC`
    )
    .all() as any[]

  return rows.map((r) => ({
    pedidoItemId: r.pedido_item_id,
    pedidoNumero: r.pedido_numero,
    clienteNome: r.cliente_nome,
    produtoDescricao: r.produto_descricao,
    quantidade: r.quantidade,
    dataEntrada: r.data_entrada,
  }))
}

export async function registrarEntrada(
  db: Database.Database,
  dbFilePath: string,
  input: CreateMovimentoEstoqueInput
): Promise<EstoqueMovimento> {
  if (input.quantidade <= 0) {
    throw new Error('Quantidade da entrada precisa ser maior que zero')
  }

  return withWriteLock(dbFilePath, () => {
    const insert = db.transaction(() => {
      const existing = db
        .prepare(
          `SELECT 1 FROM estoque_movimentos WHERE pedido_item_id = ? AND tipo = 'entrada'`
        )
        .get(input.pedidoItemId)
      if (existing) throw new Error('Entrada já registrada para este item')

      const dataHora = new Date().toISOString()
      const result = db
        .prepare(
          `INSERT INTO estoque_movimentos (pedido_item_id, tipo, quantidade, usuario_id, data_hora, observacao)
           VALUES (?, 'entrada', ?, ?, ?, ?)`
        )
        .run(input.pedidoItemId, input.quantidade, input.usuarioId, dataHora, input.observacao ?? null)
      return result.lastInsertRowid as number
    })

    const id = insert()
    return rowToMovimento(db.prepare('SELECT * FROM estoque_movimentos WHERE id = ?').get(id))
  })
}

export async function registrarSaida(
  db: Database.Database,
  dbFilePath: string,
  input: CreateMovimentoEstoqueInput
): Promise<EstoqueMovimento> {
  if (input.quantidade <= 0) {
    throw new Error('Quantidade da saída precisa ser maior que zero')
  }

  return withWriteLock(dbFilePath, () => {
    const insert = db.transaction(() => {
      const temEntrada = db
        .prepare(
          `SELECT 1 FROM estoque_movimentos WHERE pedido_item_id = ? AND tipo = 'entrada'`
        )
        .get(input.pedidoItemId)
      if (!temEntrada) throw new Error('Item ainda não teve entrada confirmada no estoque')

      const jaSaiu = db
        .prepare(`SELECT 1 FROM estoque_movimentos WHERE pedido_item_id = ? AND tipo = 'saida'`)
        .get(input.pedidoItemId)
      if (jaSaiu) throw new Error('Saída já registrada para este item')

      const dataHora = new Date().toISOString()
      const result = db
        .prepare(
          `INSERT INTO estoque_movimentos (pedido_item_id, tipo, quantidade, usuario_id, data_hora, observacao)
           VALUES (?, 'saida', ?, ?, ?, ?)`
        )
        .run(input.pedidoItemId, input.quantidade, input.usuarioId, dataHora, input.observacao ?? null)
      return result.lastInsertRowid as number
    })

    const id = insert()
    return rowToMovimento(db.prepare('SELECT * FROM estoque_movimentos WHERE id = ?').get(id))
  })
}
