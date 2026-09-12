import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { openDatabase } from '../../../../src/main/db/connection'
import { createCliente } from '../../../../src/main/db/repositories/clientes.repo'
import { createProduto } from '../../../../src/main/db/repositories/produtos.repo'
import { createUser } from '../../../../src/main/db/repositories/usuarios.repo'
import { createPedido, listPedidos } from '../../../../src/main/db/repositories/pedidos.repo'

let tmpDir: string
let dbPath: string
let db: ReturnType<typeof openDatabase>
let clienteId: number
let produtoId: number
let usuarioId: number

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'btfitas-pedidos-'))
  dbPath = path.join(tmpDir, 'dados.db')
  db = openDatabase(dbPath)

  const cliente = await createCliente(db, dbPath, {
    codigo: '7456',
    nome: 'Thiago Antunes Distribuidora',
    cnpjCpf: '47736271000173',
  })
  clienteId = cliente.id

  const produto = await createProduto(db, dbPath, {
    codigo: '137',
    descricao: 'FITA PP 45MM X 100MTS TRANSPARENTE',
    unidade: 'ROLO',
    valorUnitarioPadrao: 5.9,
  })
  produtoId = produto.id

  const usuario = await createUser(db, dbPath, {
    nome: 'Ana Financeiro',
    login: 'ana',
    senha: 'senha123',
    perfil: 'financeiro',
  })
  usuarioId = usuario.id
})

afterEach(() => {
  db.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('pedidos.repo', () => {
  it('creates a pedido with items and generates one OP per item', async () => {
    const pedido = await createPedido(db, dbPath, {
      clienteId,
      usuarioId,
      condicaoPagamento: '28 DDL',
      itens: [{ produtoId, quantidade: 144, valorUnitario: 5.9 }],
    })

    expect(pedido.numero).toBe(1)

    const ops = db.prepare('SELECT * FROM ordens_producao').all() as any[]
    expect(ops.length).toBe(1)
    expect(ops[0].quantidade_solicitada).toBe(144)
    expect(ops[0].status).toBe('aberta')

    const itens = db.prepare('SELECT * FROM pedido_itens').all() as any[]
    expect(itens.length).toBe(1)
    expect(itens[0].valor_total).toBeCloseTo(144 * 5.9)
  })

  it('rejects a pedido with no items', async () => {
    await expect(
      createPedido(db, dbPath, { clienteId, usuarioId, itens: [] })
    ).rejects.toThrow('ao menos um item')
  })

  it('assigns sequential numero across multiple pedidos', async () => {
    await createPedido(db, dbPath, { clienteId, usuarioId, itens: [{ produtoId, quantidade: 10, valorUnitario: 5 }] })
    const second = await createPedido(db, dbPath, { clienteId, usuarioId, itens: [{ produtoId, quantidade: 10, valorUnitario: 5 }] })
    expect(second.numero).toBe(2)
  })

  it('reports item status "aberto" when the OP has no production yet', async () => {
    await createPedido(db, dbPath, { clienteId, usuarioId, itens: [{ produtoId, quantidade: 10, valorUnitario: 5 }] })

    const [pedido] = listPedidos(db)
    expect(pedido.itens[0].status).toBe('aberto')
  })

  it('reports item status "em_producao" once some quantity has been produced', async () => {
    await createPedido(db, dbPath, { clienteId, usuarioId, itens: [{ produtoId, quantidade: 10, valorUnitario: 5 }] })
    db.prepare("UPDATE ordens_producao SET quantidade_produzida = 4").run()

    const [pedido] = listPedidos(db)
    expect(pedido.itens[0].status).toBe('em_producao')
  })

  it('reports item status "aguardando_estoque" once the OP is encerrada', async () => {
    await createPedido(db, dbPath, { clienteId, usuarioId, itens: [{ produtoId, quantidade: 10, valorUnitario: 5 }] })
    db.prepare("UPDATE ordens_producao SET quantidade_produzida = 10, status = 'encerrada'").run()

    const [pedido] = listPedidos(db)
    expect(pedido.itens[0].status).toBe('aguardando_estoque')
  })

  it('reports item status "em_estoque" after a stock entrada, then "finalizado" after a saida', async () => {
    await createPedido(db, dbPath, { clienteId, usuarioId, itens: [{ produtoId, quantidade: 10, valorUnitario: 5 }] })
    db.prepare("UPDATE ordens_producao SET quantidade_produzida = 10, status = 'encerrada'").run()

    const pedidoItemId = (db.prepare('SELECT id FROM pedido_itens').get() as any).id
    db.prepare(
      `INSERT INTO estoque_movimentos (pedido_item_id, tipo, quantidade, usuario_id, data_hora) VALUES (?, 'entrada', 10, ?, ?)`
    ).run(pedidoItemId, usuarioId, new Date().toISOString())

    let [pedido] = listPedidos(db)
    expect(pedido.itens[0].status).toBe('em_estoque')

    db.prepare(
      `INSERT INTO estoque_movimentos (pedido_item_id, tipo, quantidade, usuario_id, data_hora) VALUES (?, 'saida', 10, ?, ?)`
    ).run(pedidoItemId, usuarioId, new Date().toISOString())

    ;[pedido] = listPedidos(db)
    expect(pedido.itens[0].status).toBe('finalizado')
  })

  it('includes clienteNome and produtoDescricao in listPedidos', async () => {
    await createPedido(db, dbPath, { clienteId, usuarioId, itens: [{ produtoId, quantidade: 10, valorUnitario: 5 }] })

    const [pedido] = listPedidos(db)
    expect(pedido.clienteNome).toBe('Thiago Antunes Distribuidora')
    expect(pedido.itens[0].produtoDescricao).toBe('FITA PP 45MM X 100MTS TRANSPARENTE')
  })
})
