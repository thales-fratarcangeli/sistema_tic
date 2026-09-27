import { Router } from 'express'
import * as estoqueController from '../controllers/estoque.controller'
import { exigirPerfil } from '../middlewares/auth'

const router = Router()

router.use(exigirPerfil('estoque'))
router.get('/aguardando-entrada', estoqueController.listarAguardandoEntrada)
router.get('/em-estoque', estoqueController.listarEmEstoque)
router.post('/entradas', estoqueController.registrarEntrada)
router.post('/saidas', estoqueController.registrarSaida)

export default router
