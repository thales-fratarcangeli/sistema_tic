import { AppError } from '../errors/AppError'
import { writeTransaction } from '../db/client'
import * as producaoRepository from '../repositories/producao.repository'
import * as usuariosRepository from '../repositories/usuarios.repository'
import type {
  OpComContexto,
  OpDetalhada,
  OrdemProducao,
  ApontamentoProducao,
  CreateApontamentoInput,
} from '../../shared/types'
import { idValido, numeroPositivo, textoOpcional } from './validacao'

type OpComInclude = NonNullable<Awaited<ReturnType<typeof producaoRepository.findOpComApontamentos>>>

function toOpComContexto({ pedidoItem, ...op }: Omit<OpComInclude, 'apontamentos'>): OpComContexto {
  return {
    ...op,
    pedidoNumero: pedidoItem.pedido.numero,
    clienteNome: pedidoItem.pedido.cliente.nome,
    produtoDescricao: pedidoItem.produto.descricao,
  }
}

export async function listarOpsAbertas(): Promise<OpComContexto[]> {
  const ops = await producaoRepository.findOpsAbertas()
  return ops.map(toOpComContexto)
}

export async function buscarOp(id: number): Promise<OpDetalhada> {
  const op = await producaoRepository.findOpComApontamentos(id)
  if (!op) throw new AppError('OP não encontrada', 404)
  const { apontamentos, ...resto } = op
  return { ...toOpComContexto(resto), apontamentos }
}

export async function listarApontamentos(opId: number): Promise<ApontamentoProducao[]> {
  if (!(await producaoRepository.findOpById(opId))) throw new AppError('OP não encontrada', 404)
  return producaoRepository.findApontamentosDaOp(opId)
}

/**
 * Registra uma produção parcial numa OP. As checagens de OP (existe? já
 * encerrada?) rodam dentro da transação, depois do lock, para que duas
 * máquinas não consigam apontar numa OP que acabou de ser encerrada.
 */
export async function criarApontamento(input: CreateApontamentoInput): Promise<ApontamentoProducao> {
  const quantidade = numeroPositivo(input?.quantidade, 'Quantidade do apontamento precisa ser maior que zero')
  const opId = idValido(input.opId, 'OP do apontamento é obrigatória')
  const usuarioId = idValido(input.usuarioId, 'Usuário do apontamento é obrigatório')

  return writeTransaction(async (tx) => {
    const op = await producaoRepository.findOpById(opId, tx)
    if (!op) throw new AppError('OP não encontrada', 404)
    if (op.status === 'encerrada') throw new AppError('OP já está encerrada', 409)
    if (!(await usuariosRepository.findById(usuarioId, tx))) {
      throw new AppError('Usuário não encontrado', 404)
    }

    const apontamento = await producaoRepository.createApontamento(
      {
        opId,
        usuarioId,
        quantidade,
        dataHora: new Date().toISOString(),
        observacao: textoOpcional(input.observacao),
      },
      tx
    )
    await producaoRepository.incrementarProducao(
      opId,
      quantidade,
      op.status === 'aberta' ? 'em_andamento' : op.status,
      tx
    )
    return apontamento
  })
}

export function encerrarOp(id: number): Promise<OrdemProducao> {
  return writeTransaction(async (tx) => {
    const op = await producaoRepository.findOpById(id, tx)
    if (!op) throw new AppError('OP não encontrada', 404)
    if (op.status === 'encerrada') throw new AppError('OP já está encerrada', 409)
    return producaoRepository.encerrarOp(id, new Date().toISOString(), tx)
  })
}
