import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as clientesService from '../../../src/server/services/clientes.service'
import * as produtosService from '../../../src/server/services/produtos.service'
import * as usuariosService from '../../../src/server/services/usuarios.service'
import { abrirBancoDeTeste, fecharBancoDeTeste, criarUsuario } from '../helpers'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await abrirBancoDeTeste('cadastros')
})

afterEach(() => fecharBancoDeTeste(tmpDir))

describe('clientes.service', () => {
  it('cria um cliente e lista de volta, com campos opcionais nulos', async () => {
    await clientesService.criar({
      codigo: '7456',
      nome: 'Thiago Antunes Distribuidora',
      cnpjCpf: '47736271000173',
      cidade: 'Franca',
      telefone: '993685945',
    })

    const [cliente] = await clientesService.listar()
    expect(cliente.nome).toBe('Thiago Antunes Distribuidora')
    expect(cliente.cidade).toBe('Franca')
    expect(cliente.bairro).toBeNull()
  })

  it('lista em ordem alfabética', async () => {
    await clientesService.criar({ codigo: '2', nome: 'Zeta', cnpjCpf: '2' })
    await clientesService.criar({ codigo: '1', nome: 'Alfa', cnpjCpf: '1' })
    expect((await clientesService.listar()).map((c) => c.nome)).toEqual(['Alfa', 'Zeta'])
  })

  it('rejeita campos obrigatórios vazios (400) e código repetido (409)', async () => {
    await expect(clientesService.criar({ codigo: ' ', nome: 'X', cnpjCpf: '1' })).rejects.toMatchObject({
      statusCode: 400,
    })
    await clientesService.criar({ codigo: '1', nome: 'Alfa', cnpjCpf: '1' })
    await expect(clientesService.criar({ codigo: '1', nome: 'Beta', cnpjCpf: '2' })).rejects.toMatchObject({
      statusCode: 409,
    })
  })
})

describe('produtos.service', () => {
  it('cria e lista produtos por descrição', async () => {
    await produtosService.criar({ codigo: '2', descricao: 'FITA B', unidade: 'ROLO', valorUnitarioPadrao: 2 })
    await produtosService.criar({ codigo: '1', descricao: 'FITA A', unidade: 'ROLO', valorUnitarioPadrao: 1.5 })

    const produtos = await produtosService.listar()
    expect(produtos.map((p) => p.descricao)).toEqual(['FITA A', 'FITA B'])
    expect(produtos[0].valorUnitarioPadrao).toBe(1.5)
  })

  it('rejeita valor unitário inválido', async () => {
    await expect(
      produtosService.criar({ codigo: '1', descricao: 'X', unidade: 'UN', valorUnitarioPadrao: -1 })
    ).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('usuarios.service', () => {
  it('cria usuário com senha em hash e confere o login', async () => {
    await criarUsuario('ana', 'financeiro', 'senha123')

    const found = await usuariosService.verificarLogin('ana', 'senha123')
    expect(found?.perfil).toBe('financeiro')
    expect(found).not.toHaveProperty('senhaHash')
    expect(await usuariosService.verificarLogin('ana', 'errada')).toBeNull()
  })

  it('não autentica usuário inativo', async () => {
    const user = await criarUsuario('bob', 'producao', 'senha123')
    await usuariosService.definirAtivo(user.id, false)
    expect(await usuariosService.verificarLogin('bob', 'senha123')).toBeNull()
  })

  it('troca o perfil e redefine a senha', async () => {
    const user = await criarUsuario('ana', 'financeiro', 'senhaAntiga')
    await usuariosService.definirPerfil(user.id, 'admin')
    await usuariosService.redefinirSenha(user.id, 'senhaNova')

    expect((await usuariosService.listar())[0].perfil).toBe('admin')
    expect(await usuariosService.verificarLogin('ana', 'senhaAntiga')).toBeNull()
    expect(await usuariosService.verificarLogin('ana', 'senhaNova')).not.toBeNull()
  })

  it('rejeita login repetido (409) e perfil inválido (400)', async () => {
    await criarUsuario('ana', 'financeiro')
    await expect(criarUsuario('ana', 'estoque')).rejects.toMatchObject({ statusCode: 409 })
    await expect(
      usuariosService.criar({ nome: 'X', login: 'x', senha: 'x', perfil: 'gerente' as never })
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('garantirAdminInicial só cria o admin quando não há usuários', async () => {
    await usuariosService.garantirAdminInicial()
    await usuariosService.garantirAdminInicial()
    const usuarios = await usuariosService.listar()
    expect(usuarios.map((u) => u.login)).toEqual(['admin'])
  })
})
