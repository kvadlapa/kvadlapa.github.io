import { expect, test } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { imageSlots } from '../src/data/image-slots.ts';
import { checkContrast } from './helpers/contrast.ts';
import { openPage } from './helpers/page.ts';
import { THEMES } from './helpers/viewports.ts';

// Runs against dist-fixture, built by scripts/run-fixtures.ts with all five PNGs and the resume PDF present.
const DIST = 'dist-fixture';
const html = () => readFileSync(join(DIST, 'index.html'), 'utf8');
const widthsOf = (srcset: string) => srcset.split(',').map((c) => Number(c.trim().split(/\s+/)[1]?.replace('w', '')));

test.describe('fixture build', () => {
  for (const theme of THEMES) {
    for (const viewport of [{ width: 375, height: 667 }, { width: 1440, height: 900 }]) {
      test(`AC 1.11 [FIX] hero contrast over a #808080 hero.png at ${viewport.width} ${theme}`, async ({ browser }) => {
        test.setTimeout(120_000);
        const page = await openPage(browser, viewport, theme);
        const report = await checkContrast(page, '#hero');
        console.log(`hero contrast ${viewport.width} ${theme}: ${report.sampled} sampled`);
        expect(report.violations).toEqual([]);
        expect(report.failures).toEqual([]);
      });
    }
  }

  test('AC 4.4 [FIX] every slot renders an image with AVIF and WebP sources', async ({ browser }) => {
    const page = await openPage(browser, { width: 1440, height: 900 }, 'dark');
    for (const slot of imageSlots) await expect(page.locator(`[data-slot="${slot.name}"]`)).toHaveAttribute('data-slot-state', 'image');
    const pictures = await page.locator('[data-slot] picture').evaluateAll((ps) => ps.map((p) => [...p.querySelectorAll('source')].map((s) => s.type)));
    expect(pictures).toHaveLength(5);
    for (const types of pictures) {
      expect(types).toContain('image/avif');
      expect(types).toContain('image/webp');
    }
  });

  test('AC 4.5 [FIX] srcset widths follow the master size, hero portrait 480-1280, real sizes', async ({ browser }) => {
    const page = await openPage(browser, { width: 1440, height: 900 }, 'dark');
    const data = await page.evaluate(() =>
      [...document.querySelectorAll('[data-slot] picture')].map((p) => ({
        slot: (p.closest('[data-slot]') as HTMLElement).dataset.slot,
        sources: [...p.querySelectorAll('source')].map((s) => ({ media: s.media, srcset: s.srcset, sizes: s.sizes })),
        img: { srcset: p.querySelector('img')!.srcset, sizes: p.querySelector('img')!.sizes },
      })),
    );
    for (const picture of data) {
      const slot = imageSlots.find((s) => s.name === picture.slot)!;
      const full = slot.width === 3840 ? [480, 768, 1280, 1920, 2560, 3840] : [480, 768, 1280, 1920];
      for (const source of [...picture.sources, picture.img]) {
        expect(source.sizes, picture.slot).toBeTruthy();
        expect(source.sizes).not.toBe('100vw');
        const portrait = 'media' in source && (source as { media: string }).media.includes('max-width');
        expect(widthsOf(source.srcset), `${picture.slot} ${portrait ? 'portrait' : 'landscape'}`).toEqual(portrait ? [480, 768, 1280] : full);
      }
    }
    expect(data.find((d) => d.slot === 'hero')!.sources.filter((s) => s.media.includes('max-width'))).toHaveLength(2);
  });

  test('AC 4.6 [FIX] hero is high priority, preloaded, with a small LQIP; the rest are lazy', async ({ browser }) => {
    const page = await openPage(browser, { width: 1440, height: 900 }, 'dark');
    const hero = page.locator('[data-slot="hero"] img');
    await expect(hero).toHaveAttribute('fetchpriority', 'high');
    expect(await hero.getAttribute('loading')).not.toBe('lazy');
    const preloads = await page.locator('link[rel="preload"][as="image"]').evaluateAll((ls) => ls.map((l) => l.getAttribute('imagesrcset')));
    const avifSources = await page.locator('[data-slot="hero"] source[type="image/avif"]').evaluateAll((ss) => ss.map((s) => s.getAttribute('srcset')));
    expect(preloads.sort()).toEqual(avifSources.sort());
    const lqip = await page.locator('[data-slot="hero"]').evaluate((e) => getComputedStyle(e).backgroundImage);
    expect(lqip).toMatch(/^url\("data:image\/webp;base64,/);
    expect(lqip.length).toBeLessThanOrEqual(2048);
    const others = await page.locator('[data-slot]:not([data-slot="hero"]) img').evaluateAll((is) => is.map((i) => i.getAttribute('loading')));
    expect(others).toHaveLength(4);
    for (const loading of others) expect(loading).toBe('lazy');
  });

  test('AC 4.7 [FIX] phones get a portrait hero no wider than 1280; desktops get landscape', async ({ browser }) => {
    const sizesFor = async (viewport: { width: number; height: number }, deviceScaleFactor: number) => {
      const context = await browser.newContext({ viewport, deviceScaleFactor });
      const page = await context.newPage();
      const images: Buffer[] = [];
      const pending: Promise<void>[] = [];
      page.on('response', (r) => {
        if (r.request().resourceType() === 'image' && r.url().includes('/_astro/')) pending.push(r.body().then((b) => void images.push(b)).catch(() => {}));
      });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await Promise.all(pending);
      const dims = await Promise.all(images.map(async (b) => sharp(b).metadata()));
      const heroSrc = await page.locator('[data-slot="hero"] img').evaluate((i: HTMLImageElement) => i.currentSrc);
      await context.close();
      return { dims: dims.map((d) => ({ width: d.width!, height: d.height! })), heroSrc };
    };
    const phone = await sizesFor({ width: 375, height: 667 }, 3);
    expect(phone.dims.length).toBeGreaterThan(0);
    for (const d of phone.dims) expect(d.width).toBeLessThanOrEqual(1280);
    expect(phone.dims.some((d) => d.height > d.width && d.width === 1280)).toBe(true);

    const desktop = await sizesFor({ width: 1920, height: 1080 }, 1);
    expect(desktop.dims.some((d) => d.width === 1920 && d.width > d.height)).toBe(true);
  });

  test('S4 [FIX] with hero.png present the trace still leaves the badge pad, drawn over the photo', async ({ browser }) => {
    for (const theme of THEMES) {
      // Reduced motion draws the whole trace at once, so the first segment is on screen at the top.
      const page = await openPage(browser, { width: 1440, height: 900 }, theme, { reducedMotion: 'reduce' });
      await expect(page.locator('[data-slot="hero"]')).toHaveAttribute('data-slot-state', 'image');
      const pad = (await page.locator('[data-trace-anchor="start"]').boundingBox())!;
      const start = (await page.locator('[data-trace-main]').evaluate((p) => (p.getAttribute('d') ?? '').match(/^M(-?[\d.]+) (-?[\d.]+)/)!.slice(1).map(Number)))!;
      const origin = await page.locator('svg[data-trace]').evaluate((e) => e.getBoundingClientRect());
      expect(Math.abs(origin.left + start[0] - (pad.x + pad.width / 2))).toBeLessThanOrEqual(1);
      expect(Math.abs(origin.top + start[1] - (pad.y + pad.height / 2))).toBeLessThanOrEqual(1);
      // Sample a strip across the first segment, 24px below the pad, still inside the hero photo.
      const png = await page.screenshot({ clip: { x: pad.x + pad.width / 2 - 4, y: pad.y + pad.height + 24, width: 8, height: 1 } });
      const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      let warmest = 0;
      for (let i = 0; i < data.length; i += info.channels) warmest = Math.max(warmest, data[i] - data[i + 2]);
      // The photo here is neutral #808080; the trace's first stop is copper (red well above blue).
      expect(warmest, `${theme}: trace visible over the photo`).toBeGreaterThan(40);
      await page.context().close();
    }
  });

  test('AC 4.8 [FIX] no slot PNG ships', () => {
    const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
    const pngs = walk(DIST).filter((f) => f.endsWith('.png')).map((f) => f.slice(DIST.length + 1));
    expect(pngs.sort()).toEqual(['apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'og-image.png']);
  });

  test('AC 7.5 [FIX] with the PDF present the CTA reads Resume and the file serves', async ({ browser, request }) => {
    const page = await openPage(browser, { width: 1440, height: 900 }, 'dark');
    const cta = page.locator('#hero .btn-primary');
    await expect(cta).toHaveText('Resume');
    await expect(cta).toHaveAttribute('href', '/Kiran_Vadlapally_Resume.pdf');
    expect((await request.get('/Kiran_Vadlapally_Resume.pdf')).status()).toBe(200);
    expect(html()).not.toContain('Request resume');
  });
});
