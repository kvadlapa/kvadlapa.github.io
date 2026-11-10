/**
 * AC 6.4: three Lighthouse mobile runs against `serve dist` (compressed, like production hosts),
 * writes each report to tests/reports/, prints medians, exits 1 if any target is missed.
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const reports = `${root}tests/reports/`;
const PORT = 4180;
const URL_UNDER_TEST = `http://127.0.0.1:${PORT}/`;
const RUNS = 3;

mkdirSync(reports, { recursive: true });
const server = spawn('npx', ['serve', 'dist', '-l', `tcp://127.0.0.1:${PORT}`, '--no-port-switching', '-L'], { cwd: root, stdio: 'ignore' });

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(URL_UNDER_TEST)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('serve did not start');
}

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

let exitCode = 0;
try {
  await waitForServer();
  const results: { scores: Record<string, number>; lcp: number; cls: number }[] = [];
  for (let run = 1; run <= RUNS; run++) {
    const output = `${reports}lighthouse-${run}.json`;
    const lh = spawnSync(
      'npx',
      ['lighthouse', URL_UNDER_TEST, '--output=json', `--output-path=${output}`, '--quiet', '--chrome-flags=--headless=new', '--only-categories=performance,accessibility,best-practices,seo'],
      { cwd: root, stdio: 'inherit', timeout: 180_000 },
    );
    if (lh.status !== 0) throw new Error(`lighthouse run ${run} failed`);
    const report = JSON.parse(readFileSync(output, 'utf8'));
    const scores = Object.fromEntries(Object.entries(report.categories).map(([k, v]) => [k, Math.round((v as { score: number }).score * 100)]));
    results.push({ scores, lcp: report.audits['largest-contentful-paint'].numericValue, cls: report.audits['cumulative-layout-shift'].numericValue });
    console.log(`run ${run}: ${JSON.stringify(scores)} LCP ${Math.round(results.at(-1)!.lcp)}ms CLS ${results.at(-1)!.cls.toFixed(3)}`);
  }

  const categories = Object.keys(results[0].scores);
  const summary = {
    formFactor: 'mobile (Lighthouse default: Moto G Power emulation, simulated slow 4G)',
    runs: results,
    median: {
      ...Object.fromEntries(categories.map((c) => [c, median(results.map((r) => r.scores[c]))])),
      lcpMs: Math.round(median(results.map((r) => r.lcp))),
      cls: median(results.map((r) => r.cls)),
    },
  };
  writeFileSync(`${reports}lighthouse-summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
  console.log('\nmedian', JSON.stringify(summary.median));

  const failures = categories.filter((c) => (summary.median as Record<string, number>)[c] < 95);
  if (summary.median.lcpMs >= 2000) failures.push(`LCP ${summary.median.lcpMs}ms`);
  if (summary.median.cls >= 0.05) failures.push(`CLS ${summary.median.cls}`);
  if (failures.length) {
    console.error(`AC 6.4 FAIL: ${failures.join(', ')}`);
    exitCode = 1;
  } else {
    console.log('AC 6.4 pass');
  }
} catch (error) {
  console.error(error);
  exitCode = 1;
} finally {
  server.kill();
}
process.exit(exitCode);
