import { AppError } from '../errors/AppError'
import { writeTransaction } from '../db/client'
import * as produtosRepository from '../repositories/produtos.repository'
import type { Produto, CreateProdutoInput } from '../../shared/types'
import { textoObrigatorio } from './validacao'

export function listar(): Promise<Produto[]> {
  return produtosRepository.findAll()
}

export async function criar(input: CreateProdutoInput): Promise<Produto> {
  const valor = input?.valorUnitarioPadrao
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0) {
    throw new AppError('Valor unitário padrão precisa ser um número maior ou igual a zero', 400)
  }
  const data: CreateProdutoInput = {
    codigo: textoObrigatorio(input.codigo, 'Código do produto é obrigatório'),
    descricao: textoObrigatorio(input.descricao, 'Descrição do produto é obrigatória'),
    unidade: textoObrigatorio(input.unidade, 'Unidade do produto é obrigatória'),
    valorUnitarioPadrao: valor,
  }

  return writeTransaction(async (tx) => {
    if (await produtosRepository.findByCodigo(data.codigo, tx)) {
      throw new AppError('Já existe um produto com esse código', 409)
    }
    return produtosRepository.create(data, tx)
  })
}
