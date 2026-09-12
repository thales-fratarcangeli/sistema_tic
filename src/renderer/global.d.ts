import type {
  Usuario,
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

      listOpsAbertas(): Promise<OpComContexto[]>
      createApontamento(input: CreateApontamentoInput): Promise<ApontamentoProducao>
      encerrarOp(opId: number): Promise<void>

      listAguardandoEntrada(): Promise<ItemAguardandoEntrada[]>
      listEmEstoque(): Promise<ItemEmEstoque[]>
      registrarEntrada(input: CreateMovimentoEstoqueInput): Promise<EstoqueMovimento>
      registrarSaida(input: CreateMovimentoEstoqueInput): Promise<EstoqueMovimento>
    }
  }
}

export {}
