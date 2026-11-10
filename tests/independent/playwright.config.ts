import { defineConfig } from '@playwright/test';

/**
 * Independent tester suite. Separate from the engineer's config on purpose:
 * own port (4400), own report folder, Google Chrome channel, no browser download.
 * Run from the project root:  npx playwright test -c tests/independent/playwright.config.ts
 */
const PORT = 4400;

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.ind\.ts$/,
  outputDir: '../reports/independent/test-results',
  fullyParallel: true,
  workers: 4,
  timeout: 90_000,
  expect: { timeout: 5_000 },
  reporter: [
    ['list'],
    ['json', { outputFile: '../reports/independent/results.json' }],
  ],
  use: {
    channel: 'chrome',
    baseURL: `http://127.0.0.1:${PORT}`,
  },
  webServer: {
    command: `npx serve dist -l tcp://127.0.0.1:${PORT} --no-port-switching -L`,
    cwd: '../..',
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
