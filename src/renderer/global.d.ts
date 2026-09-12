import type {
  Usuario,
  Cliente,
  Produto,
  Pedido,
  PedidoComItens,
  CreateClienteInput,
  CreateProdutoInput,
  CreatePedidoInput,
} from '../shared/types'

declare global {
  interface Window {
    api: {
      getDbFolderPath(): Promise<{ dbFolderPath: string } | null>
      setDbFolderPath(dbFolderPath: string): Promise<void>
      login(login: string, senha: string): Promise<Usuario | null>
      ensureSeedAdmin(): Promise<void>

      createCliente(input: CreateClienteInput): Promise<Cliente>
      listClientes(): Promise<Cliente[]>

      createProduto(input: CreateProdutoInput): Promise<Produto>
      listProdutos(): Promise<Produto[]>

      createPedido(input: CreatePedidoInput): Promise<Pedido>
      listPedidos(): Promise<PedidoComItens[]>
    }
  }
}

export {}
