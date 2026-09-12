# bt_fitas — Sistema de Pedidos, Produção e Estoque

Data: 2026-09-12
Status: aprovado para planejamento de implementação

## Contexto e objetivo

Fábrica de fitas precisa de um sistema local (sem servidor de aplicação, sem
internet) que controle o fluxo: financeiro lança pedido → sistema gera ordem
de produção (OP) → produção fabrica e encerra a OP → estoque confere entrada
→ estoque registra expedição → pedido finalizado.

O sistema roda 100% na rede local da fábrica, sem depender de nuvem ou de um
processo servidor. Não substitui o ERP/sistema de faturamento existente
(cadastro próprio e simplificado de clientes/produtos, focado só neste
fluxo).

## Arquitetura

```
\\SERVIDOR\bt_fitas\              (pasta compartilhada — servidor mãe passivo,
  ├── dados.db                     só hospeda a pasta, não roda nenhum processo)
  ├── dados.db.lock
  └── backups\
        └── dados-2026-09-12-0800.db

Computador Financeiro   Computador Produção   Computador Estoque   Computador Admin
   [App Electron]          [App Electron]        [App Electron]      [App Electron]
        └───────────────────────┴──────────────────────┴───────────────────┘
                                 acesso direto ao dados.db via caminho de rede
```

- Um único app Electron (mesmo instalador/launcher em toda máquina). A tela
  exibida depende do perfil do usuário autenticado, não da máquina.
- Sem servidor de aplicação: o "servidor mãe" é só uma máquina que
  compartilha a pasta de rede (tipo um HD de rede). Toda a lógica roda em
  cada cliente.
- Sem push em tempo real (não há servidor pra emitir eventos): o processo
  principal de cada app faz polling do banco a cada poucos segundos (ex.
  3-5s) e atualiza a interface quando detecta mudança relevante para a tela
  aberta (ex. nova OP na fila da produção).

### Stack técnica

- **Electron + TypeScript** como shell da aplicação (launcher = o próprio
  executável/instalador do Electron).
- **React + Vite** para a interface (renderer process).
- **better-sqlite3** no processo principal para acesso ao SQLite — API
  síncrona, evita complexidade de callbacks/promises para operações locais
  curtas, boa maturidade em apps Electron.
- **IPC via `contextBridge`** (preload script) — `contextIsolation: true`,
  `nodeIntegration: false` no renderer. O renderer nunca acessa o banco
  diretamente; só chama funções expostas via IPC que rodam no processo
  principal.
- **`proper-lockfile`** para o lock de escrita entre processos/máquinas.
- **Vitest** para testes.

## Modelo de dados

Cadastros:

- `usuarios`: id, nome, login (único), senha_hash, perfil
  (`financeiro`|`admin`|`producao`|`estoque`), ativo
- `clientes`: id, codigo, nome, cnpj_cpf, inscricao_rg, endereco, bairro,
  cidade, cep, telefone, celular
- `produtos`: id, codigo, descricao, unidade, valor_unitario_padrao

Fluxo operacional:

- `pedidos`: id, numero, cliente_id, usuario_id (quem lançou), condicao_pagamento,
  data_pedido, prazo_entrega, observacoes
- `pedido_itens`: id, pedido_id, produto_id, quantidade, valor_unitario,
  valor_total, status (derivado — ver máquina de estados)
- `ordens_producao`: id, numero, pedido_item_id, quantidade_solicitada,
  quantidade_produzida (acumulada), status (`aberta`|`em_andamento`|`encerrada`),
  data_abertura, data_encerramento
- `apontamentos_producao`: id, op_id, usuario_id, quantidade, data_hora,
  observacao — cada lançamento parcial de produção
- `estoque_movimentos`: id, pedido_item_id, tipo (`entrada`|`saida`),
  quantidade, usuario_id, data_hora, observacao

### Máquina de estados (por item de pedido)

```
aberto ──(1º apontamento de produção)──▶ em_producao
em_producao ──(quantidade produzida ≥ solicitada e OP encerrada)──▶ aguardando_estoque
aguardando_estoque ──(estoque confirma entrada)──▶ em_estoque
em_estoque ──(estoque registra saída/expedição)──▶ finalizado
```

- OP é gerada automaticamente **por item de pedido** no momento em que o
  pedido é lançado (um pedido com 3 produtos gera 3 OPs).
- Status do pedido (visão geral) é derivado do estado "mais atrasado" entre
  seus itens — ex.: se um item está `em_producao` e outro `finalizado`, o
  pedido aparece como `em_producao` até todos os itens chegarem a
  `finalizado`.
- Produção parcial é permitida: cada apontamento soma na
  `quantidade_produzida` da OP; produção decide quando encerrar (mesmo que a
  quantidade não bata exatamente — precisa confirmar decisão de encerrar com
  quantidade divergente).

## Telas por perfil

- **Financeiro**: cadastro de clientes, cadastro de produtos, lançamento de
  pedidos (com um ou mais itens), lista de pedidos com status.
- **Produção**: fila de OPs abertas/em andamento (as mais antigas primeiro),
  tela de apontamento (lançar quantidade produzida), encerrar OP.
- **Estoque**: fila de OPs encerradas aguardando conferência de entrada;
  lista de itens em estoque (posição atual) com ação de registrar
  saída/expedição.
- **Admin**: CRUD de usuários (criar, desativar, redefinir senha, trocar
  perfil); visão completa de todos os pedidos/OPs/movimentos (somente
  leitura, sem atuar no fluxo operacional de outros perfis); acesso total
  de fato às demais telas caso precise substituir alguém.

## Autenticação

Login individual (usuário + senha) por pessoa, independente da máquina —
cada ação fica registrada com o usuário que a executou. Senhas guardadas
como hash (bcrypt) na tabela `usuarios`, no mesmo banco compartilhado.
Sessão de login persiste localmente (por máquina) até logout explícito.

## Concorrência e confiabilidade

- **Escrita**: toda operação de escrita (INSERT/UPDATE) adquire um lock de
  arquivo (`dados.db.lock`, via `proper-lockfile`) antes de abrir a
  transação SQLite, serializando gravações entre máquinas diferentes.
  Timeout de aquisição de lock configurável (ex. 5s); se expirar, a
  interface mostra erro claro ("outro usuário está salvando, tente
  novamente") sem perder o que a pessoa digitou na tela.
- **SQLite**: journal mode `DELETE` (rollback tradicional — WAL não é
  confiável sobre compartilhamento de rede SMB), `busy_timeout` alto como
  segunda camada de proteção, transações curtas.
- **Leitura**: sem lock (múltiplos leitores são seguros em SQLite).
- **Indisponibilidade de rede**: se a pasta compartilhada ficar
  inacessível, o app detecta o erro de I/O e mostra uma tela de "sem
  conexão com o servidor" — sem fila/cache offline na v1 (a rede local
  estável é premissa do projeto; YAGNI para v1).
- **Backup**: ao abrir, qualquer instância do app verifica se já existe um
  backup de `dados.db` para o dia corrente em
  `backups/dados-YYYY-MM-DD.db`; se não existir, cria (operação idempotente,
  não depende de uma máquina específica estar ligada). É a rede de segurança
  mais importante dado que existe um único arquivo de banco compartilhado.

## Fora de escopo (v1)

- Impressão de etiquetas ou OP em papel (tudo fica na tela).
- Integração com o ERP/sistema de faturamento existente.
- Cache/fila offline para quando a rede cai.
- Notificação push em tempo real (usa polling).

## Testes

- **Unitários (Vitest)**: camada de acesso a dados e regras de transição de
  estado (ex. não permitir encerrar OP com quantidade produzida menor que a
  solicitada sem confirmação explícita; cálculo do status derivado do
  pedido).
- **Integração**: SQLite real em arquivo temporário, simulando múltiplos
  processos gravando concorrentemente, validando que o lock evita
  corrupção e que os retries funcionam.
