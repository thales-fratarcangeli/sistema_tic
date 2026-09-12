import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'

// Native/runtime Node modules must stay as plain require() calls, not get
// bundled into main.js — bundling breaks better-sqlite3's internal
// __dirname-relative lookup of its prebuilt binary (it ends up resolving
// against main.js's location instead of its own node_modules folder).
const externalMainDeps = ['better-sqlite3', 'bcryptjs', 'proper-lockfile']

export default defineConfig({
  plugins: [
    react(),
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
    }),
  ],
})
