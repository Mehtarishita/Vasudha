import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Disable caching for development
    headers: {
      'Cache-Control': 'no-store',
    },
    // Force reload on file changes
    watch: {
      usePolling: true,
    },
    // Clear cache on server start
    force: true,
    // Proxy API requests to serverless function
    proxy: {
      '/api/otp': {
        target: 'http://localhost:5173',
        rewrite: (path) => path.replace(/^\/api\/otp/, '/api/otp'),
      }
    }
  },
  // Disable build cache
  cacheDir: '.vite',
  optimizeDeps: {
    force: true, // Force re-optimization on every server start
  },
})
