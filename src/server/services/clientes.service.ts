import { AppError } from '../errors/AppError'
import { writeTransaction } from '../db/client'
import * as clientesRepository from '../repositories/clientes.repository'
import type { Cliente, CreateClienteInput } from '../../shared/types'
import { textoObrigatorio, textoOpcional } from './validacao'

export function listar(): Promise<Cliente[]> {
  return clientesRepository.findAll()
}

export async function criar(input: CreateClienteInput): Promise<Cliente> {
  const data: CreateClienteInput = {
    codigo: textoObrigatorio(input?.codigo, 'Código do cliente é obrigatório'),
    nome: textoObrigatorio(input?.nome, 'Nome do cliente é obrigatório'),
    cnpjCpf: textoObrigatorio(input?.cnpjCpf, 'CNPJ/CPF do cliente é obrigatório'),
    inscricaoRg: textoOpcional(input.inscricaoRg),
    endereco: textoOpcional(input.endereco),
    bairro: textoOpcional(input.bairro),
    cidade: textoOpcional(input.cidade),
    cep: textoOpcional(input.cep),
    telefone: textoOpcional(input.telefone),
    celular: textoOpcional(input.celular),
  }

  return writeTransaction(async (tx) => {
    if (await clientesRepository.findByCodigo(data.codigo, tx)) {
      throw new AppError('Já existe um cliente com esse código', 409)
    }
    return clientesRepository.create(data, tx)
  })
}
