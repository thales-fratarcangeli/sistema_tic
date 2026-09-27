import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import request from 'supertest'
import { createApp } from '../../src/server/app'
import { setupDatabase } from '../../src/server/db/setup'
import { disconnectDatabase } from '../../src/server/db/client'

// Testa a API de ponta a ponta (rotas → controllers → services →
// repositories → SQLite), do mesmo jeito que as telas a usam.

const app = createApp()
let tmpDir: string

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'btfitas-api-'))
  await setupDatabase(tmpDir)
})

afterEach(async () => {
  await disconnectDatabase()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

async function entrar(login: string, senha: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ login, senha }).expect(200)
  return res.body.token
}

async function criarUsuarioELogar(admin: string, login: string, perfil: string) {
  await request(app)
    .post('/api/usuarios')
    .set('Authorization', `Bearer ${admin}`)
    .send({ nome: login, login, senha: 'x', perfil })
    .expect(201)
  return entrar(login, 'x')
}

describe('API /api', () => {
  it('responde 503 enquanto o banco não está configurado (app desktop antes do setup)', async () => {
    await disconnectDatabase()
    await request(app).get('/api/status').expect(200, { bancoConfigurado: false })
    await request(app).post('/api/auth/login').send({ login: 'admin', senha: 'admin123' }).expect(503)
  })

  it('exige login e recusa senha errada', async () => {
    await request(app).get('/api/clientes').expect(401)
    await request(app).post('/api/auth/login').send({ login: 'admin', senha: 'errada' }).expect(401)
    await request(app).get('/api/clientes').set('Authorization', 'Bearer token-invalido').expect(401)
  })

  it('bloqueia rotas de outro perfil (403) e libera tudo para o admin', async () => {
    const admin = await entrar('admin', 'admin123')
    const producao = await criarUsuarioELogar(admin, 'bob', 'producao')

    await request(app).get('/api/clientes').set('Authorization', `Bearer ${producao}`).expect(403)
    await request(app).get('/api/usuarios').set('Authorization', `Bearer ${producao}`).expect(403)
    await request(app).get('/api/producao/ops-abertas').set('Authorization', `Bearer ${producao}`).expect(200)
    await request(app).get('/api/clientes').set('Authorization', `Bearer ${admin}`).expect(200)
  })

  it('desativar um usuário derruba a sessão dele na hora', async () => {
    const admin = await entrar('admin', 'admin123')
    const bob = await criarUsuarioELogar(admin, 'bob', 'producao')
    const { body: usuarios } = await request(app).get('/api/usuarios').set('Authorization', `Bearer ${admin}`)
    const bobId = usuarios.find((u: { login: string }) => u.login === 'bob').id

    await request(app)
      .patch(`/api/usuarios/${bobId}/ativo`)
      .set('Authorization', `Bearer ${admin}`)
      .send({ ativo: false })
      .expect(200)
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${bob}`).expect(401)
  })

  it('fluxo completo: pedido → OP → apontamentos → encerramento → estoque', async () => {
    const admin = await entrar('admin', 'admin123')
    const auth = { Authorization: `Bearer ${admin}` }

    const cliente = await request(app)
      .post('/api/clientes')
      .set(auth)
      .send({ codigo: '7456', nome: 'Thiago Antunes Distribuidora', cnpjCpf: '47736271000173' })
      .expect(201)
    const produto = await request(app)
      .post('/api/produtos')
      .set(auth)
      .send({ codigo: '137', descricao: 'FITA PP 45MM', unidade: 'ROLO', valorUnitarioPadrao: 5.9 })
      .expect(201)

    // usuarioId do corpo é ignorado: o autor é sempre quem está logado.
    const pedido = await request(app)
      .post('/api/pedidos')
      .set(auth)
      .send({
        clienteId: cliente.body.id,
        usuarioId: 999,
        itens: [{ produtoId: produto.body.id, quantidade: 144, valorUnitario: 5.9 }],
      })
      .expect(201)
    expect(pedido.body.numero).toBe(1)

    const ops = await request(app).get('/api/producao/ops-abertas').set(auth).expect(200)
    expect(ops.body).toHaveLength(1)
    const opId = ops.body[0].id

    await request(app).post('/api/producao/apontamentos').set(auth).send({ opId, quantidade: 80 }).expect(201)
    await request(app).post('/api/producao/apontamentos').set(auth).send({ opId, quantidade: 64 }).expect(201)

    const op = await request(app).get(`/api/producao/ops/${opId}`).set(auth).expect(200)
    expect(op.body.quantidadeProduzida).toBe(144)
    expect(op.body.status).toBe('em_andamento')
    expect(op.body.apontamentos).toHaveLength(2)

    // Casos de erro do apontamento: 400, 404 e (depois de encerrar) 409.
    await request(app)
      .post('/api/producao/apontamentos')
      .set(auth)
      .send({ opId, quantidade: 0 })
      .expect(400, { error: 'Quantidade do apontamento precisa ser maior que zero' })
    await request(app)
      .post('/api/producao/apontamentos')
      .set(auth)
      .send({ opId: 9999, quantidade: 10 })
      .expect(404, { error: 'OP não encontrada' })

    await request(app).patch(`/api/producao/ops/${opId}/encerrar`).set(auth).expect(200)
    await request(app)
      .post('/api/producao/apontamentos')
      .set(auth)
      .send({ opId, quantidade: 5 })
      .expect(409, { error: 'OP já está encerrada' })

    const aguardando = await request(app).get('/api/estoque/aguardando-entrada').set(auth).expect(200)
    const pedidoItemId = aguardando.body[0].pedidoItemId
    await request(app).post('/api/estoque/entradas').set(auth).send({ pedidoItemId, quantidade: 144 }).expect(201)
    await request(app).post('/api/estoque/saidas').set(auth).send({ pedidoItemId, quantidade: 144 }).expect(201)

    const pedidos = await request(app).get('/api/pedidos').set(auth).expect(200)
    expect(pedidos.body[0].itens[0].status).toBe('finalizado')
  })

  it('responde 400 para id inválido na URL e JSON malformado, e 404 para rota inexistente', async () => {
    const admin = await entrar('admin', 'admin123')
    const auth = { Authorization: `Bearer ${admin}` }

    await request(app).get('/api/producao/ops/abc').set(auth).expect(400)
    await request(app)
      .post('/api/clientes')
      .set(auth)
      .set('Content-Type', 'application/json')
      .send('{nao e json')
      .expect(400)
    await request(app).get('/api/nada').set(auth).expect(404)
  })
})
