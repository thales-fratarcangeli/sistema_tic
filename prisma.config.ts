import { defineConfig } from 'prisma/config'

// Usado só pela CLI do Prisma (generate, studio, db pull). Em runtime a
// conexão é aberta por src/server/db/client.ts, com o caminho escolhido
// pelo app desktop ou pela variável BT_FITAS_DATA_DIR na versão web.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? 'file:./data/dados.db',
  },
})
