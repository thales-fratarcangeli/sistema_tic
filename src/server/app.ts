import express, { type RequestHandler } from 'express'
import apiRoutes from './routes'

export interface AppOptions {
  /**
   * Middleware que entrega a interface React: express.static da pasta
   * dist/ em produção, ou o middleware do Vite em desenvolvimento.
   */
  frontend?: RequestHandler
}

/**
 * Monta o app Express usado pelas duas versões do sistema: a web
 * (src/server/server.ts) e a desktop (electron/main.ts, que sobe este
 * mesmo app só em 127.0.0.1).
 */
export function createApp({ frontend }: AppOptions = {}) {
  const app = express()
  app.disable('x-powered-by')

  app.use('/api', apiRoutes)
  if (frontend) app.use(frontend)

  return app
}
