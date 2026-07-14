import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4321' },
  // Astro 7's `astro dev` runs as a background daemon, which Playwright's
  // webServer can't manage (the foreground process exits immediately). Test
  // against the built output via `astro preview` — this is what Cloudflare
  // actually serves, so it's a more faithful gate.
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
