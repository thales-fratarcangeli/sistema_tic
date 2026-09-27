import path from 'node:path'
import express, { type RequestHandler } from 'express'
import { createApp } from './app'
import { setupDatabase } from './db/setup'

/**
 * Versão web: um único servidor na rede da fábrica, acessado pelo
 * navegador de cada computador. Serve a API em /api e a interface React.
 *
 *   npm run dev:web    →  com o Vite em modo middleware (hot reload)
 *   npm run start:web  →  produção, servindo o build em dist/
 *
 * Variáveis de ambiente:
 *   PORT                porta HTTP (padrão 3000)
 *   HOST                interface de rede (padrão 0.0.0.0 — toda a rede)
 *   BT_FITAS_DATA_DIR   pasta do dados.db e dos backups (padrão ./data)
 */
async function main() {
  const dev = process.argv.includes('--dev')
  const dataDir = path.resolve(process.env.BT_FITAS_DATA_DIR ?? 'data')

  const dbFilePath = await setupDatabase(dataDir)

  let frontend: RequestHandler
  if (dev) {
    const { createServer } = await import('vite')
    const vite = await createServer({
      mode: 'web',
      server: { middlewareMode: true },
      appType: 'spa',
    })
    frontend = vite.middlewares
  } else {
    frontend = express.static(path.resolve('dist'))
  }

  const port = Number(process.env.PORT ?? 3000)
  const host = process.env.HOST ?? '0.0.0.0'
  createApp({ frontend }).listen(port, host, () => {
    console.log(`BT Fitas (web) rodando em http://localhost:${port}`)
    console.log(`Banco de dados: ${dbFilePath}`)
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
