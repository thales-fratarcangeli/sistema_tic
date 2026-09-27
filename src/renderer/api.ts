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
  OpDetalhada,
  OrdemProducao,
  CreateApontamentoInput,
  ApontamentoProducao,
  ItemAguardandoEntrada,
  ItemEmEstoque,
  CreateMovimentoEstoqueInput,
  EstoqueMovimento,
  LoginResponse,
} from '../shared/types'

// Cliente HTTP da API Express. É o mesmo nas duas versões: na web a página
// vem do próprio servidor; no desktop, do servidor embutido no Electron.
// Em ambos os casos a API fica em /api na mesma origem.

const TOKEN_KEY = 'bt_fitas_token'

let token: string | null = sessionStorage.getItem(TOKEN_KEY)
let onUnauthorized: (() => void) | null = null

export function setToken(value: string | null) {
  token = value
  if (value) sessionStorage.setItem(TOKEN_KEY, value)
  else sessionStorage.removeItem(TOKEN_KEY)
}

export function hasToken(): boolean {
  return token !== null
}

/** Chamado quando o servidor responde 401 (sessão expirada/usuário desativado). */
export function setOnUnauthorized(handler: (() => void) | null) {
  onUnauthorized = handler
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`/api${url}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (res.status === 401 && token) {
    setToken(null)
    onUnauthorized?.()
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new ApiError(data?.error ?? `Erro ${res.status}`, res.status)
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}

// O usuarioId dos Create*Input é preenchido pelo servidor com o usuário
// logado — o que vier do navegador é ignorado.
type SemUsuario<T> = Omit<T, 'usuarioId'>

export const api = {
  login: (login: string, senha: string) =>
    request<LoginResponse>('POST', '/auth/login', { login, senha }),
  logout: () => request<void>('POST', '/auth/logout'),
  me: () => request<Usuario>('GET', '/auth/me'),

  listClientes: () => request<Cliente[]>('GET', '/clientes'),
  createCliente: (input: CreateClienteInput) => request<Cliente>('POST', '/clientes', input),

  listProdutos: () => request<Produto[]>('GET', '/produtos'),
  createProduto: (input: CreateProdutoInput) => request<Produto>('POST', '/produtos', input),

  listPedidos: () => request<PedidoComItens[]>('GET', '/pedidos'),
  createPedido: (input: SemUsuario<CreatePedidoInput>) => request<Pedido>('POST', '/pedidos', input),

  listOpsAbertas: () => request<OpComContexto[]>('GET', '/producao/ops-abertas'),
  getOp: (opId: number) => request<OpDetalhada>('GET', `/producao/ops/${opId}`),
  createApontamento: (input: SemUsuario<CreateApontamentoInput>) =>
    request<ApontamentoProducao>('POST', '/producao/apontamentos', input),
  encerrarOp: (opId: number) => request<OrdemProducao>('PATCH', `/producao/ops/${opId}/encerrar`),

  listAguardandoEntrada: () => request<ItemAguardandoEntrada[]>('GET', '/estoque/aguardando-entrada'),
  listEmEstoque: () => request<ItemEmEstoque[]>('GET', '/estoque/em-estoque'),
  registrarEntrada: (input: SemUsuario<CreateMovimentoEstoqueInput>) =>
    request<EstoqueMovimento>('POST', '/estoque/entradas', input),
  registrarSaida: (input: SemUsuario<CreateMovimentoEstoqueInput>) =>
    request<EstoqueMovimento>('POST', '/estoque/saidas', input),

  listUsuarios: () => request<Usuario[]>('GET', '/usuarios'),
  createUsuario: (input: CreateUsuarioInput) => request<Usuario>('POST', '/usuarios', input),
  setUsuarioAtivo: (id: number, ativo: boolean) =>
    request<Usuario>('PATCH', `/usuarios/${id}/ativo`, { ativo }),
  setUsuarioPerfil: (id: number, perfil: Perfil) =>
    request<Usuario>('PATCH', `/usuarios/${id}/perfil`, { perfil }),
  resetUsuarioSenha: (id: number, senha: string) =>
    request<void>('PATCH', `/usuarios/${id}/senha`, { senha }),
}
