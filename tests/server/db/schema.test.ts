import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { connectDatabase, disconnectDatabase, db } from '../../../src/server/db/client'
import { SCHEMA_SQL } from '../../../src/server/db/schema'
import * as pedidosService from '../../../src/server/services/pedidos.service'
import * as producaoService from '../../../src/server/services/producao.service'
import * as usuariosService from '../../../src/server/services/usuarios.service'

let tmpDir: string
let dbFilePath: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'btfitas-schema-'))
  dbFilePath = path.join(tmpDir, 'dados.db')
})

afterEach(async () => {
  await disconnectDatabase()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('ensureSchema', () => {
  it('cria todas as tabelas esperadas e é idempotente', async () => {
    await connectDatabase(dbFilePath)
    await connectDatabase(dbFilePath)

    const tables = await db().$queryRawUnsafe<{ name: string }[]>(
      "SELECT name FROM sqlite_master WHERE type='table'"
    )
    expect(tables.map((t) => t.name)).toEqual(
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

  it('abre com o Prisma um dados.db gravado pela versão anterior (better-sqlite3 puro)', async () => {
    // Banco no formato exato da v1.x: mesmo DDL, sem o índice único novo,
    // com dados inseridos por SQL direto (booleans como 0/1, datas ISO).
    const legado = new Database(dbFilePath)
    legado.exec(SCHEMA_SQL.slice(0, SCHEMA_SQL.indexOf('-- Garante')))
    legado.exec(`
      INSERT INTO usuarios (nome, login, senha_hash, perfil, ativo) VALUES
        ('Ana', 'ana', 'x', 'financeiro', 1), ('Bob', 'bob', 'x', 'producao', 0);
      INSERT INTO clientes (codigo, nome, cnpj_cpf) VALUES ('7456', 'Thiago Antunes', '477');
      INSERT INTO produtos (codigo, descricao, unidade, valor_unitario_padrao) VALUES ('137', 'FITA PP', 'ROLO', 5.9);
      INSERT INTO pedidos (numero, cliente_id, usuario_id, data_pedido) VALUES (1, 1, 1, '2026-09-12T10:00:00.000Z');
      INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, valor_unitario, valor_total) VALUES (1, 1, 144, 5.9, 849.6);
      INSERT INTO ordens_producao (numero, pedido_item_id, quantidade_solicitada, quantidade_produzida, status, data_abertura)
        VALUES (1, 1, 144, 80, 'em_andamento', '2026-09-12T10:00:00.000Z');
      INSERT INTO apontamentos_producao (op_id, usuario_id, quantidade, data_hora) VALUES (1, 2, 80, '2026-09-12T11:00:00.000Z');
    `)
    legado.close()

    await connectDatabase(dbFilePath)

    const usuarios = await usuariosService.listar()
    expect(usuarios.map((u) => [u.login, u.ativo])).toEqual([
      ['ana', true],
      ['bob', false],
    ])

    const [pedido] = await pedidosService.listar()
    expect(pedido.dataPedido).toBe('2026-09-12T10:00:00.000Z')
    expect(pedido.itens[0].status).toBe('em_producao')

    const op = await producaoService.buscarOp(1)
    expect(op.quantidadeProduzida).toBe(80)
    expect(op.apontamentos).toHaveLength(1)

    // E continua gravando normalmente em cima dos dados antigos.
    await producaoService.criarApontamento({ opId: 1, usuarioId: 1, quantidade: 64 })
    expect((await producaoService.buscarOp(1)).quantidadeProduzida).toBe(144)
  })
})
