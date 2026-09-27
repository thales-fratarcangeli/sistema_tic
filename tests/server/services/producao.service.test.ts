import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as producaoService from '../../../src/server/services/producao.service'
import { abrirBancoDeTeste, fecharBancoDeTeste, criarPedidoComUmItem, criarUsuario } from '../helpers'

let tmpDir: string
let opId: number
let usuarioId: number

beforeEach(async () => {
  tmpDir = await abrirBancoDeTeste('producao')
  ;({ opId } = await criarPedidoComUmItem(144))
  usuarioId = (await criarUsuario('bob', 'producao')).id
})

afterEach(() => fecharBancoDeTeste(tmpDir))

describe('producao.service', () => {
  it('lista as OPs abertas com contexto de pedido, cliente e produto', async () => {
    const ops = await producaoService.listarOpsAbertas()
    expect(ops.length).toBe(1)
    expect(ops[0].pedidoNumero).toBe(1)
    expect(ops[0].clienteNome).toBe('Thiago Antunes Distribuidora')
    expect(ops[0].produtoDescricao).toBe('FITA PP 45MM X 100MTS TRANSPARENTE')
    expect(ops[0].quantidadeSolicitada).toBe(144)
    expect(ops[0].status).toBe('aberta')
  })

  it('acumula quantidadeProduzida em múltiplos apontamentos e muda o status para em_andamento', async () => {
    await producaoService.criarApontamento({ opId, usuarioId, quantidade: 80 })
    let [op] = await producaoService.listarOpsAbertas()
    expect(op.quantidadeProduzida).toBe(80)
    expect(op.status).toBe('em_andamento')

    await producaoService.criarApontamento({ opId, usuarioId, quantidade: 64 })
    ;[op] = await producaoService.listarOpsAbertas()
    expect(op.quantidadeProduzida).toBe(144)
    expect(op.status).toBe('em_andamento')
  })

  it('buscarOp devolve a OP com seus apontamentos (relação 1:N)', async () => {
    await producaoService.criarApontamento({ opId, usuarioId, quantidade: 80, observacao: 'turno manhã' })
    await producaoService.criarApontamento({ opId, usuarioId, quantidade: 64 })

    const op = await producaoService.buscarOp(opId)
    expect(op.apontamentos.map((a) => a.quantidade)).toEqual([80, 64])
    expect(op.apontamentos[0].observacao).toBe('turno manhã')
    expect(await producaoService.listarApontamentos(opId)).toHaveLength(2)
  })

  it('rejeita apontamento com quantidade menor ou igual a zero (400)', async () => {
    await expect(producaoService.criarApontamento({ opId, usuarioId, quantidade: 0 })).rejects.toMatchObject({
      message: 'Quantidade do apontamento precisa ser maior que zero',
      statusCode: 400,
    })
  })

  it('rejeita apontamento em OP inexistente (404)', async () => {
    await expect(
      producaoService.criarApontamento({ opId: 9999, usuarioId, quantidade: 10 })
    ).rejects.toMatchObject({ message: 'OP não encontrada', statusCode: 404 })
  })

  it('rejeita apontamento de usuário inexistente (404)', async () => {
    await expect(
      producaoService.criarApontamento({ opId, usuarioId: 9999, quantidade: 10 })
    ).rejects.toMatchObject({ message: 'Usuário não encontrado', statusCode: 404 })
  })

  it('encerrarOp marca a OP como encerrada e a tira da fila', async () => {
    await producaoService.criarApontamento({ opId, usuarioId, quantidade: 144 })
    const op = await producaoService.encerrarOp(opId)

    expect(op.status).toBe('encerrada')
    expect(op.dataEncerramento).not.toBeNull()
    expect(await producaoService.listarOpsAbertas()).toHaveLength(0)
  })

  it('rejeita apontamento em OP já encerrada (409)', async () => {
    await producaoService.encerrarOp(opId)
    await expect(producaoService.criarApontamento({ opId, usuarioId, quantidade: 10 })).rejects.toMatchObject({
      message: 'OP já está encerrada',
      statusCode: 409,
    })
  })

  it('rejeita encerrar uma OP já encerrada (409) ou inexistente (404)', async () => {
    await producaoService.encerrarOp(opId)
    await expect(producaoService.encerrarOp(opId)).rejects.toMatchObject({ statusCode: 409 })
    await expect(producaoService.encerrarOp(9999)).rejects.toMatchObject({ statusCode: 404 })
  })
})
