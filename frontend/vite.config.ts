import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'MealMind',
        short_name: 'MealMind',
        theme_color: '#C45B28',
        background_color: '#FAF6F0',
        display: 'standalone',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      devOptions: { enabled: true },
      // @ts-ignore runtimeCaching is valid Workbox option not reflected in v1 types
      runtimeCaching: [
        // NetworkFirst for offline-accessible API endpoints (5s timeout, 24h cache)
        {
          urlPattern: /^\/api\/(plans\/current|recipes\/[^/]+|grocery\/[^/]+)$/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'mealmind-api-cache',
            networkTimeoutSeconds: 5,
            expiration: {
              maxAgeSeconds: 86400, // 24 hours
              maxEntries: 50
            }
          }
        },
        // NetworkOnly for streaming/non-cacheable API endpoints
        {
          urlPattern: /^\/api\/(plans\/generate|chat)$/,
          handler: 'NetworkOnly'
        },
        // CacheFirst for static assets (30 days)
        {
          urlPattern: /\.(?:png|jpg|jpeg|gif|svg|webp|woff2|woff|ttf|eot|ico|css|js)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'mealmind-static-cache',
            expiration: {
              maxAgeSeconds: 2592000, // 30 days
              maxEntries: 200
            }
          }
        }
      ]
    })
  ],
})
