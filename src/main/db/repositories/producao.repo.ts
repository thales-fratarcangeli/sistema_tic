import type Database from 'better-sqlite3'
import { withWriteLock } from '../lock'
import type {
  OpComContexto,
  ApontamentoProducao,
  CreateApontamentoInput,
} from '../../../shared/types'

function rowToOp(row: any): OpComContexto {
  return {
    id: row.id,
    numero: row.numero,
    pedidoItemId: row.pedido_item_id,
    quantidadeSolicitada: row.quantidade_solicitada,
    quantidadeProduzida: row.quantidade_produzida,
    status: row.status,
    dataAbertura: row.data_abertura,
    dataEncerramento: row.data_encerramento,
    pedidoNumero: row.pedido_numero,
    clienteNome: row.cliente_nome,
    produtoDescricao: row.produto_descricao,
  }
}

export function listOpsAbertas(db: Database.Database): OpComContexto[] {
  const rows = db
    .prepare(
      `SELECT op.*, p.numero AS pedido_numero, c.nome AS cliente_nome, pr.descricao AS produto_descricao
       FROM ordens_producao op
       JOIN pedido_itens pi ON pi.id = op.pedido_item_id
       JOIN pedidos p ON p.id = pi.pedido_id
       JOIN clientes c ON c.id = p.cliente_id
       JOIN produtos pr ON pr.id = pi.produto_id
       WHERE op.status IN ('aberta', 'em_andamento')
       ORDER BY op.data_abertura ASC`
    )
    .all()
  return rows.map(rowToOp)
}

export async function createApontamento(
  db: Database.Database,
  dbFilePath: string,
  input: CreateApontamentoInput
): Promise<ApontamentoProducao> {
  if (input.quantidade <= 0) {
    throw new Error('Quantidade do apontamento precisa ser maior que zero')
  }

  return withWriteLock(dbFilePath, () => {
    const insert = db.transaction(() => {
      const op = db.prepare('SELECT status FROM ordens_producao WHERE id = ?').get(input.opId) as
        | { status: string }
        | undefined
      if (!op) throw new Error('OP não encontrada')
      if (op.status === 'encerrada') throw new Error('OP já está encerrada')

      const dataHora = new Date().toISOString()
      const result = db
        .prepare(
          `INSERT INTO apontamentos_producao (op_id, usuario_id, quantidade, data_hora, observacao)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(input.opId, input.usuarioId, input.quantidade, dataHora, input.observacao ?? null)

      db.prepare(
        `UPDATE ordens_producao
         SET quantidade_produzida = quantidade_produzida + ?,
             status = CASE WHEN status = 'aberta' THEN 'em_andamento' ELSE status END
         WHERE id = ?`
      ).run(input.quantidade, input.opId)

      return result.lastInsertRowid as number
    })

    const apontamentoId = insert()
    const row = db.prepare('SELECT * FROM apontamentos_producao WHERE id = ?').get(apontamentoId) as any
    return {
      id: row.id,
      opId: row.op_id,
      usuarioId: row.usuario_id,
      quantidade: row.quantidade,
      dataHora: row.data_hora,
      observacao: row.observacao,
    }
  })
}

export async function encerrarOp(
  db: Database.Database,
  dbFilePath: string,
  opId: number
): Promise<void> {
  await withWriteLock(dbFilePath, () => {
    const result = db
      .prepare(`UPDATE ordens_producao SET status = 'encerrada', data_encerramento = ? WHERE id = ? AND status != 'encerrada'`)
      .run(new Date().toISOString(), opId)
    if (result.changes === 0) {
      throw new Error('OP não encontrada ou já encerrada')
    }
  })
}
