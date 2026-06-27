import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// On GitHub Pages a project site is served from /<repo>/.
// The deploy workflow sets PAGES_BASE=/<repo>/ so forks work without edits.
// Falls back to /pray/ for local dev and the canonical repo.
const base = process.env.PAGES_BASE || '/pray/'

export default defineConfig({
  base,
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Pray — Curated Christian Prayers',
        short_name: 'Pray',
        description:
          'A searchable, offline-ready collection of curated Christian prayers from the Roman Catholic, Eastern Orthodox, and Protestant traditions.',
        lang: 'en',
        dir: 'ltr',
        theme_color: '#2b2426',
        background_color: '#faf7f0',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        categories: ['lifestyle', 'books', 'reference'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,webmanifest,woff2}'],
        navigateFallback: base + 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
