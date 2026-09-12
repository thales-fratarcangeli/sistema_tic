import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '../src/shared/ipc-channels'
import type {
  Usuario,
  Cliente,
  Produto,
  Pedido,
  PedidoComItens,
  CreateClienteInput,
  CreateProdutoInput,
  CreatePedidoInput,
} from '../src/shared/types'

contextBridge.exposeInMainWorld('api', {
  getDbFolderPath: (): Promise<{ dbFolderPath: string } | null> =>
    ipcRenderer.invoke('config:get'),
  setDbFolderPath: (dbFolderPath: string): Promise<void> =>
    ipcRenderer.invoke('config:set', dbFolderPath),
  login: (login: string, senha: string): Promise<Usuario | null> =>
    ipcRenderer.invoke(IpcChannels.AUTH_LOGIN, login, senha),
  ensureSeedAdmin: (): Promise<void> => ipcRenderer.invoke('auth:ensureSeedAdmin'),

  createCliente: (input: CreateClienteInput): Promise<Cliente> =>
    ipcRenderer.invoke(IpcChannels.CLIENTES_CREATE, input),
  listClientes: (): Promise<Cliente[]> => ipcRenderer.invoke(IpcChannels.CLIENTES_LIST),

  createProduto: (input: CreateProdutoInput): Promise<Produto> =>
    ipcRenderer.invoke(IpcChannels.PRODUTOS_CREATE, input),
  listProdutos: (): Promise<Produto[]> => ipcRenderer.invoke(IpcChannels.PRODUTOS_LIST),

  createPedido: (input: CreatePedidoInput): Promise<Pedido> =>
    ipcRenderer.invoke(IpcChannels.PEDIDOS_CREATE, input),
  listPedidos: (): Promise<PedidoComItens[]> => ipcRenderer.invoke(IpcChannels.PEDIDOS_LIST),
})
