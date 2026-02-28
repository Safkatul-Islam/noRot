import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    build: {
      lib: {
        entry: resolve('electron/main.ts')
      },
      externalizeDeps: true,
      rollupOptions: {
        external: ['better-sqlite3', 'get-windows']
      }
    }
  },
  preload: {
    build: {
      lib: {
        entry: resolve('electron/preload.ts')
      },
      externalizeDeps: true
    }
  },
  renderer: {
    root: resolve('src'),
    build: {
      rollupOptions: {
        input: resolve('src/index.html')
      }
    },
    resolve: {
      alias: {
        '@': resolve('src')
      },
      dedupe: ['react', 'react-dom']
    },
    plugins: [react()]
  }
})
