import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    basicSsl(),
  ],
  build: {
    // Spitzen-Speicherbedarf des Builds senken: weniger parallele Datei-/
    // Transform-Operationen → der Build läuft auch auf kleinen Servern (wenig
    // RAM) durch, statt mit "JavaScript heap out of memory" / OOM abzubrechen.
    rollupOptions: {
      // Workaround: explicit entry avoids Vite failing on "#" in path
      input: fileURLToPath(new URL('./index.html', import.meta.url)),
      external: ['@capacitor/status-bar'],
      maxParallelFileOps: 2,
    },
    // three.js-Chunk (footSTL) ist bewusst groß und wird lazy geladen — die
    // Größenwarnung ist nur Rauschen, daher Limit anheben.
    chunkSizeWarningLimit: 700,
  },
  server: {
    host: true,
    https: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
