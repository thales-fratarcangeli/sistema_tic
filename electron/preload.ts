import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '../src/shared/ipc-channels'
import type {
  Usuario,
  Perfil,
  CreateUsuarioInput,
  Cliente,
  Produto,
  Pedido,
  PedidoComItens,
  CreateClienteInput,
  CreateProdutoInput,
  CreatePedidoInput,
  OpComContexto,
  CreateApontamentoInput,
  ApontamentoProducao,
  ItemAguardandoEntrada,
  ItemEmEstoque,
  CreateMovimentoEstoqueInput,
  EstoqueMovimento,
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

  listOpsAbertas: (): Promise<OpComContexto[]> =>
    ipcRenderer.invoke(IpcChannels.PRODUCAO_LIST_OPS_ABERTAS),
  createApontamento: (input: CreateApontamentoInput): Promise<ApontamentoProducao> =>
    ipcRenderer.invoke(IpcChannels.PRODUCAO_CREATE_APONTAMENTO, input),
  encerrarOp: (opId: number): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.PRODUCAO_ENCERRAR_OP, opId),

  listAguardandoEntrada: (): Promise<ItemAguardandoEntrada[]> =>
    ipcRenderer.invoke(IpcChannels.ESTOQUE_LIST_AGUARDANDO_ENTRADA),
  listEmEstoque: (): Promise<ItemEmEstoque[]> =>
    ipcRenderer.invoke(IpcChannels.ESTOQUE_LIST_EM_ESTOQUE),
  registrarEntrada: (input: CreateMovimentoEstoqueInput): Promise<EstoqueMovimento> =>
    ipcRenderer.invoke(IpcChannels.ESTOQUE_REGISTRAR_ENTRADA, input),
  registrarSaida: (input: CreateMovimentoEstoqueInput): Promise<EstoqueMovimento> =>
    ipcRenderer.invoke(IpcChannels.ESTOQUE_REGISTRAR_SAIDA, input),

  createUsuario: (input: CreateUsuarioInput): Promise<Usuario> =>
    ipcRenderer.invoke(IpcChannels.USUARIOS_CREATE, input),
  listUsuarios: (): Promise<Usuario[]> => ipcRenderer.invoke(IpcChannels.USUARIOS_LIST),
  setUsuarioAtivo: (id: number, ativo: boolean): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.USUARIOS_SET_ACTIVE, id, ativo),
  setUsuarioPerfil: (id: number, perfil: Perfil): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.USUARIOS_SET_PERFIL, id, perfil),
  resetUsuarioSenha: (id: number, novaSenha: string): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.USUARIOS_RESET_PASSWORD, id, novaSenha),
})
