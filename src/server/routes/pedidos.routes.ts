import { Router } from 'express'
import * as pedidosController from '../controllers/pedidos.controller'
import { exigirPerfil } from '../middlewares/auth'

const router = Router()

router.use(exigirPerfil('financeiro'))
router.get('/', pedidosController.listar)
router.post('/', pedidosController.criar)

export default router
