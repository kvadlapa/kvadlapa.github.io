import { expect, test, type Page } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { BRAND, hexDistance, openPage, resolveColor, scrollToY, settle } from './helpers/page.ts';
import { THEMES } from './helpers/viewports.ts';

const desktop = { width: 1440, height: 900 };
const tokens = {
  dark: { '--bg': '#0b1218', '--surface': '#111c24', '--grid': '#1c2a35', '--text': '#e8ecef', '--muted': '#8c99a4' },
  light: { '--bg': '#f4f1ea', '--surface': '#ffffff', '--grid': '#dcd6c8', '--text': '#13202a', '--muted': '#5a6670' },
};

const oxidation = (page: Page) => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--oxidation')));

test.describe('theme', () => {
  test('AC 1.5 --oxidation runs 0 to 1 with scroll and never decreases', async ({ browser }) => {
    const page = await openPage(browser, desktop, 'dark');
    expect(await oxidation(page)).toBeLessThanOrEqual(0.01);
    const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const samples: number[] = [];
    for (let i = 0; i < 5; i++) {
      await scrollToY(page, Math.round((max * i) / 4));
      samples.push(await oxidation(page));
    }
    for (let i = 1; i < samples.length; i++) expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
    await scrollToY(page, 'bottom');
    expect(await oxidation(page)).toBeGreaterThanOrEqual(0.99);
  });

  for (const theme of THEMES) {
    test(`AC 1.6 accent is copper at top, patina at bottom, hover is bright copper (${theme})`, async ({ browser }) => {
      const page = await openPage(browser, desktop, theme);
      const brand = BRAND[theme];
      expect(hexDistance(await resolveColor(page, 'var(--accent)'), brand.copper)).toBeLessThanOrEqual(1);
      const cta = page.locator('#hero .btn-primary');
      await cta.hover();
      await page.waitForTimeout(300);
      const hover = await cta.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(hexDistance(await resolveColor(page, hover), brand.copperHover)).toBeLessThanOrEqual(1);
      await page.mouse.move(0, 0);
      await scrollToY(page, 'bottom');
      expect(hexDistance(await resolveColor(page, 'var(--accent)'), brand.patina)).toBeLessThanOrEqual(1);
    });

    test(`AC 1.8 base tokens match the brief (${theme})`, async ({ browser }) => {
      const page = await openPage(browser, desktop, theme);
      for (const [token, value] of Object.entries(tokens[theme])) {
        expect(await resolveColor(page, `var(${token})`), token).toBe(value);
      }
    });

    test(`AC 1.9 status green only on active and granted indicators (${theme})`, async ({ browser }) => {
      const page = await openPage(browser, desktop, theme);
      const check = () =>
        page.evaluate((status) => {
          const ctx = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
          const hex = (c: string) => {
            if (!c || c === 'none' || c.startsWith('url')) return '';
            ctx.clearRect(0, 0, 1, 1);
            ctx.fillStyle = '#000';
            ctx.fillStyle = c;
            ctx.fillRect(0, 0, 1, 1);
            const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
            return a === 0 ? '' : `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
          };
          const bad: string[] = [];
          for (const el of document.querySelectorAll('body *')) {
            const s = getComputedStyle(el);
            const green = [s.color, s.backgroundColor, s.fill].some((c) => hex(c) === status);
            if (green && !el.matches('[data-status="active"], [data-status="granted"]')) bad.push(`${el.tagName}.${el.className}`);
          }
          return bad;
        }, BRAND[theme].status);
      expect(await check()).toEqual([]);
      await scrollToY(page, 'bottom');
      expect(await check()).toEqual([]);
      const chipColor = await page.locator('.progress').first().evaluate((el) => getComputedStyle(el).color);
      expect(hexDistance(await resolveColor(page, chipColor), BRAND[theme].status)).toBeGreaterThan(10);
    });

    test(`AC 1.12 font families, weights and same-origin woff2 requests (${theme})`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: desktop, colorScheme: theme });
      const page = await context.newPage();
      const fonts: string[] = [];
      page.on('request', (r) => r.resourceType() === 'font' && fonts.push(r.url()));
      await page.goto('/');
      await settle(page);
      const h1 = await page.locator('h1').evaluate((e) => [getComputedStyle(e).fontFamily, Number(getComputedStyle(e).fontWeight)] as const);
      expect(h1[0]).toMatch(/^"?Bricolage Grotesque/);
      expect(h1[1]).toBeGreaterThanOrEqual(600);
      expect(h1[1]).toBeLessThanOrEqual(700);
      const body = await page.locator('body').evaluate((e) => [getComputedStyle(e).fontFamily, getComputedStyle(e).fontWeight] as const);
      expect(body[0]).toMatch(/^"?Instrument Sans/);
      expect(['400', '500']).toContain(body[1]);
      for (const family of await page.locator('.silk').evaluateAll((els) => els.map((e) => getComputedStyle(e).fontFamily))) {
        expect(family).toMatch(/^"?DM Mono/);
      }
      expect(fonts.length).toBeGreaterThan(0);
      for (const url of fonts) {
        expect(new URL(url).origin).toBe(new URL(page.url()).origin);
        expect(url).toMatch(/\.woff2$/);
      }
    });
  }

  test('AC 1.10 theme resolution order', async ({ browser }) => {
    const themeFor = async (colorScheme: 'dark' | 'light' | 'no-preference') => {
      const context = await browser.newContext({ colorScheme });
      const page = await context.newPage();
      await page.goto('/');
      const value = await page.evaluate(() => document.documentElement.dataset.theme);
      const osLight = await page.evaluate(() => matchMedia('(prefers-color-scheme: light)').matches);
      await context.close();
      return { value, osLight };
    };
    expect((await themeFor('dark')).value).toBe('dark');
    // Chrome has no true no-preference state: it falls back to the host OS appearance, which
    // changes with macOS Auto mode. Only a light preference may produce light; anything else is dark.
    const none = await themeFor('no-preference');
    expect(none.value).toBe(none.osLight ? 'light' : 'dark');
    expect((await themeFor('light')).value).toBe('light');

    const context = await browser.newContext({ colorScheme: 'light', viewport: desktop });
    const page = await context.newPage();
    await page.goto('/');
    await page.locator('[data-theme-toggle]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const head = readFileSync('dist/index.html', 'utf8').split('</head>')[0];
    expect(head.indexOf('dataset.theme')).toBeLessThan(head.indexOf('<style'));
  });

  test('AC 1.13 h1 size is fluid and capped; source has the clamp and 68ch measure', async ({ browser }) => {
    for (const [width, size] of [[320, 44], [1000, 80], [3840, 104]]) {
      const page = await openPage(browser, { width, height: 900 }, 'dark');
      const px = await page.locator('h1').evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
      expect(Math.abs(px - size), `width ${width}`).toBeLessThanOrEqual(0.5);
    }
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
    const src = walk('src').filter((f) => /\.(astro|css)$/.test(f)).map((f) => readFileSync(f, 'utf8')).join('\n');
    expect(src).toContain('clamp(2.75rem, 8vw, 6.5rem)');
    expect(src).toMatch(/max-width: 68ch/);
  });

  test('AC 3.14 toggle flips the theme with an animation of at most 800ms', async ({ browser }) => {
    const page = await openPage(browser, desktop, 'dark');
    const toggle = page.locator('[data-theme-toggle]');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    const timing = await page.evaluate(async () => {
      // Only what the click starts counts; the ACTIVE LED pulse was already running.
      const before = new Set(document.getAnimations());
      (document.querySelector('[data-theme-toggle]') as HTMLButtonElement).click();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return document
        .getAnimations()
        .filter((a) => !before.has(a))
        .map((a) => Number(a.effect?.getComputedTiming().endTime ?? 0));
    });
    expect(timing.length).toBeGreaterThan(0);
    expect(Math.max(...timing)).toBeLessThanOrEqual(800);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });
});
