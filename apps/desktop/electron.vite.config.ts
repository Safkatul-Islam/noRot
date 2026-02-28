import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/main',
      lib: {
        entry: resolve('electron/main.ts'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/preload',
      lib: {
        entry: resolve('electron/preload.ts'),
      },
    },
  },
  renderer: {
    publicDir: resolve('assets'),
    plugins: [react(), tailwindcss()],
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: {
          index: resolve('src/index.html'),
        },
      },
    },
    resolve: {
      alias: {
        '@': resolve('src'),
      },
    },
    root: resolve('src'),
  },
})