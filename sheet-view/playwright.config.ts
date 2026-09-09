import { defineConfig, devices } from '@playwright/test'
import process from 'node:process'

/**
 * End-to-end config. Playwright drives a real Chromium against a production
 * build served by `vite preview`, so these tests catch what jsdom unit tests
 * cannot: layout, real event dispatch, the router/query-param wiring, and the
 * chord-diagram SVGs.
 *
 * See https://playwright.dev/docs/test-configuration.
 */
const PORT = 4173
const CI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Fail the build on a stray test.only committed by mistake.
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 1 : undefined,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Self-contained: build then preview. `reuseExistingServer` skips the
    // rebuild when a dev/preview server is already up locally.
    command: 'bun run build && bun run preview',
    port: PORT,
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
})
