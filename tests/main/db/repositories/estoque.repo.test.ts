import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { openDatabase } from '../../../../src/main/db/connection'
import { createCliente } from '../../../../src/main/db/repositories/clientes.repo'
import { createProduto } from '../../../../src/main/db/repositories/produtos.repo'
import { createUser } from '../../../../src/main/db/repositories/usuarios.repo'
import { createPedido } from '../../../../src/main/db/repositories/pedidos.repo'
import { createApontamento, encerrarOp } from '../../../../src/main/db/repositories/producao.repo'
import {
  listAguardandoEntrada,
  listEmEstoque,
  registrarEntrada,
  registrarSaida,
} from '../../../../src/main/db/repositories/estoque.repo'

let tmpDir: string
let dbPath: string
let db: ReturnType<typeof openDatabase>
let usuarioId: number
let pedidoItemId: number
let opId: number

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'btfitas-estoque-'))
  dbPath = path.join(tmpDir, 'dados.db')
  db = openDatabase(dbPath)

  const cliente = await createCliente(db, dbPath, {
    codigo: '7456',
    nome: 'Thiago Antunes Distribuidora',
    cnpjCpf: '47736271000173',
  })
  const produto = await createProduto(db, dbPath, {
    codigo: '137',
    descricao: 'FITA PP 45MM X 100MTS TRANSPARENTE',
    unidade: 'ROLO',
    valorUnitarioPadrao: 5.9,
  })
  const usuario = await createUser(db, dbPath, {
    nome: 'Carla Estoque',
    login: 'carla',
    senha: 'x',
    perfil: 'estoque',
  })
  usuarioId = usuario.id

  await createPedido(db, dbPath, {
    clienteId: cliente.id,
    usuarioId: usuario.id,
    itens: [{ produtoId: produto.id, quantidade: 10, valorUnitario: 5 }],
  })
  pedidoItemId = (db.prepare('SELECT id FROM pedido_itens').get() as any).id
  opId = (db.prepare('SELECT id FROM ordens_producao').get() as any).id
})

afterEach(() => {
  db.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('estoque.repo', () => {
  it('lists items awaiting entrada only once their OP is encerrada', async () => {
    expect(listAguardandoEntrada(db).length).toBe(0)

    await createApontamento(db, dbPath, { opId, usuarioId, quantidade: 10 })
    await encerrarOp(db, dbPath, opId)

    const aguardando = listAguardandoEntrada(db)
    expect(aguardando.length).toBe(1)
    expect(aguardando[0].clienteNome).toBe('Thiago Antunes Distribuidora')
    expect(aguardando[0].quantidade).toBe(10)
  })

  it('registrarEntrada moves the item from aguardando to em_estoque', async () => {
    await createApontamento(db, dbPath, { opId, usuarioId, quantidade: 10 })
    await encerrarOp(db, dbPath, opId)

    await registrarEntrada(db, dbPath, { pedidoItemId, usuarioId, quantidade: 10 })

    expect(listAguardandoEntrada(db).length).toBe(0)
    const emEstoque = listEmEstoque(db)
    expect(emEstoque.length).toBe(1)
    expect(emEstoque[0].produtoDescricao).toBe('FITA PP 45MM X 100MTS TRANSPARENTE')
  })

  it('rejects a duplicate entrada for the same item', async () => {
    await createApontamento(db, dbPath, { opId, usuarioId, quantidade: 10 })
    await encerrarOp(db, dbPath, opId)
    await registrarEntrada(db, dbPath, { pedidoItemId, usuarioId, quantidade: 10 })

    await expect(
      registrarEntrada(db, dbPath, { pedidoItemId, usuarioId, quantidade: 10 })
    ).rejects.toThrow('já registrada')
  })

  it('registrarSaida requires a prior entrada', async () => {
    await expect(
      registrarSaida(db, dbPath, { pedidoItemId, usuarioId, quantidade: 10 })
    ).rejects.toThrow('não teve entrada')
  })

  it('registrarSaida moves the item out of em_estoque and rejects a second saida', async () => {
    await createApontamento(db, dbPath, { opId, usuarioId, quantidade: 10 })
    await encerrarOp(db, dbPath, opId)
    await registrarEntrada(db, dbPath, { pedidoItemId, usuarioId, quantidade: 10 })

    await registrarSaida(db, dbPath, { pedidoItemId, usuarioId, quantidade: 10 })

    expect(listEmEstoque(db).length).toBe(0)
    await expect(
      registrarSaida(db, dbPath, { pedidoItemId, usuarioId, quantidade: 10 })
    ).rejects.toThrow('já registrada')
  })
})
