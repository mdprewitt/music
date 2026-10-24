import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  // Set by CI so production assets resolve under the project-page subpath
  // (https://mdprewitt.github.io/music/). Unset locally -> served at '/'.
  base: process.env.BASE_PATH || '/',
  plugins: [
    vue(),
    vueDevTools(),
  ],
  // Listen on all interfaces so the dev server (and `vite preview`) can be opened
  // from a tablet/phone on the same network.
  // allowedHosts: Vite rejects requests whose Host header isn't listed (DNS-rebinding guard),
  // so the machine's Tailscale name must be named explicitly.
  server: { host: '0.0.0.0', allowedHosts: ['mirkwood.tail136b7f.ts.net'] },
  preview: { host: '0.0.0.0' },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
