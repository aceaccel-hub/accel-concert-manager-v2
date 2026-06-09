import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  server: {
    port: 5175,
    strictPort: true,
    watch: {
      ignored: ['**/node_modules/**', '**/.git/**', '**/.DS_Store', '**/dist/**', '**/*.css.map'],
      usePolling: false,
    },
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5175,
    },
  },
})
