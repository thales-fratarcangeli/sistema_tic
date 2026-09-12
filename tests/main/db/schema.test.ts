import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { migrate } from '../../../src/main/db/schema'

describe('migrate', () => {
  it('creates all expected tables', () => {
    const db = new Database(':memory:')
    migrate(db)

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((row: any) => row.name)

    expect(tables).toEqual(
      expect.arrayContaining([
        'usuarios',
        'clientes',
        'produtos',
        'pedidos',
        'pedido_itens',
        'ordens_producao',
        'apontamentos_producao',
        'estoque_movimentos',
      ])
    )
  })

  it('is idempotent (running twice does not error)', () => {
    const db = new Database(':memory:')
    migrate(db)
    expect(() => migrate(db)).not.toThrow()
  })
})
