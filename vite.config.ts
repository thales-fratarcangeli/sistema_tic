/// <reference types="vitest/config" />
import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'

// Native/runtime Node modules must stay as plain require() calls, not get
// bundled into main.js — bundling breaks better-sqlite3's internal
// __dirname-relative lookup of its prebuilt binary (it ends up resolving
// against main.js's location instead of its own node_modules folder).
// @prisma/* stays external too: its runtime loads the query compiler
// (WebAssembly) from its own package folder.
const externalMainDeps = ['better-sqlite3', 'bcryptjs', 'proper-lockfile', 'express', /^@prisma\//]

// Porta fixa do servidor Express embutido no Electron em desenvolvimento
// (ver DEV_API_PORT em electron/main.ts).
const DESKTOP_DEV_API_PORT = 3001

// Três modos:
//   --mode web      → interface da versão web (e, com --ssr, o servidor)
//   mode "test"     → Vitest
//   padrão          → versão desktop (Electron)
export default defineConfig(({ mode, isSsrBuild }) => {
  const desktop = mode !== 'web' && mode !== 'test'

  const plugins: PluginOption[] = [react()]
  if (desktop) {
    plugins.push(
      electron({
        main: {
          entry: 'electron/main.ts',
          vite: {
            build: {
              // Vite 8+ reads `rolldownOptions` (not `rollupOptions`) for its
              // Rolldown-based bundler.
              rolldownOptions: {
                external: externalMainDeps,
              },
            },
          },
        },
        preload: { input: 'electron/preload.ts' },
      })
    )
  }

  return {
    plugins,
    server: desktop
      ? { proxy: { '/api': `http://127.0.0.1:${DESKTOP_DEV_API_PORT}` } }
      : undefined,
    // `vite build --mode web --ssr src/server/server.ts` empacota o servidor
    // da versão web em dist-server/server.cjs (o package.json é commonjs).
    build: isSsrBuild
      ? {
          outDir: 'dist-server',
          rolldownOptions: { output: { format: 'cjs', entryFileNames: '[name].cjs' } },
        }
      : undefined,
    test: {
      include: ['tests/**/*.test.ts'],
    },
  }
})
