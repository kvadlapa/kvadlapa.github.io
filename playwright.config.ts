import { defineConfig } from '@playwright/test';

const fixtures = process.env.FIXTURES === '1';
const port = fixtures ? 4174 : 4173;
const dir = fixtures ? 'dist-fixture' : 'dist';

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  // 3, not 4: with both suites in `npm test`, 4 workers saturated a 10-core machine and Chrome launches stalled.
  workers: 3,
  timeout: 60_000,
  expect: { timeout: 5_000 },
  reporter: [['list'], ['json', { outputFile: `tests/reports/playwright-${process.env.REPORT_NAME ?? (fixtures ? 'fixtures' : 'main')}.json` }]],
  use: {
    channel: 'chrome',
    baseURL: `http://127.0.0.1:${port}`,
  },
  projects: [
    { name: 'main', testIgnore: /(fixtures|builds)\.spec\.ts/ },
    { name: 'fixtures', testMatch: /fixtures\.spec\.ts/ },
    // Real astro builds; one at a time because they share .astro/ and the image cache.
    { name: 'builds', testMatch: /builds\.spec\.ts/, fullyParallel: false },
  ],
  webServer: {
    command: `npx serve ${dir} -l tcp://127.0.0.1:${port} --no-port-switching -L`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
