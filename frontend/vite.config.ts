import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
    tailwindcss()
  ],
  server: {
    host: "0.0.0.0",
    port: 3000, // Change default port to 3000
    proxy: {
      '/api': {
        target: 'http://backend:8080',
        changeOrigin: true
      }
    },
    allowedHosts: ['metropolitan.foundre.app']
  },
  test: {
    globals: true,  // This enables the use of global `expect` and `test`
    environment: 'jsdom',
    coverage: {
      provider: "v8", // or "istanbul"
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage"
    },
    exclude: [
      ...configDefaults.exclude,
      'src/tests/integration/*'
    ]
  },
})
