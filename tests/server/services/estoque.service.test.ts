import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as producaoService from '../../../src/server/services/producao.service'
import * as estoqueService from '../../../src/server/services/estoque.service'
import { abrirBancoDeTeste, fecharBancoDeTeste, criarPedidoComUmItem, criarUsuario } from '../helpers'

let tmpDir: string
let usuarioId: number
let pedidoItemId: number
let opId: number

beforeEach(async () => {
  tmpDir = await abrirBancoDeTeste('estoque')
  ;({ pedidoItemId, opId } = await criarPedidoComUmItem(10))
  usuarioId = (await criarUsuario('carla', 'estoque')).id
})

afterEach(() => fecharBancoDeTeste(tmpDir))

async function produzirEEncerrar() {
  await producaoService.criarApontamento({ opId, usuarioId, quantidade: 10 })
  await producaoService.encerrarOp(opId)
}

describe('estoque.service', () => {
  it('lista itens aguardando entrada só depois que a OP é encerrada', async () => {
    expect(await estoqueService.listarAguardandoEntrada()).toHaveLength(0)

    await produzirEEncerrar()

    const aguardando = await estoqueService.listarAguardandoEntrada()
    expect(aguardando.length).toBe(1)
    expect(aguardando[0].clienteNome).toBe('Thiago Antunes Distribuidora')
    expect(aguardando[0].quantidade).toBe(10)
    expect(aguardando[0].opNumero).toBe(1)
  })

  it('registrarEntrada move o item de aguardando para em estoque', async () => {
    await produzirEEncerrar()
    await estoqueService.registrarEntrada({ pedidoItemId, usuarioId, quantidade: 10 })

    expect(await estoqueService.listarAguardandoEntrada()).toHaveLength(0)
    const emEstoque = await estoqueService.listarEmEstoque()
    expect(emEstoque.length).toBe(1)
    expect(emEstoque[0].produtoDescricao).toBe('FITA PP 45MM X 100MTS TRANSPARENTE')
    expect(emEstoque[0].dataEntrada).not.toBe('')
  })

  it('rejeita entrada de item cuja OP ainda não foi encerrada', async () => {
    await expect(
      estoqueService.registrarEntrada({ pedidoItemId, usuarioId, quantidade: 10 })
    ).rejects.toMatchObject({ statusCode: 409, message: 'A OP deste item ainda não foi encerrada' })
  })

  it('rejeita entrada duplicada para o mesmo item', async () => {
    await produzirEEncerrar()
    await estoqueService.registrarEntrada({ pedidoItemId, usuarioId, quantidade: 10 })

    await expect(
      estoqueService.registrarEntrada({ pedidoItemId, usuarioId, quantidade: 10 })
    ).rejects.toThrow('já registrada')
  })

  it('registrarSaida exige uma entrada anterior', async () => {
    await expect(
      estoqueService.registrarSaida({ pedidoItemId, usuarioId, quantidade: 10 })
    ).rejects.toThrow('não teve entrada')
  })

  it('registrarSaida tira o item do estoque e rejeita uma segunda saída', async () => {
    await produzirEEncerrar()
    await estoqueService.registrarEntrada({ pedidoItemId, usuarioId, quantidade: 10 })

    await estoqueService.registrarSaida({ pedidoItemId, usuarioId, quantidade: 10 })

    expect(await estoqueService.listarEmEstoque()).toHaveLength(0)
    await expect(
      estoqueService.registrarSaida({ pedidoItemId, usuarioId, quantidade: 10 })
    ).rejects.toThrow('já registrada')
  })
})
