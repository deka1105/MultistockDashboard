import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        // In Docker: service name 'api'. Outside Docker: set VITE_API_URL=http://localhost:8000
        target: process.env.VITE_API_URL ?? 'http://api:8000',
        changeOrigin: true,
      },
    },
  },
})
