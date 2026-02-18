import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/singstat-api': {
        target: 'https://tablebuilder.singstat.gov.sg',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/singstat-api/, '/api')
      },
      '/onemap-api': {
        target: 'https://www.onemap.gov.sg',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/onemap-api/, '')
      }
    }
  }
})
