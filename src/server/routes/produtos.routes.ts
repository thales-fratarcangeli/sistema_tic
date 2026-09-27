import { Router } from 'express'
import * as produtosController from '../controllers/produtos.controller'
import { exigirPerfil } from '../middlewares/auth'

const router = Router()

router.use(exigirPerfil('financeiro'))
router.get('/', produtosController.listar)
router.post('/', produtosController.criar)

export default router
