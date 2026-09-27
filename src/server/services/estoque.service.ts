import { AppError } from '../errors/AppError'
import { writeTransaction } from '../db/client'
import * as estoqueRepository from '../repositories/estoque.repository'
import * as usuariosRepository from '../repositories/usuarios.repository'
import type {
  EstoqueMovimento,
  ItemAguardandoEntrada,
  ItemEmEstoque,
  CreateMovimentoEstoqueInput,
} from '../../shared/types'
import { idValido, numeroPositivo, textoOpcional } from './validacao'

export async function listarAguardandoEntrada(): Promise<ItemAguardandoEntrada[]> {
  const itens = await estoqueRepository.findAguardandoEntrada()
  return itens.map((item) => ({
    pedidoItemId: item.id,
    pedidoNumero: item.pedido.numero,
    clienteNome: item.pedido.cliente.nome,
    produtoDescricao: item.produto.descricao,
    quantidade: item.quantidade,
    opNumero: item.ordemProducao?.numero ?? 0,
  }))
}

export async function listarEmEstoque(): Promise<ItemEmEstoque[]> {
  const itens = await estoqueRepository.findEmEstoque()
  return itens
    .map((item) => ({
      pedidoItemId: item.id,
      pedidoNumero: item.pedido.numero,
      clienteNome: item.pedido.cliente.nome,
      produtoDescricao: item.produto.descricao,
      quantidade: item.quantidade,
      dataEntrada: item.estoqueMovimentos[0]?.dataHora ?? '',
    }))
    .sort((a, b) => a.dataEntrada.localeCompare(b.dataEntrada))
}

function validarMovimento(input: CreateMovimentoEstoqueInput, operacao: 'entrada' | 'saída') {
  return {
    quantidade: numeroPositivo(input?.quantidade, `Quantidade da ${operacao} precisa ser maior que zero`),
    pedidoItemId: idValido(input.pedidoItemId, 'Item do pedido é obrigatório'),
    usuarioId: idValido(input.usuarioId, 'Usuário é obrigatório'),
    observacao: textoOpcional(input.observacao),
  }
}

export async function registrarEntrada(input: CreateMovimentoEstoqueInput): Promise<EstoqueMovimento> {
  const data = validarMovimento(input, 'entrada')

  return writeTransaction(async (tx) => {
    const item = await estoqueRepository.findPedidoItemComOp(data.pedidoItemId, tx)
    if (!item) throw new AppError('Item de pedido não encontrado', 404)
    if (item.ordemProducao?.status !== 'encerrada') {
      throw new AppError('A OP deste item ainda não foi encerrada', 409)
    }
    if (await estoqueRepository.findMovimento(data.pedidoItemId, 'entrada', tx)) {
      throw new AppError('Entrada já registrada para este item', 409)
    }
    if (!(await usuariosRepository.findById(data.usuarioId, tx))) {
      throw new AppError('Usuário não encontrado', 404)
    }
    return estoqueRepository.createMovimento(
      { ...data, tipo: 'entrada', dataHora: new Date().toISOString() },
      tx
    )
  })
}

export async function registrarSaida(input: CreateMovimentoEstoqueInput): Promise<EstoqueMovimento> {
  const data = validarMovimento(input, 'saída')

  return writeTransaction(async (tx) => {
    if (!(await estoqueRepository.findMovimento(data.pedidoItemId, 'entrada', tx))) {
      throw new AppError('Item ainda não teve entrada confirmada no estoque', 409)
    }
    if (await estoqueRepository.findMovimento(data.pedidoItemId, 'saida', tx)) {
      throw new AppError('Saída já registrada para este item', 409)
    }
    if (!(await usuariosRepository.findById(data.usuarioId, tx))) {
      throw new AppError('Usuário não encontrado', 404)
    }
    return estoqueRepository.createMovimento(
      { ...data, tipo: 'saida', dataHora: new Date().toISOString() },
      tx
    )
  })
}
