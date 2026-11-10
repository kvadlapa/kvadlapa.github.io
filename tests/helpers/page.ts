import { type Browser, type BrowserContextOptions, type Page } from '@playwright/test';
import type { Theme, Viewport } from './viewports.ts';

export const BRAND = {
  dark: { copper: '#c47a4a', patina: '#5fa39a', copperHover: '#e29a64', status: '#3ddc97' },
  light: { copper: '#8e4e26', patina: '#1e6670', copperHover: '#74401d', status: '#087443' },
} as const;

/** Opens the page with a theme forced through storage, so OS preference does not matter. */
export async function openPage(
  browser: Browser,
  viewport: Viewport,
  theme: Theme,
  options: BrowserContextOptions = {},
): Promise<Page> {
  const context = await browser.newContext({ viewport, colorScheme: theme, ...options });
  await context.addInitScript((value) => {
    try {
      if (!localStorage.getItem('theme')) localStorage.setItem('theme', value);
    } catch {}
  }, theme);
  const page = await context.newPage();
  await page.goto('/');
  await settle(page);
  return page;
}

export async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.querySelector('[data-badge-state]')?.getAttribute('data-badge-state') === 'granted' || !document.documentElement.hasAttribute('data-js'), null, { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(700);
}

export async function scrollToY(page: Page, y: number | 'bottom'): Promise<void> {
  await page.evaluate((target) => {
    const max = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    window.scrollTo({ top: target === 'bottom' ? max : target, behavior: 'instant' });
  }, y);
  await page.waitForTimeout(250);
}

/** Resolves any CSS colour expression (oklch, color-mix...) to sRGB hex through a painted canvas pixel. */
export async function resolveColor(page: Page, expression: string, scope = 'html'): Promise<string> {
  return page.evaluate(
    ({ expression, scope }) => {
      const host = document.querySelector(scope) ?? document.documentElement;
      const probe = document.createElement('span');
      probe.style.color = expression;
      host.append(probe);
      const computed = getComputedStyle(probe).color;
      probe.remove();
      const ctx = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
      ctx.fillStyle = computed;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    },
    { expression, scope },
  );
}

export function hexDistance(a: string, b: string): number {
  const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [x, y] = [parse(a.toLowerCase()), parse(b.toLowerCase())];
  return Math.max(...x.map((v, i) => Math.abs(v - y[i])));
}

export function luminance([r, g, b]: number[]): number {
  const [R, G, B] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function contrast(a: number[], b: number[]): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Every vertex of a path's `d`, for M, L, H, V and C commands. Unknown commands yield NaN so they cannot slip past. */
export function pathVertices(page: Page, selector: string): Promise<{ x: number; y: number }[]> {
  return page.locator(selector).evaluate((path) => {
    const points: { x: number; y: number }[] = [];
    let x = 0;
    let y = 0;
    for (const m of (path.getAttribute('d') ?? '').matchAll(/([A-Za-z])([^A-Za-z]*)/g)) {
      const n = (m[2].match(/-?[\d.]+(?:e-?\d+)?/g) ?? []).map(Number);
      switch (m[1]) {
        case 'M':
        case 'L':
          for (let i = 0; i + 1 < n.length; i += 2) points.push({ x: (x = n[i]), y: (y = n[i + 1]) });
          break;
        case 'H':
          for (const v of n) points.push({ x: (x = v), y });
          break;
        case 'V':
          for (const v of n) points.push({ x, y: (y = v) });
          break;
        case 'C':
          for (let i = 0; i + 5 < n.length; i += 6) points.push({ x: (x = n[i + 4]), y: (y = n[i + 5]) });
          break;
        default:
          points.push({ x: NaN, y: NaN });
      }
    }
    return points;
  });
}
