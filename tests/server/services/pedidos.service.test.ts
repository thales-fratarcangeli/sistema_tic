import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '../../../src/server/db/client'
import * as pedidosService from '../../../src/server/services/pedidos.service'
import { abrirBancoDeTeste, fecharBancoDeTeste, criarCadastrosBasicos } from '../helpers'

let tmpDir: string
let clienteId: number
let produtoId: number
let usuarioId: number

beforeEach(async () => {
  tmpDir = await abrirBancoDeTeste('pedidos')
  const { cliente, produto, financeiro } = await criarCadastrosBasicos()
  clienteId = cliente.id
  produtoId = produto.id
  usuarioId = financeiro.id
})

afterEach(() => fecharBancoDeTeste(tmpDir))

function pedidoSimples() {
  return pedidosService.criar({
    clienteId,
    usuarioId,
    itens: [{ produtoId, quantidade: 10, valorUnitario: 5 }],
  })
}

async function statusDoPrimeiroItem() {
  const [pedido] = await pedidosService.listar()
  return pedido.itens[0].status
}

describe('pedidos.service', () => {
  it('cria o pedido com itens e gera uma OP por item', async () => {
    const pedido = await pedidosService.criar({
      clienteId,
      usuarioId,
      condicaoPagamento: '28 DDL',
      itens: [
        { produtoId, quantidade: 144, valorUnitario: 5.9 },
        { produtoId, quantidade: 20, valorUnitario: 6 },
      ],
    })
    expect(pedido.numero).toBe(1)
    expect(pedido.condicaoPagamento).toBe('28 DDL')

    const ops = await db().ordemProducao.findMany({ orderBy: { id: 'asc' } })
    expect(ops.map((op) => op.quantidadeSolicitada)).toEqual([144, 20])
    expect(ops.map((op) => op.numero)).toEqual([1, 2])
    expect(ops.every((op) => op.status === 'aberta')).toBe(true)

    const itens = await db().pedidoItem.findMany({ orderBy: { id: 'asc' } })
    expect(itens[0].valorTotal).toBeCloseTo(144 * 5.9)
  })

  it('rejeita pedido sem itens', async () => {
    await expect(pedidosService.criar({ clienteId, usuarioId, itens: [] })).rejects.toThrow('ao menos um item')
  })

  it('rejeita pedido de cliente ou produto inexistente sem gravar nada', async () => {
    await expect(
      pedidosService.criar({ clienteId: 999, usuarioId, itens: [{ produtoId, quantidade: 1, valorUnitario: 1 }] })
    ).rejects.toMatchObject({ statusCode: 404, message: 'Cliente não encontrado' })
    await expect(
      pedidosService.criar({ clienteId, usuarioId, itens: [{ produtoId: 999, quantidade: 1, valorUnitario: 1 }] })
    ).rejects.toMatchObject({ statusCode: 404 })

    expect(await db().pedido.count()).toBe(0)
    expect(await db().ordemProducao.count()).toBe(0)
  })

  it('numera os pedidos em sequência', async () => {
    await pedidoSimples()
    const segundo = await pedidoSimples()
    expect(segundo.numero).toBe(2)
  })

  it('status do item: aberto → em_producao → aguardando_estoque → em_estoque → finalizado', async () => {
    await pedidoSimples()
    expect(await statusDoPrimeiroItem()).toBe('aberto')

    await db().ordemProducao.updateMany({ data: { quantidadeProduzida: 4 } })
    expect(await statusDoPrimeiroItem()).toBe('em_producao')

    await db().ordemProducao.updateMany({ data: { quantidadeProduzida: 10, status: 'encerrada' } })
    expect(await statusDoPrimeiroItem()).toBe('aguardando_estoque')

    const item = await db().pedidoItem.findFirstOrThrow()
    const movimento = { pedidoItemId: item.id, quantidade: 10, usuarioId, dataHora: new Date().toISOString() }
    await db().estoqueMovimento.create({ data: { ...movimento, tipo: 'entrada' } })
    expect(await statusDoPrimeiroItem()).toBe('em_estoque')

    await db().estoqueMovimento.create({ data: { ...movimento, tipo: 'saida' } })
    expect(await statusDoPrimeiroItem()).toBe('finalizado')
  })

  it('inclui clienteNome e produtoDescricao na listagem', async () => {
    await pedidoSimples()
    const [pedido] = await pedidosService.listar()
    expect(pedido.clienteNome).toBe('Thiago Antunes Distribuidora')
    expect(pedido.itens[0].produtoDescricao).toBe('FITA PP 45MM X 100MTS TRANSPARENTE')
    expect(pedido.itens[0].opNumero).toBe(1)
  })
})
