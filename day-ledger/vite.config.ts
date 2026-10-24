/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// base './' lets the built app live in any subfolder (GitHub Pages, Cloudflare Pages, etc.)
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Day Ledger',
        short_name: 'Day Ledger',
        description: 'Daily to-do tracker with nested tasks and a day schedule.',
        theme_color: '#1f4d5c',
        background_color: '#eef0ee',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: { environment: 'node', setupFiles: ['fake-indexeddb/auto'], exclude: ['**/node_modules/**', '**/*.emu.test.ts'] },
});
