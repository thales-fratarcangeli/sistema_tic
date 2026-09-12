import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { openDatabase } from '../../../../src/main/db/connection'
import { createProduto, listProdutos } from '../../../../src/main/db/repositories/produtos.repo'

let tmpDir: string
let dbPath: string
let db: ReturnType<typeof openDatabase>

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'btfitas-produtos-'))
  dbPath = path.join(tmpDir, 'dados.db')
  db = openDatabase(dbPath)
})

afterEach(() => {
  db.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('produtos.repo', () => {
  it('creates a produto and lists it back', async () => {
    await createProduto(db, dbPath, {
      codigo: '137',
      descricao: 'FITA PP 45MM X 100MTS TRANSPARENTE',
      unidade: 'ROLO',
      valorUnitarioPadrao: 5.9,
    })

    const produtos = listProdutos(db)
    expect(produtos.length).toBe(1)
    expect(produtos[0].descricao).toBe('FITA PP 45MM X 100MTS TRANSPARENTE')
    expect(produtos[0].valorUnitarioPadrao).toBe(5.9)
  })
})
