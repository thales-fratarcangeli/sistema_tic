# bt_fitas

Sistema local para uma fábrica de fitas: financeiro lança pedidos, a
produção recebe as ordens de produção (OP) geradas automaticamente, fabrica
e encerra a OP, o estoque confere a entrada e depois registra a
saída/expedição, finalizando o pedido.

Roda 100% na rede local, sem internet — como app desktop em cada
computador ou como sistema web acessado pelo navegador.

**Quer só instalar e testar?** Veja o
[tutorial de instalação](TUTORIAL_INSTALACAO.md) — os instaladores
prontos ficam nos
[Releases](https://github.com/thales-fratarcangeli/sistema_tic/releases/latest).

## Duas versões, um só backend

O repositório tem **duas versões** do sistema, que compartilham a mesma
interface React e o mesmo backend **Express + Prisma** (SQLite):

| | Desktop (Electron) | Web (navegador) |
|---|---|---|
| Onde roda o backend | Dentro de cada app, só em `127.0.0.1` | Um servidor na rede da fábrica |
| Banco | `dados.db` na pasta compartilhada (`\\SERVIDOR\bt_fitas`) | `dados.db` na pasta do servidor (`BT_FITAS_DATA_DIR`) |
| Acesso | App instalado em cada computador | `http://servidor:3000` em qualquer navegador |
| Desenvolvimento | `npm run dev:desktop` | `npm run dev:web` |
| Produção | `npm run dist` (instalador `.exe`) | `npm run build:web` + `npm run start:web` |

```
Versão desktop                                 Versão web
[Electron] ─ React ─HTTP─▶ Express (127.0.0.1)    [Navegador] ─ React ─HTTP─▶ Express (0.0.0.0:3000)
                             │                                                     │
                             ▼                                                     ▼
              \\SERVIDOR\bt_fitas\dados.db                                  ./data/dados.db
              (compartilhado entre as máquinas,                         (um único processo grava)
               escritas serializadas por lock de arquivo)
```

### Backend em camadas (`src/server/`)

```
prisma/schema.prisma       modelos do Prisma (mapeiam as tabelas existentes do dados.db)
src/shared/types.ts        contratos da API (entidades e DTOs Create*Input), usados por front e back
src/server/
  repositories/            acesso a dados via Prisma Client — sem regra de negócio
  services/                regras de negócio e validações; lançam AppError(mensagem, status)
  controllers/             leem req (params/body/usuário logado) e chamam o service
  routes/                  endpoints por módulo + autenticação/perfil; index.ts monta /api
  middlewares/             autenticar, exigirPerfil, errorHandler
  db/                      conexão Prisma, criação das tabelas, lock de arquivo, backup diário
  app.ts                   createApp() — usado pelas duas versões
  server.ts                ponto de entrada da versão web
electron/main.ts           ponto de entrada da versão desktop (sobe o createApp() em 127.0.0.1)
```

Toda escrita passa por `writeTransaction()` (`src/server/db/client.ts`):
lock de arquivo no `dados.db` (serializa gravações entre máquinas na versão
desktop) + `prisma.$transaction` (tudo ou nada). O banco usa journal mode
`DELETE` (WAL não é confiável sobre SMB) e `busy_timeout` de 5 s.

**Compatibilidade:** os modelos do Prisma usam `@map`/`@@map` para os
nomes originais em snake_case e datas como texto ISO, então os `dados.db`
criados pela v1.x abrem sem migração. As tabelas são criadas em runtime por
`src/server/db/schema.ts` (`CREATE TABLE IF NOT EXISTS`) — ao alterar o
`schema.prisma`, altere também esse arquivo.

### API (`/api`)

Login por token (`POST /api/auth/login` → `Authorization: Bearer <token>`).
Cada módulo é restrito a um perfil; o admin acessa tudo. O `usuarioId` de
pedidos, apontamentos e movimentos é sempre o do usuário logado.

| Módulo | Rotas |
|---|---|
| auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| financeiro | `GET/POST /clientes`, `GET/POST /produtos`, `GET/POST /pedidos` |
| produção | `GET /producao/ops-abertas`, `GET /producao/ops/:id`, `GET /producao/ops/:id/apontamentos`, `POST /producao/apontamentos`, `PATCH /producao/ops/:id/encerrar` |
| estoque | `GET /estoque/aguardando-entrada`, `GET /estoque/em-estoque`, `POST /estoque/entradas`, `POST /estoque/saidas` |
| admin | `GET/POST /usuarios`, `PATCH /usuarios/:id/ativo`, `/perfil`, `/senha` |

Exemplo:

```bash
TOKEN=$(curl -s -X POST localhost:3000/api/auth/login -H "Content-Type: application/json" \
  -d '{"login":"admin","senha":"admin123"}' | jq -r .token)
curl -X POST localhost:3000/api/producao/apontamentos -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{"opId": 1, "quantidade": 80}'
```

**Stack:** TypeScript, Express 5, Prisma 7 (adapter `better-sqlite3`),
React + Vite, Electron (versão desktop), `proper-lockfile`, `bcryptjs`,
Vitest + Supertest.

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
npm run dev:desktop   # app Electron em modo desenvolvimento
npm run dev:web       # versão web em http://localhost:3000 (com hot reload)
npm test              # testes (Vitest): services, API HTTP e compatibilidade do banco
npm run build         # build das duas versões
```

Versão web em produção:

```bash
npm run build:web
PORT=3000 BT_FITAS_DATA_DIR=/caminho/dos/dados npm run start:web
```

Na versão desktop, o primeiro uso pede o caminho da pasta compartilhada de
rede (ex: `\\SERVIDOR\bt_fitas`). Nas duas versões, um banco sem usuários
ganha o admin padrão (`admin` / `admin123` — trocar depois do primeiro login).

O Prisma Client é gerado em `src/server/generated/` (fora do git) pelos
próprios scripts `dev`, `build` e `test`; para gerar à mão: `npm run generate`.

**Nota sobre módulo nativo:** `better-sqlite3` é o único módulo nativo do
projeto e usa prebuilds N-API (funcionam em Node e Electron sem rebuild).
Por isso a senha usa `bcryptjs` (JS puro) em vez de `bcrypt` nativo, e o
`.npmrc` do projeto define `ignore-scripts=true` — evita que o `npm
install` tente compilar código nativo (precisaria de Visual Studio Build
Tools), o que não pode ser assumido nos computadores da fábrica.
