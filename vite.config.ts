import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base relativa: funciona no GitHub Pages em qualquer caminho
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes('node_modules/three') ? 'three' : undefined),
      },
    },
  },
})
