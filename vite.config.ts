import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8073',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../auditmate-backend-v2/static',
    emptyOutDir: true,
  },
})
