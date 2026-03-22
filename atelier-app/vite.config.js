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
    // Workaround: explicit entry avoids Vite failing on "#" in path
    rollupOptions: {
      input: fileURLToPath(new URL('./index.html', import.meta.url)),
      external: ['@capacitor/status-bar'],
    },
  },
  server: {
    host: true,
    https: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
