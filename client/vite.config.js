import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/battleship/',  // Important for subdirectory deployment!
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://vibe-hunter.com',
        changeOrigin: true,
        secure: true
      }
    }
  }
})