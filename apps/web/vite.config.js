import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    // The dev server forwards /api to Express. The browser only ever talks to
    // :5174, so requests are same-origin and need no CORS, exactly like
    // production, where nginx does the same forwarding.
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  build: {
    sourcemap: true,
  },
  css: {
    modules: {
      // Readable class names in dev ("ProductCard_title__x1y2"), short in prod.
      generateScopedName: process.env.NODE_ENV === 'production' ? '[hash:base64:6]' : '[name]_[local]__[hash:base64:4]',
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
