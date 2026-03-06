import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // we use our own /public/manifest.webmanifest
      injectRegister: null, // we register manually in main.tsx
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        // SPA: all navigation falls back to index.html (React Router handles routing)
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/upstream\//,
          /\/offline\.html$/,
          /\/ads\.txt$/,
          /\/robots\.txt$/,
          /\/sitemap\.xml$/,
          /\/manifest\.webmanifest$/,
        ],
        runtimeCaching: [
          {
            // Cache the Election Commission upstream JSON (NetworkFirst — always try live)
            urlPattern: /^https:\/\/result\.election\.gov\.np\/JSONFiles\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'election-json',
              networkTimeoutSeconds: 10,
              expiration: {
                maxAgeSeconds: 5 * 60, // 5 minutes
                maxEntries: 5,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache candidate images (CacheFirst — images don't change)
            urlPattern: /^https:\/\/result\.election\.gov\.np\/Images\/Candidate\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'candidate-images',
              expiration: {
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
                maxEntries: 500,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // CDN R2 data (StaleWhileRevalidate — fast + fresh)
            urlPattern: /^https:\/\/.*\.r2\.cloudflarestorage\.com\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'cdn-r2',
              expiration: {
                maxAgeSeconds: 2 * 60, // 2 minutes
                maxEntries: 10,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // Proxies the upstream election JSON to avoid browser CORS blocks in dev.
      '/upstream': {
        target: 'https://result.election.gov.np',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/upstream/, ''),
        secure: true,
      },
    },
  },
})
