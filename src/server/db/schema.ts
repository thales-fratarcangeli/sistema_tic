import type { PrismaClient } from '../generated/prisma/client'

/**
 * DDL das tabelas do bt_fitas. Espelha prisma/schema.prisma — os models do
 * Prisma mapeiam exatamente estas tabelas/colunas, e é isso que permite
 * abrir com o Prisma os dados.db criados pelas versões anteriores do app.
 * Tudo é idempotente (IF NOT EXISTS): roda a cada abertura do banco, cria o
 * que faltar e não mexe no que já existe.
 */
export const SCHEMA_SQL = `
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

    -- Garante no banco a regra 1:1 PedidoItem -> OrdemProducao (o
    -- pedidoItemId @unique do schema.prisma). Seguro em bases antigas:
    -- o sistema sempre gerou exatamente uma OP por item.
    CREATE UNIQUE INDEX IF NOT EXISTS ordens_producao_pedido_item_id_key
      ON ordens_producao (pedido_item_id);
`

export async function ensureSchema(prisma: PrismaClient): Promise<void> {
  const statements = SCHEMA_SQL.split(';')
    .map((statement) => statement.replace(/--.*$/gm, '').trim())
    .filter((statement) => statement.length > 0)

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement)
  }
}
