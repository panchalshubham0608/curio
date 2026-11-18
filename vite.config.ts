import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  base: '/curio/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'curio-icon.svg',
        'icons/favicon-64.png',
        'icons/apple-touch-icon.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
      ],
      manifest: {
        id: '/curio/',
        name: 'Curio — Personal Discovery',
        short_name: 'Curio',
        description:
          'Less scrolling. More discovering. A joyful visual feed of surprising facts, stories, and interactive discoveries.',
        theme_color: '#171614',
        background_color: '#FAF8F4',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/curio/',
        start_url: '/curio/',
        categories: ['education', 'news', 'lifestyle'],
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'curio-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,webp,woff2}'],
        globIgnores: ['**/generated/**'],
        navigateFallback: '/curio/index.html',
        navigateFallbackDenylist: [/^\/curio\/generated\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /\/generated\/.*\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'curio-generated-content',
              networkTimeoutSeconds: 4,
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    // Security guideline: default to localhost-only binding.
    // For trusted local Wi-Fi mobile device testing, run `npm run dev:mobile` (passes `--host`).
    // TODO(security): Only use `dev:mobile` on trusted private networks; never expose dev servers on public Wi-Fi.
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/ai'],
          'vendor-ui': ['zod', 'lucide-react'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
