import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Switched from the default generateSW strategy to injectManifest: push
      // notifications need a real `push` event listener in the service
      // worker, which generateSW's auto-generated worker has no hook for.
      // src/sw.ts owns precaching + the API runtime-caching rule that used
      // to live in the `workbox` option below, plus push/notificationclick.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        // App code is small; raise the default 2MB precache limit slightly
        // so the (dev-only, unminified) build doesn't fail precaching.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // xlsx (the Export My Data feature) is ~490KB on its own — a real
        // library, dynamically imported only when someone taps Export, not
        // part of normal app usage. Precaching it at PWA install time would
        // force that download on everyone up front, working against the
        // exact reason the rest of the app got code-split in the first
        // place (this is a mobile-first app for users who may be on
        // metered/slow connections). It'll be fetched normally (and cached
        // from then on, via the NetworkFirst/browser HTTP cache) the first
        // time someone actually exports, instead.
        globIgnores: ['**/xlsx-*.js'],
      },
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Batchkeeper',
        short_name: 'Batchkeeper',
        description: 'Production, inventory, and sales log for cosmetics and soap makers',
        theme_color: '#0F766E',
        background_color: '#F7F7F5',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
    }),
  ],
})
