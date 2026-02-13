import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isDev = mode === 'development'
  const apiTarget = isDev
    ? (env.VITE_BACKEND_URL || 'http://localhost:8000')
    : 'http://backend:8000'
  return {
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
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})

