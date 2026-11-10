import { expect, test } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { readFileSync, rmSync } from 'node:fs';
import { imageSlots } from '../src/data/image-slots.ts';

// Real builds with no image masters present, in a throwaway outDir (PLAN D4, AC 4.3, 7.4).
test.describe.configure({ mode: 'serial' });

const OUT = './dist-resilience';

/** Async on purpose: a blocking spawn would stop this process's own mock server from answering. */
function build(env: Record<string, string>): Promise<{ status: number | null; log: string; html: string }> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['astro', 'build'], { env: { ...process.env, OUT_DIR: OUT, NO_COLOR: '1', ...env } });
    let log = '';
    child.stdout.on('data', (d) => (log += d));
    child.stderr.on('data', (d) => (log += d));
    const timer = setTimeout(() => child.kill(), 180_000);
    child.on('close', (status) => {
      clearTimeout(timer);
      resolve({ status, log, html: status === 0 ? readFileSync(`${OUT}/index.html`, 'utf8') : '' });
    });
  });
}

const snapshotCards = (html: string) => ['job-portal-springboot', 'springboot-microservices-main', 'smartbudget', 'robot_tracker'].every((n) => html.includes(n));

async function mock(handler: (res: import('node:http').ServerResponse) => void): Promise<{ server: Server; base: string }> {
  const server = createServer((_, res) => handler(res));
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as { port: number };
  return { server, base: `http://127.0.0.1:${port}` };
}

test.afterAll(() => rmSync(OUT, { recursive: true, force: true }));

test('AC 4.3 fallback build warns once per missing slot and exits 0', async () => {
  test.setTimeout(200_000);
  const { status, log } = await build({ GH_API_BASE: 'http://127.0.0.1:9' });
  expect(status).toBe(0);
  for (const slot of imageSlots) expect(log.split(`${slot.file} is missing`).length - 1, slot.file).toBe(1);
});

test('AC 7.4 build survives an unreachable API', async () => {
  test.setTimeout(200_000);
  const { status, html, log } = await build({ GH_API_BASE: 'http://127.0.0.1:9' });
  expect(status).toBe(0);
  expect(log).toContain('using the snapshot');
  expect(snapshotCards(html)).toBe(true);
});

for (const [name, handler] of [
  ['403 rate limit', (res: import('node:http').ServerResponse) => res.writeHead(403, { 'x-ratelimit-remaining': '0' }).end('{"message":"rate limited"}')],
  ['500', (res: import('node:http').ServerResponse) => res.writeHead(500).end('oops')],
  ['empty array', (res: import('node:http').ServerResponse) => res.writeHead(200, { 'content-type': 'application/json' }).end('[]')],
] as const) {
  test(`AC 7.4 build survives a mock returning ${name}`, async () => {
    test.setTimeout(200_000);
    let hits = 0;
    const { server, base } = await mock((res) => {
      hits++;
      handler(res);
    });
    try {
      const { status, html, log } = await build({ GH_API_BASE: base });
      expect(status).toBe(0);
      expect(log).toContain('using the snapshot');
      expect(snapshotCards(html)).toBe(true);
      // One retry on 5xx, none on 403 (PLAN D4).
      if (name === '500') expect(hits).toBe(2);
      if (name.startsWith('403')) expect(hits).toBe(1);
    } finally {
      server.close();
    }
  });
}
