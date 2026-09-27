import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { connectDatabase, disconnectDatabase, db } from '../../src/server/db/client'
import * as clientesService from '../../src/server/services/clientes.service'
import * as produtosService from '../../src/server/services/produtos.service'
import * as usuariosService from '../../src/server/services/usuarios.service'
import * as pedidosService from '../../src/server/services/pedidos.service'
import type { Perfil } from '../../src/shared/types'

/** Abre um dados.db novo numa pasta temporária e devolve a pasta. */
export async function abrirBancoDeTeste(prefixo: string): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `btfitas-${prefixo}-`))
  await connectDatabase(path.join(tmpDir, 'dados.db'))
  return tmpDir
}

export async function fecharBancoDeTeste(tmpDir: string): Promise<void> {
  await disconnectDatabase()
  fs.rmSync(tmpDir, { recursive: true, force: true })
}

export function criarUsuario(login: string, perfil: Perfil, senha = 'x') {
  return usuariosService.criar({ nome: `Usuário ${login}`, login, senha, perfil })
}

/** Cliente, produto e usuário financeiro de exemplo, prontos para um pedido. */
export async function criarCadastrosBasicos() {
  const cliente = await clientesService.criar({
    codigo: '7456',
    nome: 'Thiago Antunes Distribuidora',
    cnpjCpf: '47736271000173',
  })
  const produto = await produtosService.criar({
    codigo: '137',
    descricao: 'FITA PP 45MM X 100MTS TRANSPARENTE',
    unidade: 'ROLO',
    valorUnitarioPadrao: 5.9,
  })
  const financeiro = await criarUsuario('ana', 'financeiro')
  return { cliente, produto, financeiro }
}

/** Lança um pedido de 1 item e devolve os ids do item e da OP gerada. */
export async function criarPedidoComUmItem(quantidade: number) {
  const { cliente, produto, financeiro } = await criarCadastrosBasicos()
  await pedidosService.criar({
    clienteId: cliente.id,
    usuarioId: financeiro.id,
    itens: [{ produtoId: produto.id, quantidade, valorUnitario: 5.9 }],
  })
  const [pedido] = await pedidosService.listar()
  const op = await db().ordemProducao.findFirstOrThrow()
  return { pedido, pedidoItemId: pedido.itens[0].id, opId: op.id, financeiro }
}
