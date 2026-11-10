import { expect, test } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
const read = (f: string) => readFileSync(f, 'utf8');

test.describe('source', () => {
  test('AC 5.3 container queries in the four card components; clamp() for spacing and type', () => {
    for (const name of ['BoardComponent', 'ProjectCard', 'ResearchCard', 'PartGroup']) {
      expect(read(`src/components/${name}.astro`), name).toMatch(/container-type:\s*inline-size/);
    }
    const tokens = read('src/styles/tokens.css');
    for (const token of ['--gutter', '--section-y', '--card-pad', '--fs-h2', '--fs-body']) expect(tokens).toMatch(new RegExp(`${token}: clamp\\(`));
    // Each component must have at least one @container block that sets at least one declaration.
    const containerBlocks = (css: string) => {
      const blocks: string[] = [];
      for (const m of css.matchAll(/@container\b[^{]*\{/g)) {
        let depth = 1;
        let i = m.index! + m[0].length;
        const start = i;
        while (depth && i < css.length) {
          if (css[i] === '{') depth++;
          else if (css[i] === '}') depth--;
          i++;
        }
        blocks.push(css.slice(start, i - 1));
      }
      return blocks;
    };
    for (const name of ['BoardComponent', 'ProjectCard', 'ResearchCard', 'PartGroup']) {
      const blocks = containerBlocks(read(`src/components/${name}.astro`));
      expect(blocks.length, `${name} has @container blocks`).toBeGreaterThan(0);
      const declares = blocks.some((b) => /[{;\s][a-z-]+\s*:\s*[^;{}]+;/.test(b.replace(/\/\*[\s\S]*?\*\//g, '')));
      expect(declares, `${name} has an @container block that changes a declaration`).toBe(true);
    }
  });

  test('AC 5.4 no fixed pixel widths above 2px outside media and container conditions', () => {
    const hits: string[] = [];
    for (const file of walk('src').filter((f) => /\.(astro|css)$/.test(f))) {
      read(file)
        .split('\n')
        .forEach((line, i) => {
          if (/^\s*@(media|container)/.test(line)) return;
          for (const m of line.matchAll(/(?:min-|max-)?width:\s*(\d+)px/g)) if (Number(m[1]) > 2) hits.push(`${file}:${i + 1} ${m[0]}`);
          if (/w-\[\d+px\]/.test(line)) hits.push(`${file}:${i + 1} tailwind px width`);
        });
    }
    expect(hits).toEqual([]);
  });

  test('AC 6.1 stack: astro, tailwind 4, typescript, static, no UI frameworks or gsap', () => {
    const pkg = JSON.parse(read('package.json'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(deps.astro).toBeTruthy();
    expect(deps.tailwindcss).toMatch(/^\^4/);
    expect(deps.typescript).toBeTruthy();
    for (const banned of ['react', 'vue', 'svelte', 'preact', 'gsap']) expect(Object.keys(deps).filter((d) => d.includes(banned))).toEqual([]);
    expect(read('astro.config.ts')).toMatch(/output: 'static'/);
  });

  test('AC 6.3 data files exist, components hold no resume facts, astro check is clean', () => {
    for (const f of ['profile', 'experience', 'skills', 'research', 'projects']) expect(existsSync(`src/data/${f}.ts`)).toBe(true);
    const components = walk('src/components').map(read).join('\n');
    for (const employer of ['SoftwareIDM', 'Antra', 'Accenture', 'Michigan Technological University']) expect(components).not.toContain(employer);
    const run = spawnSync('npx', ['astro', 'check'], { encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } });
    const output = `${run.stdout}${run.stderr}`.replace(/\u001b\[[0-9;]*m/g, '');
    expect(run.status).toBe(0);
    expect(output).toMatch(/- 0 errors/);
  });

  test('AC 6.14 every data-facing T-item has a TODO(Kiran) comment', () => {
    const src = walk('src').map(read).join('\n');
    // T3, T6, T7, T11 and T13 were resolved by the Nov 2026 resume. T5 (deploy repo) and T18 (Safari) touch no data; they live in the README.
    for (const item of ['T1', 'T2', 'T4', 'T8', 'T9', 'T10', 'T12', 'T14', 'T15', 'T16', 'T17']) {
      expect(src, item).toMatch(new RegExp(`TODO\\(Kiran\\) ${item}\\b`));
    }
  });

  test('AC 7.1 README has the required headings', () => {
    const headings = read('README.md').split('\n').filter((l) => /^#{1,3} /.test(l)).join('\n').toLowerCase();
    for (const topic of ['local dev', 'editing content', 'images', 'github pages', 'vercel', 'pre-launch todo']) expect(headings, topic).toContain(topic);
  });

  test('AC 7.2 deploy workflow', () => {
    const raw = read('.github/workflows/deploy.yml');
    const wf = parse(raw);
    expect(wf.on.push.branches).toContain('main');
    expect('workflow_dispatch' in wf.on).toBe(true);
    expect(wf.permissions.pages).toBe('write');
    expect(wf.permissions['id-token']).toBe('write');
    expect(raw).toMatch(/node-version: 24/);
    expect(raw).toMatch(/npm ci/);
    expect(raw).toMatch(/GITHUB_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/);
    expect(raw).toMatch(/actions\/deploy-pages@/);
  });
});
