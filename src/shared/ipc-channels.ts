export const IpcChannels = {
  AUTH_LOGIN: 'auth:login',
  AUTH_GET_CURRENT_USER: 'auth:getCurrentUser',
  AUTH_LOGOUT: 'auth:logout',
  CLIENTES_CREATE: 'clientes:create',
  CLIENTES_LIST: 'clientes:list',
  PRODUTOS_CREATE: 'produtos:create',
  PRODUTOS_LIST: 'produtos:list',
  PEDIDOS_CREATE: 'pedidos:create',
  PEDIDOS_LIST: 'pedidos:list',
  PRODUCAO_LIST_OPS_ABERTAS: 'producao:listOpsAbertas',
  PRODUCAO_CREATE_APONTAMENTO: 'producao:createApontamento',
  PRODUCAO_ENCERRAR_OP: 'producao:encerrarOp',
} as const
