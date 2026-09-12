import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { openDatabase } from '../../../../src/main/db/connection'
import { createCliente } from '../../../../src/main/db/repositories/clientes.repo'
import { createProduto } from '../../../../src/main/db/repositories/produtos.repo'
import { createUser } from '../../../../src/main/db/repositories/usuarios.repo'
import { createPedido } from '../../../../src/main/db/repositories/pedidos.repo'
import {
  listOpsAbertas,
  createApontamento,
  encerrarOp,
} from '../../../../src/main/db/repositories/producao.repo'

let tmpDir: string
let dbPath: string
let db: ReturnType<typeof openDatabase>
let usuarioId: number
let opId: number

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'btfitas-producao-'))
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
  const usuarioFinanceiro = await createUser(db, dbPath, {
    nome: 'Ana Financeiro',
    login: 'ana',
    senha: 'x',
    perfil: 'financeiro',
  })
  const usuarioProducao = await createUser(db, dbPath, {
    nome: 'Bob Producao',
    login: 'bob',
    senha: 'x',
    perfil: 'producao',
  })
  usuarioId = usuarioProducao.id

  await createPedido(db, dbPath, {
    clienteId: cliente.id,
    usuarioId: usuarioFinanceiro.id,
    itens: [{ produtoId: produto.id, quantidade: 144, valorUnitario: 5.9 }],
  })
  opId = (db.prepare('SELECT id FROM ordens_producao').get() as any).id
})

afterEach(() => {
  db.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('producao.repo', () => {
  it('lists open OPs with pedido/cliente/produto context', () => {
    const ops = listOpsAbertas(db)
    expect(ops.length).toBe(1)
    expect(ops[0].clienteNome).toBe('Thiago Antunes Distribuidora')
    expect(ops[0].produtoDescricao).toBe('FITA PP 45MM X 100MTS TRANSPARENTE')
    expect(ops[0].quantidadeSolicitada).toBe(144)
    expect(ops[0].status).toBe('aberta')
  })

  it('accumulates quantidade_produzida across multiple apontamentos and flips status to em_andamento', async () => {
    await createApontamento(db, dbPath, { opId, usuarioId, quantidade: 80 })
    let ops = listOpsAbertas(db)
    expect(ops[0].quantidadeProduzida).toBe(80)
    expect(ops[0].status).toBe('em_andamento')

    await createApontamento(db, dbPath, { opId, usuarioId, quantidade: 64 })
    ops = listOpsAbertas(db)
    expect(ops[0].quantidadeProduzida).toBe(144)
    expect(ops[0].status).toBe('em_andamento')
  })

  it('rejects an apontamento with quantidade <= 0', async () => {
    await expect(createApontamento(db, dbPath, { opId, usuarioId, quantidade: 0 })).rejects.toThrow(
      'maior que zero'
    )
  })

  it('encerrarOp marks the OP as encerrada and removes it from the open queue', async () => {
    await createApontamento(db, dbPath, { opId, usuarioId, quantidade: 144 })
    await encerrarOp(db, dbPath, opId)

    const ops = listOpsAbertas(db)
    expect(ops.length).toBe(0)

    const row = db.prepare('SELECT status, data_encerramento FROM ordens_producao WHERE id = ?').get(opId) as any
    expect(row.status).toBe('encerrada')
    expect(row.data_encerramento).not.toBeNull()
  })

  it('rejects an apontamento on an OP that is already encerrada', async () => {
    await encerrarOp(db, dbPath, opId)
    await expect(createApontamento(db, dbPath, { opId, usuarioId, quantidade: 10 })).rejects.toThrow(
      'já está encerrada'
    )
  })

  it('rejects encerrarOp on an OP that is already encerrada', async () => {
    await encerrarOp(db, dbPath, opId)
    await expect(encerrarOp(db, dbPath, opId)).rejects.toThrow('não encontrada ou já encerrada')
  })
})
