import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const backend = loadEnv(mode, process.cwd(), '').VITE_BACKEND_URL || 'http://localhost:8080'
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      port: 5173,
      // Cùng nguồn với trình duyệt: cookie phiên đi kèm, không cần cấu hình CORS khi phát triển.
      proxy: {
        '/api': { target: backend, changeOrigin: true },
        '/ws': { target: backend, ws: true, changeOrigin: true },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  }
})
