export type Perfil = 'financeiro' | 'admin' | 'producao' | 'estoque'

export interface Usuario {
  id: number
  nome: string
  login: string
  perfil: Perfil
  ativo: boolean
}

export interface Cliente {
  id: number
  codigo: string
  nome: string
  cnpjCpf: string
  inscricaoRg: string | null
  endereco: string | null
  bairro: string | null
  cidade: string | null
  cep: string | null
  telefone: string | null
  celular: string | null
}

export interface Produto {
  id: number
  codigo: string
  descricao: string
  unidade: string
  valorUnitarioPadrao: number
}

export type StatusItemPedido =
  | 'aberto'
  | 'em_producao'
  | 'aguardando_estoque'
  | 'em_estoque'
  | 'finalizado'

export interface Pedido {
  id: number
  numero: number
  clienteId: number
  usuarioId: number
  condicaoPagamento: string | null
  dataPedido: string
  prazoEntrega: string | null
  observacoes: string | null
}

export interface PedidoItem {
  id: number
  pedidoId: number
  produtoId: number
  quantidade: number
  valorUnitario: number
  valorTotal: number
}

export type StatusOrdemProducao = 'aberta' | 'em_andamento' | 'encerrada'

export interface OrdemProducao {
  id: number
  numero: number
  pedidoItemId: number
  quantidadeSolicitada: number
  quantidadeProduzida: number
  status: StatusOrdemProducao
  dataAbertura: string
  dataEncerramento: string | null
}

export interface ApontamentoProducao {
  id: number
  opId: number
  usuarioId: number
  quantidade: number
  dataHora: string
  observacao: string | null
}

export type TipoMovimentoEstoque = 'entrada' | 'saida'

export interface EstoqueMovimento {
  id: number
  pedidoItemId: number
  tipo: TipoMovimentoEstoque
  quantidade: number
  usuarioId: number
  dataHora: string
  observacao: string | null
}

export interface CreateClienteInput {
  codigo: string
  nome: string
  cnpjCpf: string
  inscricaoRg?: string | null
  endereco?: string | null
  bairro?: string | null
  cidade?: string | null
  cep?: string | null
  telefone?: string | null
  celular?: string | null
}

export interface CreateProdutoInput {
  codigo: string
  descricao: string
  unidade: string
  valorUnitarioPadrao: number
}

export interface CreatePedidoItemInput {
  produtoId: number
  quantidade: number
  valorUnitario: number
}

export interface CreatePedidoInput {
  clienteId: number
  usuarioId: number
  condicaoPagamento?: string | null
  prazoEntrega?: string | null
  observacoes?: string | null
  itens: CreatePedidoItemInput[]
}

export interface PedidoItemComStatus {
  id: number
  produtoId: number
  produtoDescricao: string
  quantidade: number
  valorUnitario: number
  valorTotal: number
  opNumero: number
  opStatus: StatusOrdemProducao
  status: StatusItemPedido
}

export interface PedidoComItens extends Pedido {
  clienteNome: string
  itens: PedidoItemComStatus[]
}

export interface OpComContexto extends OrdemProducao {
  pedidoNumero: number
  clienteNome: string
  produtoDescricao: string
}

export interface CreateApontamentoInput {
  opId: number
  usuarioId: number
  quantidade: number
  observacao?: string | null
}

export interface ItemAguardandoEntrada {
  pedidoItemId: number
  pedidoNumero: number
  clienteNome: string
  produtoDescricao: string
  quantidade: number
  opNumero: number
}

export interface ItemEmEstoque {
  pedidoItemId: number
  pedidoNumero: number
  clienteNome: string
  produtoDescricao: string
  quantidade: number
  dataEntrada: string
}

export interface CreateMovimentoEstoqueInput {
  pedidoItemId: number
  usuarioId: number
  quantidade: number
  observacao?: string | null
}
