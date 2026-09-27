import { AppError } from '../errors/AppError'
import { writeTransaction } from '../db/client'
import * as pedidosRepository from '../repositories/pedidos.repository'
import * as producaoRepository from '../repositories/producao.repository'
import * as clientesRepository from '../repositories/clientes.repository'
import * as produtosRepository from '../repositories/produtos.repository'
import * as usuariosRepository from '../repositories/usuarios.repository'
import type {
  Pedido,
  PedidoComItens,
  CreatePedidoInput,
  StatusItemPedido,
  StatusOrdemProducao,
} from '../../shared/types'
import { idValido, numeroPositivo, textoOpcional } from './validacao'

/**
 * Status de um item de pedido, do mais adiantado para o mais atrasado:
 * saiu do estoque → finalizado; entrou no estoque → em_estoque; OP
 * encerrada → aguardando_estoque; já teve produção → em_producao; senão
 * aberto.
 */
export function statusDoItem(
  op: { status: string; quantidadeProduzida: number } | null,
  tiposDeMovimento: string[]
): StatusItemPedido {
  if (tiposDeMovimento.includes('saida')) return 'finalizado'
  if (tiposDeMovimento.includes('entrada')) return 'em_estoque'
  if (op?.status === 'encerrada') return 'aguardando_estoque'
  if (op && op.quantidadeProduzida > 0) return 'em_producao'
  return 'aberto'
}

export async function listar(): Promise<PedidoComItens[]> {
  const pedidos = await pedidosRepository.findAllComItens()
  return pedidos.map(({ cliente, itens, ...pedido }) => ({
    ...pedido,
    clienteNome: cliente.nome,
    itens: itens.map((item) => ({
      id: item.id,
      produtoId: item.produtoId,
      produtoDescricao: item.produto.descricao,
      quantidade: item.quantidade,
      valorUnitario: item.valorUnitario,
      valorTotal: item.valorTotal,
      opNumero: item.ordemProducao?.numero ?? 0,
      opStatus: (item.ordemProducao?.status ?? 'aberta') as StatusOrdemProducao,
      status: statusDoItem(
        item.ordemProducao,
        item.estoqueMovimentos.map((m) => m.tipo)
      ),
    })),
  }))
}

/**
 * Lança um pedido e gera, na mesma transação, uma Ordem de Produção por
 * item. Um pedido só está completo quando todos os itens têm OP — se a
 * criação de qualquer OP falhar, o pedido inteiro é desfeito.
 */
export async function criar(input: CreatePedidoInput): Promise<Pedido> {
  if (!Array.isArray(input?.itens) || input.itens.length === 0) {
    throw new AppError('Pedido precisa de ao menos um item', 400)
  }
  const clienteId = idValido(input.clienteId, 'Cliente do pedido é obrigatório')
  const usuarioId = idValido(input.usuarioId, 'Usuário do pedido é obrigatório')
  const itens = input.itens.map((item) => {
    const valorUnitario = item?.valorUnitario
    if (typeof valorUnitario !== 'number' || !Number.isFinite(valorUnitario) || valorUnitario < 0) {
      throw new AppError('Valor unitário do item precisa ser maior ou igual a zero', 400)
    }
    return {
      produtoId: idValido(item.produtoId, 'Produto do item é obrigatório'),
      quantidade: numeroPositivo(item.quantidade, 'Quantidade do item precisa ser maior que zero'),
      valorUnitario,
    }
  })

  return writeTransaction(async (tx) => {
    if (!(await clientesRepository.findById(clienteId, tx))) {
      throw new AppError('Cliente não encontrado', 404)
    }
    if (!(await usuariosRepository.findById(usuarioId, tx))) {
      throw new AppError('Usuário não encontrado', 404)
    }
    for (const item of itens) {
      if (!(await produtosRepository.findById(item.produtoId, tx))) {
        throw new AppError(`Produto ${item.produtoId} não encontrado`, 404)
      }
    }

    const dataPedido = new Date().toISOString()
    const pedido = await pedidosRepository.create(
      {
        numero: await pedidosRepository.proximoNumero(tx),
        clienteId,
        usuarioId,
        condicaoPagamento: textoOpcional(input.condicaoPagamento),
        dataPedido,
        prazoEntrega: textoOpcional(input.prazoEntrega),
        observacoes: textoOpcional(input.observacoes),
      },
      tx
    )

    for (const item of itens) {
      const pedidoItem = await pedidosRepository.createItem(
        { pedidoId: pedido.id, ...item, valorTotal: item.quantidade * item.valorUnitario },
        tx
      )
      await producaoRepository.createOp(
        {
          numero: await producaoRepository.proximoNumeroOp(tx),
          pedidoItemId: pedidoItem.id,
          quantidadeSolicitada: item.quantidade,
          dataAbertura: dataPedido,
        },
        tx
      )
    }

    return pedido
  })
}
