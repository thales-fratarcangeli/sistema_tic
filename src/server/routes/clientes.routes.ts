import { Router } from 'express'
import * as clientesController from '../controllers/clientes.controller'
import { exigirPerfil } from '../middlewares/auth'

const router = Router()

router.use(exigirPerfil('financeiro'))
router.get('/', clientesController.listar)
router.post('/', clientesController.criar)

export default router
