import { Router } from 'express'
import * as usuariosController from '../controllers/usuarios.controller'
import { exigirPerfil } from '../middlewares/auth'

const router = Router()

router.use(exigirPerfil('admin'))
router.get('/', usuariosController.listar)
router.post('/', usuariosController.criar)
router.patch('/:id/ativo', usuariosController.definirAtivo)
router.patch('/:id/perfil', usuariosController.definirPerfil)
router.patch('/:id/senha', usuariosController.redefinirSenha)

export default router
