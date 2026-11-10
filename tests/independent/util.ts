import type { Browser, BrowserContextOptions, Page } from '@playwright/test';

export type Theme = 'dark' | 'light';
export const ROOT = new URL('../../', import.meta.url);

/** Fresh context + page, theme pinned by OS preference only (no storage tricks). */
export async function open(browser: Browser, viewport: { width: number; height: number }, options: BrowserContextOptions = {}): Promise<Page> {
  const context = await browser.newContext({ viewport, ...options });
  const page = await context.newPage();
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.waitForTimeout(400);
  return page;
}

export async function toBottom(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(300);
}

export async function toY(page: Page, y: number): Promise<void> {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y);
  await page.waitForTimeout(300);
}

/** Every element that paints its own text and lies outside the horizontal viewport (overflow:clip hides this from scrollWidth). */
export function clippedText(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const vw = document.documentElement.clientWidth;
    for (const el of document.querySelectorAll<HTMLElement>('body *')) {
      if (el.closest('[aria-hidden="true"], .sr-only, dialog:not([open]), svg')) continue;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim());
      if (!own || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const range = document.createRange();
      range.selectNodeContents(el);
      for (const r of range.getClientRects()) {
        if (r.width === 0) continue;
        if (r.left < -1 || r.right > vw + 1) {
          out.push(`${el.tagName}.${el.className} "${(el.textContent ?? '').trim().slice(0, 40)}" ${Math.round(r.left)}..${Math.round(r.right)} vw=${vw}`);
          break;
        }
      }
    }
    return out;
  });
}

export function mainPathPoints(page: Page): Promise<{ x: number; y: number }[]> {
  return page.locator('[data-trace-main]').evaluate((p) => {
    const d = p.getAttribute('d') ?? '';
    // Accept every command form, not just M/L, so H/V/C segments cannot slip past.
    const pts: { x: number; y: number }[] = [];
    let x = 0;
    let y = 0;
    for (const m of d.matchAll(/([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g)) {
      const n = (m[2].match(/-?[\d.]+(?:e-?\d+)?/g) ?? []).map(Number);
      switch (m[1]) {
        case 'M': case 'L': for (let i = 0; i + 1 < n.length; i += 2) { x = n[i]; y = n[i + 1]; pts.push({ x, y }); } break;
        case 'H': for (const v of n) { x = v; pts.push({ x, y }); } break;
        case 'V': for (const v of n) { y = v; pts.push({ x, y }); } break;
        case 'C': for (let i = 0; i + 5 < n.length; i += 6) { x = n[i + 4]; y = n[i + 5]; pts.push({ x, y }); } break;
        default: pts.push({ x: NaN, y: NaN });
      }
    }
    return pts;
  });
}

export function pageBox(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((el) => {
    const b = el.getBoundingClientRect();
    return { left: b.left + scrollX, top: b.top + scrollY, right: b.right + scrollX, bottom: b.bottom + scrollY };
  });
}

export function svgOrigin(page: Page) {
  return page.evaluate(() => {
    const b = (document.querySelector('svg[data-trace]') as SVGSVGElement).getBoundingClientRect();
    return { x: b.left + scrollX, y: b.top + scrollY };
  });
}

export function lum([r, g, b]: number[]): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export const ratio = (a: number[], b: number[]) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** Resolves a CSS colour to [r,g,b] by painting it. */
export function rgb(page: Page, css: string): Promise<number[]> {
  return page.evaluate((css) => {
    const probe = document.createElement('span');
    probe.style.color = css;
    document.body.append(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    const ctx = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
  }, css);
}
