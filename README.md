# bt_fitas

Sistema local para uma fábrica de fitas: financeiro lança pedidos, a
produção recebe as ordens de produção (OP) geradas automaticamente, fabrica
e encerra a OP, o estoque confere a entrada e depois registra a
saída/expedição, finalizando o pedido.

Roda 100% na rede local, sem servidor de aplicação e sem internet.

## Arquitetura

```
\\SERVIDOR\bt_fitas\              (pasta compartilhada — servidor mãe passivo,
  ├── dados.db                     só hospeda a pasta, não roda nenhum processo)
  ├── dados.db.lock
  └── backups\
        └── dados-2026-09-12.db

Computador Financeiro   Computador Produção   Computador Estoque   Computador Admin
   [App Electron]          [App Electron]        [App Electron]      [App Electron]
        └───────────────────────┴──────────────────────┴───────────────────┘
                                 acesso direto ao dados.db via caminho de rede
```

- Um único app Electron (mesmo instalador em toda máquina) — a tela exibida
  depende do perfil de quem faz login, não da máquina.
- Sem servidor de aplicação: o "servidor mãe" só compartilha a pasta de
  rede. Toda a lógica roda em cada cliente.
- Sem push em tempo real: cada app faz polling do banco periodicamente pra
  refletir mudanças feitas por outras máquinas.

**Stack:** Electron + TypeScript, React + Vite na interface, `better-sqlite3`
no processo principal, IPC via `contextBridge` (contextIsolation ativado,
sem nodeIntegration no renderer), `proper-lockfile` para serializar escritas
entre máquinas, Vitest para testes.

### Por que SQLite em pasta de rede é seguro aqui

WAL não é confiável sobre SMB, então o banco usa journal mode `DELETE`
(rollback tradicional) + `busy_timeout` alto como segunda camada. Toda
escrita passa por um lock de arquivo (`dados.db.lock`, via
`proper-lockfile`) antes de abrir a transação, serializando gravações entre
máquinas. Dado o baixo volume de escrita simultânea de uma fábrica desse
porte, esse risco fica administrável sem precisar de um servidor central.

## Modelo de dados

Cadastros: `usuarios` (login/senha/perfil), `clientes`, `produtos`.

Fluxo operacional: `pedidos` → `pedido_itens` → `ordens_producao` (uma OP
por item de pedido, gerada automaticamente ao lançar o pedido) →
`apontamentos_producao` (permite produção parcial em múltiplas etapas) →
`estoque_movimentos` (entrada e saída/expedição).

**Máquina de estados (por item de pedido):**

```
aberto ──(1º apontamento)──▶ em_producao
em_producao ──(quantidade produzida ≥ solicitada e OP encerrada)──▶ aguardando_estoque
aguardando_estoque ──(estoque confirma entrada)──▶ em_estoque
em_estoque ──(estoque registra saída/expedição)──▶ finalizado
```

O status do pedido como um todo é o estado "mais atrasado" entre seus itens.

## Perfis e telas

- **Financeiro** — cadastro de clientes/produtos, lançamento de pedidos.
- **Produção** — fila de OPs, apontamento de produção, encerramento de OP.
- **Estoque** — conferência de entrada, registro de saída/expedição.
- **Admin** — gestão de usuários, visão completa de tudo, acesso total.

Login é individual (usuário + senha por pessoa, não por máquina).

## Fora de escopo (v1)

Impressão de etiqueta/OP em papel, integração com o ERP de faturamento
existente, cache/fila offline, notificação push em tempo real.

## Rodando localmente

```bash
npm install
npm run dev     # abre o app Electron em modo desenvolvimento
npm test        # roda os testes (Vitest)
npm run build   # build de produção
```

No primeiro uso, o app pede o caminho da pasta compartilhada de rede (ex:
`\\SERVIDOR\bt_fitas`) e cria um usuário admin padrão (`admin` / `admin123`
— trocar depois do primeiro login).

**Nota sobre módulo nativo:** `better-sqlite3` é o único módulo nativo do
projeto e usa prebuilds N-API (funcionam em Node e Electron sem rebuild).
Por isso a senha usa `bcryptjs` (JS puro) em vez de `bcrypt` nativo, e o
`.npmrc` do projeto define `ignore-scripts=true` — evita que o `npm
install` tente compilar código nativo (precisaria de Visual Studio Build
Tools), o que não pode ser assumido nos computadores da fábrica. O binário
do Electron é baixado automaticamente na primeira vez que rodar `npm run
dev`.
