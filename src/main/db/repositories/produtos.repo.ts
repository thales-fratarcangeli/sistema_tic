import type Database from 'better-sqlite3'
import { withWriteLock } from '../lock'
import type { Produto, CreateProdutoInput } from '../../../shared/types'

function rowToProduto(row: any): Produto {
  return {
    id: row.id,
    codigo: row.codigo,
    descricao: row.descricao,
    unidade: row.unidade,
    valorUnitarioPadrao: row.valor_unitario_padrao,
  }
}

export async function createProduto(
  db: Database.Database,
  dbFilePath: string,
  input: CreateProdutoInput
): Promise<Produto> {
  return withWriteLock(dbFilePath, () => {
    const stmt = db.prepare(
      `INSERT INTO produtos (codigo, descricao, unidade, valor_unitario_padrao) VALUES (?, ?, ?, ?)`
    )
    const result = stmt.run(input.codigo, input.descricao, input.unidade, input.valorUnitarioPadrao)
    const row = db.prepare('SELECT * FROM produtos WHERE id = ?').get(result.lastInsertRowid)
    return rowToProduto(row)
  })
}

export function listProdutos(db: Database.Database): Produto[] {
  return db.prepare('SELECT * FROM produtos ORDER BY descricao').all().map(rowToProduto)
}
