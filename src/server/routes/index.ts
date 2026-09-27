import express, { Router, type Request, type Response, type NextFunction } from 'express'
import { AppError } from '../errors/AppError'
import { isDatabaseConnected } from '../db/client'
import { autenticar } from '../middlewares/auth'
import { errorHandler } from '../middlewares/errorHandler'
import authRoutes from './auth.routes'
import clientesRoutes from './clientes.routes'
import produtosRoutes from './produtos.routes'
import pedidosRoutes from './pedidos.routes'
import producaoRoutes from './producao.routes'
import estoqueRoutes from './estoque.routes'
import usuariosRoutes from './usuarios.routes'

const router = Router()

// Dentro do router (e não no app) para que um JSON malformado caia no
// errorHandler abaixo e vire um 400 em JSON, como os demais erros.
router.use(express.json())

router.get('/status', (_req, res) => {
  res.status(200).json({ bancoConfigurado: isDatabaseConnected() })
})

// No app desktop o servidor sobe antes de o usuário escolher a pasta do
// banco; até lá, qualquer rota de dados responde 503.
router.use((_req: Request, _res: Response, next: NextFunction) => {
  if (!isDatabaseConnected()) throw new AppError('Banco de dados ainda não configurado', 503)
  next()
})

router.use('/auth', authRoutes)

// Daqui para baixo, tudo exige login.
router.use(autenticar)
router.use('/clientes', clientesRoutes)
router.use('/produtos', produtosRoutes)
router.use('/pedidos', pedidosRoutes)
router.use('/producao', producaoRoutes)
router.use('/estoque', estoqueRoutes)
router.use('/usuarios', usuariosRoutes)

router.use(() => {
  throw new AppError('Rota não encontrada', 404)
})

// Registrado por último: só recebe os erros lançados pelos handlers acima.
router.use(errorHandler)

export default router
