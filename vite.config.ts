import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [
    react(),
    { name: 'admin-index-route', configureServer(server) {
      server.middlewares.use((req: { url?: string }, _res, next) => {
        if (req.url === '/admin/' || req.url === '/admin') req.url = '/admin/index.html'
        next()
      })
    }},
  ],
  build: { rollupOptions: { output: { manualChunks: { 'vendor-three': ['three'] } } } },
  server: { host: true },
})
