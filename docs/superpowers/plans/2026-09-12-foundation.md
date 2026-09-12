# bt_fitas — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the running skeleton of the bt_fitas app: Electron + TypeScript + React shell, SQLite schema, shared-folder configuration, write-lock concurrency wrapper, user auth (login), and role-based screen routing (placeholders per profile). This is the foundation later plans (Financeiro, Produção, Estoque, Admin) build screens on top of.

**Architecture:** Single Electron app (main + preload + renderer). Main process owns all SQLite access via `better-sqlite3` against a `.db` file on a user-configured network path. Renderer (React/Vite) never touches the filesystem/DB directly — only via `contextBridge` IPC calls exposed in preload. Every write goes through a file-lock wrapper (`proper-lockfile`) to serialize concurrent writers across machines.

**Tech Stack:** Electron, TypeScript, React, Vite, better-sqlite3, proper-lockfile, bcrypt, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-12-bt-fitas-sistema-design.md`

## Global Constraints

- SQLite journal mode must be `DELETE`, never `WAL` (WAL is unreliable over SMB network shares — spec section "Concorrência e confiabilidade").
- Every write operation must acquire the file lock (`dados.db.lock`) before opening a transaction.
- Renderer process must have `contextIsolation: true` and `nodeIntegration: false` — no direct Node/filesystem access from renderer code.
- Passwords stored only as bcrypt hashes, never plaintext.
- No printing, no offline queue, no push notifications in this phase or later phases (out of scope per spec).

---

## File Structure

```
bt_fitas/
  package.json
  tsconfig.json
  vite.config.ts
  electron/
    main.ts                      # Electron entry point
    preload.ts                   # contextBridge exposure
  src/
    shared/
      types.ts                   # shared TS types/enums (Usuario, Perfil, etc.)
      ipc-channels.ts            # IPC channel name constants
    main/
      config.ts                  # reads/writes userData config.json (db folder path)
      db/
        connection.ts            # opens better-sqlite3 with journal_mode/busy_timeout
        lock.ts                  # withWriteLock() wrapper over proper-lockfile
        schema.ts                # CREATE TABLE statements + migrate()
        repositories/
          usuarios.repo.ts       # createUser, verifyLogin, listUsers, setActive
      backup.ts                  # daily backup-on-startup logic
      ipc/
        authIpc.ts                # registers login/getCurrentUser IPC handlers
    renderer/
      main.tsx
      App.tsx
      auth/
        AuthContext.tsx
      screens/
        Login.tsx
        SetupFolder.tsx           # first-run: ask for shared folder path
        PlaceholderScreen.tsx     # "tela em construção" per perfil
  tests/
    main/db/lock.test.ts
    main/db/schema.test.ts
    main/db/repositories/usuarios.repo.test.ts
    main/backup.test.ts
```

---

## Task 1: Project scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `electron/main.ts`, `src/renderer/main.tsx`, `src/renderer/App.tsx`, `index.html`

**Interfaces:**
- Produces: a running `npm run dev` that opens an Electron window showing a React "bt_fitas" placeholder page.

- [ ] **Step 1: Initialize package.json and install dependencies**

```bash
npm init -y
npm install electron react react-dom better-sqlite3 proper-lockfile bcrypt
npm install -D typescript vite @vitejs/plugin-react electron-builder vitest \
  @types/react @types/react-dom @types/node @types/better-sqlite3 \
  @types/proper-lockfile @types/bcrypt vite-plugin-electron
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "dist"
  },
  "include": ["src", "electron"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: { entry: 'electron/main.ts' },
      preload: { input: 'electron/preload.ts' },
    }),
  ],
})
```

- [ ] **Step 4: Create `electron/main.ts`**

```typescript
import { app, BrowserWindow } from 'electron'
import path from 'node:path'

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 5: Create `electron/preload.ts`** (empty for now, filled in Task 8)

```typescript
// IPC bridge — populated in Task 8 (auth IPC)
export {}
```

- [ ] **Step 6: Create `index.html`, `src/renderer/main.tsx`, `src/renderer/App.tsx`**

`index.html`:
```html
<!doctype html>
<html>
  <head><meta charset="UTF-8" /><title>bt_fitas</title></head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/renderer/main.tsx"></script>
  </body>
</html>
```

`src/renderer/main.tsx`:
```typescript
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(<App />)
```

`src/renderer/App.tsx`:
```typescript
export default function App() {
  return <h1>bt_fitas</h1>
}
```

- [ ] **Step 7: Add npm scripts to `package.json`**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run"
  }
}
```

- [ ] **Step 8: Run dev and verify the Electron window opens showing "bt_fitas"**

Run: `npm run dev`
Expected: an Electron window opens with the text "bt_fitas" visible.

- [ ] **Step 9: Commit**

```bash
git add package.json tsconfig.json vite.config.ts electron/ index.html src/renderer/main.tsx src/renderer/App.tsx package-lock.json
git commit -m "chore: scaffold Electron + Vite + React + TypeScript project"
```

---

## Task 2: Shared types

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/ipc-channels.ts`

**Interfaces:**
- Produces: `Perfil`, `Usuario`, `Cliente`, `Produto`, `Pedido`, `PedidoItem`, `OrdemProducao`, `ApontamentoProducao`, `EstoqueMovimento` types, and `IpcChannels` constants — used by every later task.

- [ ] **Step 1: Write `src/shared/types.ts`**

```typescript
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
```

- [ ] **Step 2: Write `src/shared/ipc-channels.ts`**

```typescript
export const IpcChannels = {
  AUTH_LOGIN: 'auth:login',
  AUTH_GET_CURRENT_USER: 'auth:getCurrentUser',
  AUTH_LOGOUT: 'auth:logout',
} as const
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/shared/
git commit -m "feat: add shared types and IPC channel constants"
```

---

## Task 3: Database schema and migration

**Files:**
- Create: `src/main/db/schema.ts`
- Test: `tests/main/db/schema.test.ts`

**Interfaces:**
- Consumes: nothing (raw `better-sqlite3` `Database` instance passed in).
- Produces: `migrate(db: Database): void` — creates all tables if they don't exist; called by `connection.ts` in Task 5.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/main/db/schema.test.ts
import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { migrate } from '../../../src/main/db/schema'

describe('migrate', () => {
  it('creates all expected tables', () => {
    const db = new Database(':memory:')
    migrate(db)

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((row: any) => row.name)

    expect(tables).toEqual(
      expect.arrayContaining([
        'usuarios',
        'clientes',
        'produtos',
        'pedidos',
        'pedido_itens',
        'ordens_producao',
        'apontamentos_producao',
        'estoque_movimentos',
      ])
    )
  })

  it('is idempotent (running twice does not error)', () => {
    const db = new Database(':memory:')
    migrate(db)
    expect(() => migrate(db)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/main/db/schema.test.ts`
Expected: FAIL — `Cannot find module '../../../src/main/db/schema'`

- [ ] **Step 3: Write `src/main/db/schema.ts`**

```typescript
import type Database from 'better-sqlite3'

export function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      login TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      perfil TEXT NOT NULL CHECK (perfil IN ('financeiro','admin','producao','estoque')),
      ativo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL UNIQUE,
      nome TEXT NOT NULL,
      cnpj_cpf TEXT NOT NULL,
      inscricao_rg TEXT,
      endereco TEXT,
      bairro TEXT,
      cidade TEXT,
      cep TEXT,
      telefone TEXT,
      celular TEXT
    );

    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL UNIQUE,
      descricao TEXT NOT NULL,
      unidade TEXT NOT NULL,
      valor_unitario_padrao REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero INTEGER NOT NULL UNIQUE,
      cliente_id INTEGER NOT NULL REFERENCES clientes(id),
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      condicao_pagamento TEXT,
      data_pedido TEXT NOT NULL,
      prazo_entrega TEXT,
      observacoes TEXT
    );

    CREATE TABLE IF NOT EXISTS pedido_itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL REFERENCES pedidos(id),
      produto_id INTEGER NOT NULL REFERENCES produtos(id),
      quantidade REAL NOT NULL,
      valor_unitario REAL NOT NULL,
      valor_total REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ordens_producao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero INTEGER NOT NULL UNIQUE,
      pedido_item_id INTEGER NOT NULL REFERENCES pedido_itens(id),
      quantidade_solicitada REAL NOT NULL,
      quantidade_produzida REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL CHECK (status IN ('aberta','em_andamento','encerrada')) DEFAULT 'aberta',
      data_abertura TEXT NOT NULL,
      data_encerramento TEXT
    );

    CREATE TABLE IF NOT EXISTS apontamentos_producao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      op_id INTEGER NOT NULL REFERENCES ordens_producao(id),
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      quantidade REAL NOT NULL,
      data_hora TEXT NOT NULL,
      observacao TEXT
    );

    CREATE TABLE IF NOT EXISTS estoque_movimentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_item_id INTEGER NOT NULL REFERENCES pedido_itens(id),
      tipo TEXT NOT NULL CHECK (tipo IN ('entrada','saida')),
      quantidade REAL NOT NULL,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      data_hora TEXT NOT NULL,
      observacao TEXT
    );
  `)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/main/db/schema.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/main/db/schema.ts tests/main/db/schema.test.ts
git commit -m "feat: add SQLite schema and migration"
```

---

## Task 4: Shared folder configuration (first-run setup)

**Files:**
- Create: `src/main/config.ts`
- Test: `tests/main/config.test.ts`

**Interfaces:**
- Consumes: nothing (reads/writes a JSON file at a given path — path injected as a parameter so tests don't touch the real userData dir).
- Produces: `readConfig(configPath: string): { dbFolderPath: string } | null` and `writeConfig(configPath: string, config: { dbFolderPath: string }): void` — consumed by `connection.ts` (Task 5) and the `SetupFolder` screen (Task 9).

- [ ] **Step 1: Write the failing test**

```typescript
// tests/main/config.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { readConfig, writeConfig } from '../../src/main/config'

let tmpDir: string
let configPath: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'btfitas-config-'))
  configPath = path.join(tmpDir, 'config.json')
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('config', () => {
  it('returns null when no config file exists', () => {
    expect(readConfig(configPath)).toBeNull()
  })

  it('writes and reads back the dbFolderPath', () => {
    writeConfig(configPath, { dbFolderPath: '\\\\SERVIDOR\\bt_fitas' })
    expect(readConfig(configPath)).toEqual({ dbFolderPath: '\\\\SERVIDOR\\bt_fitas' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/main/config.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write `src/main/config.ts`**

```typescript
import fs from 'node:fs'

export interface AppConfig {
  dbFolderPath: string
}

export function readConfig(configPath: string): AppConfig | null {
  if (!fs.existsSync(configPath)) return null
  const raw = fs.readFileSync(configPath, 'utf-8')
  return JSON.parse(raw) as AppConfig
}

export function writeConfig(configPath: string, config: AppConfig): void {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/main/config.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/main/config.ts tests/main/config.test.ts
git commit -m "feat: add app config read/write for shared folder path"
```

---

## Task 5: Database connection (journal mode, busy_timeout)

**Files:**
- Create: `src/main/db/connection.ts`
- Test: `tests/main/db/connection.test.ts`

**Interfaces:**
- Consumes: `migrate` from `src/main/db/schema.ts` (Task 3).
- Produces: `openDatabase(dbFilePath: string): Database.Database` — used by every repository (Task 7) and by `main.ts` wiring (Task 8).

- [ ] **Step 1: Write the failing test**

```typescript
// tests/main/db/connection.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { openDatabase } from '../../../src/main/db/connection'

let tmpDir: string
let dbPath: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'btfitas-db-'))
  dbPath = path.join(tmpDir, 'dados.db')
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('openDatabase', () => {
  it('creates the file, sets journal_mode to DELETE, and runs migrations', () => {
    const db = openDatabase(dbPath)

    const journalMode = db.pragma('journal_mode', { simple: true })
    expect(journalMode).toBe('delete')

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'")
      .all()
    expect(tables.length).toBe(1)

    db.close()
    expect(fs.existsSync(dbPath)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/main/db/connection.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write `src/main/db/connection.ts`**

```typescript
import Database from 'better-sqlite3'
import { migrate } from './schema'

export function openDatabase(dbFilePath: string): Database.Database {
  const db = new Database(dbFilePath)
  db.pragma('journal_mode = DELETE')
  db.pragma('busy_timeout = 5000')
  migrate(db)
  return db
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/main/db/connection.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/db/connection.ts tests/main/db/connection.test.ts
git commit -m "feat: add SQLite connection with DELETE journal mode and busy_timeout"
```

---

## Task 6: Write-lock wrapper

**Files:**
- Create: `src/main/db/lock.ts`
- Test: `tests/main/db/lock.test.ts`

**Interfaces:**
- Consumes: nothing (wraps `proper-lockfile` around a given file path).
- Produces: `withWriteLock<T>(targetFilePath: string, fn: () => T): Promise<T>` — every repository write (Task 7 onward) wraps its transaction in this.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/main/db/lock.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { withWriteLock } from '../../../src/main/db/lock'

let tmpDir: string
let targetFile: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'btfitas-lock-'))
  targetFile = path.join(tmpDir, 'dados.db')
  fs.writeFileSync(targetFile, '')
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('withWriteLock', () => {
  it('runs the function and returns its result', async () => {
    const result = await withWriteLock(targetFile, () => 42)
    expect(result).toBe(42)
  })

  it('serializes concurrent calls (no interleaving)', async () => {
    const events: string[] = []

    const slow = withWriteLock(targetFile, async () => {
      events.push('slow:start')
      await new Promise((r) => setTimeout(r, 50))
      events.push('slow:end')
    })

    // started slightly after `slow` so it must wait for the lock
    await new Promise((r) => setTimeout(r, 5))
    const fast = withWriteLock(targetFile, () => {
      events.push('fast:start')
      events.push('fast:end')
    })

    await Promise.all([slow, fast])

    expect(events).toEqual(['slow:start', 'slow:end', 'fast:start', 'fast:end'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/main/db/lock.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write `src/main/db/lock.ts`**

```typescript
import lockfile from 'proper-lockfile'

export async function withWriteLock<T>(
  targetFilePath: string,
  fn: () => T | Promise<T>
): Promise<T> {
  const release = await lockfile.lock(targetFilePath, {
    retries: { retries: 20, minTimeout: 100, maxTimeout: 500 },
    stale: 10000,
  })
  try {
    return await fn()
  } finally {
    await release()
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/main/db/lock.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/main/db/lock.ts tests/main/db/lock.test.ts
git commit -m "feat: add cross-process write lock wrapper"
```

---

## Task 7: Usuarios repository (auth)

**Files:**
- Create: `src/main/db/repositories/usuarios.repo.ts`
- Test: `tests/main/db/repositories/usuarios.repo.test.ts`

**Interfaces:**
- Consumes: `openDatabase` (Task 5), `withWriteLock` (Task 6), `Usuario`/`Perfil` types (Task 2).
- Produces: `createUser(db, dbFilePath, input): Promise<Usuario>`, `verifyLogin(db, login, senha): Usuario | null`, `listUsers(db): Usuario[]`, `setActive(db, dbFilePath, id, ativo): Promise<void>` — consumed by the auth IPC handler (Task 8).

- [ ] **Step 1: Write the failing test**

```typescript
// tests/main/db/repositories/usuarios.repo.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { openDatabase } from '../../../../src/main/db/connection'
import {
  createUser,
  verifyLogin,
  listUsers,
  setActive,
} from '../../../../src/main/db/repositories/usuarios.repo'

let tmpDir: string
let dbPath: string
let db: ReturnType<typeof openDatabase>

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'btfitas-usuarios-'))
  dbPath = path.join(tmpDir, 'dados.db')
  db = openDatabase(dbPath)
})

afterEach(() => {
  db.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('usuarios.repo', () => {
  it('creates a user with a hashed password and verifies login', async () => {
    await createUser(db, dbPath, {
      nome: 'Ana Financeiro',
      login: 'ana',
      senha: 'senha123',
      perfil: 'financeiro',
    })

    const found = verifyLogin(db, 'ana', 'senha123')
    expect(found).not.toBeNull()
    expect(found!.nome).toBe('Ana Financeiro')
    expect(found!.perfil).toBe('financeiro')

    const wrongPassword = verifyLogin(db, 'ana', 'errada')
    expect(wrongPassword).toBeNull()
  })

  it('does not return a user that is inactive', async () => {
    const user = await createUser(db, dbPath, {
      nome: 'Bob Producao',
      login: 'bob',
      senha: 'senha123',
      perfil: 'producao',
    })
    await setActive(db, dbPath, user.id, false)

    expect(verifyLogin(db, 'bob', 'senha123')).toBeNull()
  })

  it('lists all users', async () => {
    await createUser(db, dbPath, {
      nome: 'Ana',
      login: 'ana',
      senha: 'x',
      perfil: 'financeiro',
    })
    const users = listUsers(db)
    expect(users.length).toBe(1)
    expect(users[0].login).toBe('ana')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/main/db/repositories/usuarios.repo.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write `src/main/db/repositories/usuarios.repo.ts`**

```typescript
import type Database from 'better-sqlite3'
import bcrypt from 'bcrypt'
import { withWriteLock } from '../lock'
import type { Usuario, Perfil } from '../../../shared/types'

interface CreateUserInput {
  nome: string
  login: string
  senha: string
  perfil: Perfil
}

function rowToUsuario(row: any): Usuario {
  return {
    id: row.id,
    nome: row.nome,
    login: row.login,
    perfil: row.perfil,
    ativo: row.ativo === 1,
  }
}

export async function createUser(
  db: Database.Database,
  dbFilePath: string,
  input: CreateUserInput
): Promise<Usuario> {
  const senhaHash = await bcrypt.hash(input.senha, 10)
  return withWriteLock(dbFilePath, () => {
    const stmt = db.prepare(
      `INSERT INTO usuarios (nome, login, senha_hash, perfil, ativo) VALUES (?, ?, ?, ?, 1)`
    )
    const result = stmt.run(input.nome, input.login, senhaHash, input.perfil)
    const row = db
      .prepare('SELECT * FROM usuarios WHERE id = ?')
      .get(result.lastInsertRowid)
    return rowToUsuario(row)
  })
}

export function verifyLogin(
  db: Database.Database,
  login: string,
  senha: string
): Usuario | null {
  const row: any = db
    .prepare('SELECT * FROM usuarios WHERE login = ? AND ativo = 1')
    .get(login)
  if (!row) return null
  if (!bcrypt.compareSync(senha, row.senha_hash)) return null
  return rowToUsuario(row)
}

export function listUsers(db: Database.Database): Usuario[] {
  const rows = db.prepare('SELECT * FROM usuarios ORDER BY nome').all()
  return rows.map(rowToUsuario)
}

export async function setActive(
  db: Database.Database,
  dbFilePath: string,
  id: number,
  ativo: boolean
): Promise<void> {
  await withWriteLock(dbFilePath, () => {
    db.prepare('UPDATE usuarios SET ativo = ? WHERE id = ?').run(ativo ? 1 : 0, id)
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/main/db/repositories/usuarios.repo.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/main/db/repositories/usuarios.repo.ts tests/main/db/repositories/usuarios.repo.test.ts
git commit -m "feat: add usuarios repository with bcrypt password hashing"
```

---

## Task 8: Auth IPC + main process wiring + seed admin

**Files:**
- Modify: `electron/main.ts`
- Modify: `electron/preload.ts`
- Create: `src/main/ipc/authIpc.ts`

**Interfaces:**
- Consumes: `openDatabase` (Task 5), `verifyLogin`/`createUser`/`listUsers` (Task 7), `readConfig`/`writeConfig` (Task 4), `IpcChannels` (Task 2).
- Produces: `window.api.login(login, senha): Promise<Usuario | null>` and `window.api.getDbFolderPath(): Promise<string | null>` exposed on `window` for the renderer — consumed by `AuthContext` and `SetupFolder` (Task 9).

- [ ] **Step 1: Write `src/main/ipc/authIpc.ts`**

```typescript
import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import { IpcChannels } from '../../shared/ipc-channels'
import { verifyLogin, createUser, listUsers } from '../db/repositories/usuarios.repo'

export function registerAuthIpc(db: Database.Database, dbFilePath: string) {
  ipcMain.handle(IpcChannels.AUTH_LOGIN, (_event, login: string, senha: string) => {
    return verifyLogin(db, login, senha)
  })

  // Seeds the first admin user if none exist yet — bootstraps the system
  // before there is any UI to create users. Default credentials must be
  // changed after first login (enforced by the Admin screens, later plan).
  ipcMain.handle('auth:ensureSeedAdmin', async () => {
    const users = listUsers(db)
    if (users.length === 0) {
      await createUser(db, dbFilePath, {
        nome: 'Administrador',
        login: 'admin',
        senha: 'admin123',
        perfil: 'admin',
      })
    }
  })
}
```

- [ ] **Step 2: Update `electron/main.ts` to wire config, database, and IPC**

```typescript
import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { readConfig, writeConfig } from '../src/main/config'
import { openDatabase } from '../src/main/db/connection'
import { registerAuthIpc } from '../src/main/ipc/authIpc'
import { IpcChannels } from '../src/shared/ipc-channels'

const configPath = path.join(app.getPath('userData'), 'config.json')

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  ipcMain.handle('config:get', () => readConfig(configPath))
  ipcMain.handle('config:set', (_event, dbFolderPath: string) => {
    writeConfig(configPath, { dbFolderPath })
    const dbFilePath = path.join(dbFolderPath, 'dados.db')
    const db = openDatabase(dbFilePath)
    registerAuthIpc(db, dbFilePath)
  })

  const existing = readConfig(configPath)
  if (existing) {
    const dbFilePath = path.join(existing.dbFolderPath, 'dados.db')
    const db = openDatabase(dbFilePath)
    registerAuthIpc(db, dbFilePath)
  }

  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 3: Write `electron/preload.ts`**

```typescript
import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '../src/shared/ipc-channels'
import type { Usuario } from '../src/shared/types'

contextBridge.exposeInMainWorld('api', {
  getDbFolderPath: (): Promise<{ dbFolderPath: string } | null> =>
    ipcRenderer.invoke('config:get'),
  setDbFolderPath: (dbFolderPath: string): Promise<void> =>
    ipcRenderer.invoke('config:set', dbFolderPath),
  login: (login: string, senha: string): Promise<Usuario | null> =>
    ipcRenderer.invoke(IpcChannels.AUTH_LOGIN, login, senha),
  ensureSeedAdmin: (): Promise<void> => ipcRenderer.invoke('auth:ensureSeedAdmin'),
})
```

- [ ] **Step 4: Verify it compiles and the app still launches**

Run: `npx tsc --noEmit && npm run dev`
Expected: no type errors; Electron window opens (still showing the Task 1 placeholder — renderer wiring happens in Task 9).

- [ ] **Step 5: Commit**

```bash
git add electron/main.ts electron/preload.ts src/main/ipc/authIpc.ts
git commit -m "feat: wire config, database, and auth IPC into main process"
```

---

## Task 9: React shell — setup, login, role-based routing

**Files:**
- Create: `src/renderer/auth/AuthContext.tsx`
- Create: `src/renderer/screens/SetupFolder.tsx`
- Create: `src/renderer/screens/Login.tsx`
- Create: `src/renderer/screens/PlaceholderScreen.tsx`
- Modify: `src/renderer/App.tsx`
- Create: `src/renderer/global.d.ts` (typing for `window.api`)

**Interfaces:**
- Consumes: `window.api.getDbFolderPath/setDbFolderPath/login/ensureSeedAdmin` (Task 8), `Usuario`/`Perfil` types (Task 2).
- Produces: a working login flow — later plans (Financeiro/Produção/Estoque/Admin) replace `PlaceholderScreen` with real screens per profile.

- [ ] **Step 1: Write `src/renderer/global.d.ts`**

```typescript
import type { Usuario } from '../shared/types'

declare global {
  interface Window {
    api: {
      getDbFolderPath(): Promise<{ dbFolderPath: string } | null>
      setDbFolderPath(dbFolderPath: string): Promise<void>
      login(login: string, senha: string): Promise<Usuario | null>
      ensureSeedAdmin(): Promise<void>
    }
  }
}

export {}
```

- [ ] **Step 2: Write `src/renderer/auth/AuthContext.tsx`**

```typescript
import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Usuario } from '../../shared/types'

interface AuthContextValue {
  user: Usuario | null
  login: (login: string, senha: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null)

  async function login(loginValue: string, senha: string): Promise<boolean> {
    const found = await window.api.login(loginValue, senha)
    if (found) {
      setUser(found)
      return true
    }
    return false
  }

  function logout() {
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

- [ ] **Step 3: Write `src/renderer/screens/SetupFolder.tsx`**

```typescript
import { useState } from 'react'

export default function SetupFolder({ onConfigured }: { onConfigured: () => void }) {
  const [path, setPath] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!path.trim()) return
    setSaving(true)
    await window.api.setDbFolderPath(path.trim())
    await window.api.ensureSeedAdmin()
    setSaving(false)
    onConfigured()
  }

  return (
    <div>
      <h1>Configuração inicial</h1>
      <p>Informe o caminho da pasta compartilhada na rede (ex: \\SERVIDOR\bt_fitas):</p>
      <input
        value={path}
        onChange={(e) => setPath(e.target.value)}
        placeholder="\\SERVIDOR\bt_fitas"
        style={{ width: '400px' }}
      />
      <button onClick={handleSave} disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Write `src/renderer/screens/Login.tsx`**

```typescript
import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const [loginValue, setLoginValue] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    const ok = await login(loginValue, senha)
    if (!ok) setErro('Usuário ou senha inválidos')
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>bt_fitas — Login</h1>
      <div>
        <label>Usuário</label>
        <input value={loginValue} onChange={(e) => setLoginValue(e.target.value)} />
      </div>
      <div>
        <label>Senha</label>
        <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
      </div>
      {erro && <p style={{ color: 'red' }}>{erro}</p>}
      <button type="submit">Entrar</button>
    </form>
  )
}
```

- [ ] **Step 5: Write `src/renderer/screens/PlaceholderScreen.tsx`**

```typescript
import { useAuth } from '../auth/AuthContext'

export default function PlaceholderScreen() {
  const { user, logout } = useAuth()

  return (
    <div>
      <p>
        Logado como <strong>{user?.nome}</strong> ({user?.perfil})
        <button onClick={logout} style={{ marginLeft: '1rem' }}>
          Sair
        </button>
      </p>
      <p>Tela de "{user?.perfil}" em construção.</p>
    </div>
  )
}
```

- [ ] **Step 6: Rewrite `src/renderer/App.tsx`**

```typescript
import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './auth/AuthContext'
import SetupFolder from './screens/SetupFolder'
import Login from './screens/Login'
import PlaceholderScreen from './screens/PlaceholderScreen'

function Routed() {
  const { user } = useAuth()
  const [configured, setConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    window.api.getDbFolderPath().then((config) => setConfigured(config !== null))
  }, [])

  if (configured === null) return <p>Carregando...</p>
  if (!configured) return <SetupFolder onConfigured={() => setConfigured(true)} />
  if (!user) return <Login />
  return <PlaceholderScreen />
}

export default function App() {
  return (
    <AuthProvider>
      <Routed />
    </AuthProvider>
  )
}
```

- [ ] **Step 7: Manual verification**

Run: `npm run dev`
Expected: app shows the setup screen (first run) → after saving a folder path, shows the login screen → logging in with `admin` / `admin123` shows the placeholder screen with "Logado como Administrador (admin)".

- [ ] **Step 8: Commit**

```bash
git add src/renderer/
git commit -m "feat: add setup, login, and role placeholder screens"
```

---

## Task 10: Daily backup on startup

**Files:**
- Create: `src/main/backup.ts`
- Test: `tests/main/backup.test.ts`
- Modify: `electron/main.ts`

**Interfaces:**
- Consumes: nothing beyond Node's `fs`/`path` (pure file-copy logic, testable without Electron).
- Produces: `ensureDailyBackup(dbFilePath: string, backupsDir: string, today: string): void` — called from `main.ts` after `openDatabase`.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/main/backup.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ensureDailyBackup } from '../../src/main/backup'

let tmpDir: string
let dbFilePath: string
let backupsDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'btfitas-backup-'))
  dbFilePath = path.join(tmpDir, 'dados.db')
  fs.writeFileSync(dbFilePath, 'fake-db-content')
  backupsDir = path.join(tmpDir, 'backups')
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('ensureDailyBackup', () => {
  it('creates a backup file named with the given date if none exists', () => {
    ensureDailyBackup(dbFilePath, backupsDir, '2026-09-12')

    const expected = path.join(backupsDir, 'dados-2026-09-12.db')
    expect(fs.existsSync(expected)).toBe(true)
    expect(fs.readFileSync(expected, 'utf-8')).toBe('fake-db-content')
  })

  it('does not overwrite an existing backup for the same day', () => {
    fs.mkdirSync(backupsDir, { recursive: true })
    const expected = path.join(backupsDir, 'dados-2026-09-12.db')
    fs.writeFileSync(expected, 'original-backup')

    ensureDailyBackup(dbFilePath, backupsDir, '2026-09-12')

    expect(fs.readFileSync(expected, 'utf-8')).toBe('original-backup')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/main/backup.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write `src/main/backup.ts`**

```typescript
import fs from 'node:fs'
import path from 'node:path'

export function ensureDailyBackup(
  dbFilePath: string,
  backupsDir: string,
  today: string
): void {
  const backupPath = path.join(backupsDir, `dados-${today}.db`)
  if (fs.existsSync(backupPath)) return

  fs.mkdirSync(backupsDir, { recursive: true })
  fs.copyFileSync(dbFilePath, backupPath)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/main/backup.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Wire into `electron/main.ts`**

Add near the top, after imports:
```typescript
import { ensureDailyBackup } from '../src/main/backup'
```

In both places where `openDatabase(dbFilePath)` is called (inside `config:set` handler and the `existing` config branch), add right after:
```typescript
const backupsDir = path.join(path.dirname(dbFilePath), 'backups')
const today = new Date().toISOString().slice(0, 10)
ensureDailyBackup(dbFilePath, backupsDir, today)
```

- [ ] **Step 6: Run full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/main/backup.ts tests/main/backup.test.ts electron/main.ts
git commit -m "feat: add daily backup of the shared database on startup"
```

---

## Self-Review Notes

- Spec coverage: architecture (Electron shell, single app, network folder) ✓ Task 1/8; shared folder config ✓ Task 4; SQLite journal mode/busy_timeout ✓ Task 5; write lock ✓ Task 6; auth/login individual ✓ Task 7/8/9; backup diário ✓ Task 10. Screens for Financeiro/Produção/Estoque/Admin content, pedido/OP/estoque workflow, and polling for live updates are intentionally **out of scope for this plan** — they are separate follow-up plans (one per profile) building on this foundation, per the spec's own module boundaries.
- Placeholder scan: no TBD/TODO; all steps contain complete, runnable code.
- Type consistency: `Usuario`/`Perfil` (Task 2) used identically across repo (Task 7), IPC (Task 8), and renderer (Task 9); `openDatabase`/`withWriteLock` signatures consistent across Tasks 5–7.
