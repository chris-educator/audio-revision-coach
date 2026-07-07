import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  server: {
    port: 5203,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY ?? 'http://127.0.0.1:8029',
        changeOrigin: true,
        proxyTimeout: 600_000,
        timeout: 600_000,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 4173,
  },
})
