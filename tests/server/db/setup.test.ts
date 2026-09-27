import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { setupDatabase } from '../../../src/server/db/setup'
import { connectDatabase, disconnectDatabase } from '../../../src/server/db/client'
import * as usuariosService from '../../../src/server/services/usuarios.service'

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'btfitas-dbsetup-'))
})

afterEach(async () => {
  await disconnectDatabase()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('setupDatabase', () => {
  it('cria a pasta, o banco, o backup do dia e o admin padrão num caminho novo', async () => {
    const dbFolderPath = path.join(tmpDir, 'nao-existe-ainda', 'bt_fitas')
    expect(fs.existsSync(dbFolderPath)).toBe(false)

    const dbFilePath = await setupDatabase(dbFolderPath)

    expect(fs.existsSync(dbFilePath)).toBe(true)
    const today = new Date().toISOString().slice(0, 10)
    expect(fs.existsSync(path.join(dbFolderPath, 'backups', `dados-${today}.db`))).toBe(true)

    const usuarios = await usuariosService.listar()
    expect(usuarios.map((u) => [u.login, u.perfil])).toEqual([['admin', 'admin']])
    expect(await usuariosService.verificarLogin('admin', 'admin123')).not.toBeNull()
  })

  it('pode ser chamado de novo numa pasta já configurada', async () => {
    const dbFolderPath = path.join(tmpDir, 'bt_fitas')
    await setupDatabase(dbFolderPath)
    await setupDatabase(dbFolderPath)
    expect(await usuariosService.listar()).toHaveLength(1)
  })

  it('cria o admin num banco que já existe com schema mas sem usuários', async () => {
    // Reproduz a falha real: o dados.db já existe (ex: execução anterior
    // que caiu antes de criar o usuário), então ninguém consegue entrar.
    const dbFolderPath = path.join(tmpDir, 'bt_fitas')
    fs.mkdirSync(dbFolderPath, { recursive: true })
    await connectDatabase(path.join(dbFolderPath, 'dados.db'))
    expect(await usuariosService.listar()).toHaveLength(0)

    await setupDatabase(dbFolderPath)
    expect((await usuariosService.listar())[0].login).toBe('admin')
  })
})
