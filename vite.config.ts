import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiTarget = 'http://backend:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'app3.andrepombo.info',
      // plus any others you need
    ],
    proxy: {
      '/api': {
        target: apiTarget, // e.g. http://backend:8000
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

