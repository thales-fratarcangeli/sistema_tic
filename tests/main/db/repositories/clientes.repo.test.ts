import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { openDatabase } from '../../../../src/main/db/connection'
import { createCliente, listClientes } from '../../../../src/main/db/repositories/clientes.repo'

let tmpDir: string
let dbPath: string
let db: ReturnType<typeof openDatabase>

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'btfitas-clientes-'))
  dbPath = path.join(tmpDir, 'dados.db')
  db = openDatabase(dbPath)
})

afterEach(() => {
  db.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('clientes.repo', () => {
  it('creates a cliente and lists it back', async () => {
    await createCliente(db, dbPath, {
      codigo: '7456',
      nome: 'Thiago Antunes Distribuidora',
      cnpjCpf: '47736271000173',
      cidade: 'Franca',
      telefone: '993685945',
    })

    const clientes = listClientes(db)
    expect(clientes.length).toBe(1)
    expect(clientes[0].nome).toBe('Thiago Antunes Distribuidora')
    expect(clientes[0].cidade).toBe('Franca')
    expect(clientes[0].bairro).toBeNull()
  })

  it('lists clientes ordered by name', async () => {
    await createCliente(db, dbPath, { codigo: '2', nome: 'Zeta', cnpjCpf: '2' })
    await createCliente(db, dbPath, { codigo: '1', nome: 'Alfa', cnpjCpf: '1' })

    const clientes = listClientes(db)
    expect(clientes.map((c) => c.nome)).toEqual(['Alfa', 'Zeta'])
  })
})
