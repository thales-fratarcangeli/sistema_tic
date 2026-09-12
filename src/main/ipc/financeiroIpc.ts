import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import { IpcChannels } from '../../shared/ipc-channels'
import type { CreateClienteInput, CreateProdutoInput, CreatePedidoInput } from '../../shared/types'
import { createCliente, listClientes } from '../db/repositories/clientes.repo'
import { createProduto, listProdutos } from '../db/repositories/produtos.repo'
import { createPedido, listPedidos } from '../db/repositories/pedidos.repo'

export function registerFinanceiroIpc(db: Database.Database, dbFilePath: string) {
  ipcMain.handle(IpcChannels.CLIENTES_CREATE, (_event, input: CreateClienteInput) =>
    createCliente(db, dbFilePath, input)
  )
  ipcMain.handle(IpcChannels.CLIENTES_LIST, () => listClientes(db))

  ipcMain.handle(IpcChannels.PRODUTOS_CREATE, (_event, input: CreateProdutoInput) =>
    createProduto(db, dbFilePath, input)
  )
  ipcMain.handle(IpcChannels.PRODUTOS_LIST, () => listProdutos(db))

  ipcMain.handle(IpcChannels.PEDIDOS_CREATE, (_event, input: CreatePedidoInput) =>
    createPedido(db, dbFilePath, input)
  )
  ipcMain.handle(IpcChannels.PEDIDOS_LIST, () => listPedidos(db))
}
