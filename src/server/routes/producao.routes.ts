import { Router } from 'express'
import * as producaoController from '../controllers/producao.controller'
import { exigirPerfil } from '../middlewares/auth'

const router = Router()

router.use(exigirPerfil('producao'))
router.get('/ops-abertas', producaoController.listarOpsAbertas)
router.get('/ops/:id', producaoController.buscarOp)
router.get('/ops/:id/apontamentos', producaoController.listarApontamentos)
router.patch('/ops/:id/encerrar', producaoController.encerrarOp)
router.post('/apontamentos', producaoController.criarApontamento)

export default router
