import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
      // Proxies the upstream election JSON to avoid browser CORS blocks in dev.
      '/upstream': {
        target: 'https://result.election.gov.np',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/upstream/, ''),
        secure: true,
      },
    },
  },
})
