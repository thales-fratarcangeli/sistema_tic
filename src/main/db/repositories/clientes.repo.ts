import type Database from 'better-sqlite3'
import { withWriteLock } from '../lock'
import type { Cliente } from '../../../shared/types'

interface CreateClienteInput {
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

function rowToCliente(row: any): Cliente {
  return {
    id: row.id,
    codigo: row.codigo,
    nome: row.nome,
    cnpjCpf: row.cnpj_cpf,
    inscricaoRg: row.inscricao_rg,
    endereco: row.endereco,
    bairro: row.bairro,
    cidade: row.cidade,
    cep: row.cep,
    telefone: row.telefone,
    celular: row.celular,
  }
}

export async function createCliente(
  db: Database.Database,
  dbFilePath: string,
  input: CreateClienteInput
): Promise<Cliente> {
  return withWriteLock(dbFilePath, () => {
    const stmt = db.prepare(
      `INSERT INTO clientes (codigo, nome, cnpj_cpf, inscricao_rg, endereco, bairro, cidade, cep, telefone, celular)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    const result = stmt.run(
      input.codigo,
      input.nome,
      input.cnpjCpf,
      input.inscricaoRg ?? null,
      input.endereco ?? null,
      input.bairro ?? null,
      input.cidade ?? null,
      input.cep ?? null,
      input.telefone ?? null,
      input.celular ?? null
    )
    const row = db.prepare('SELECT * FROM clientes WHERE id = ?').get(result.lastInsertRowid)
    return rowToCliente(row)
  })
}

export function listClientes(db: Database.Database): Cliente[] {
  return db.prepare('SELECT * FROM clientes ORDER BY nome').all().map(rowToCliente)
}
