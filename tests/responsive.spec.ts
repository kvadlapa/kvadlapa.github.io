import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { openPage, pathVertices, scrollToY } from './helpers/page.ts';
import { label, THEMES, V } from './helpers/viewports.ts';

const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

test.describe('responsive', () => {
  for (const theme of THEMES) {
    for (const viewport of V) {
      test(`AC 5.1 no horizontal scroll at ${label(viewport)} ${theme}`, async ({ browser }) => {
        const page = await openPage(browser, viewport, theme);
        expect(await noOverflow(page), 'top').toBe(true);
        await scrollToY(page, 'bottom');
        expect(await noOverflow(page), 'bottom').toBe(true);
        if (await page.locator('[data-menu-open]').isVisible()) {
          await page.locator('[data-menu-open]').click();
          expect(await noOverflow(page), 'menu open').toBe(true);
        }
      });

      test(`AC 5.2 full-page screenshot at ${label(viewport)} ${theme}`, async ({ browser }) => {
        test.setTimeout(120_000);
        const page = await openPage(browser, viewport, theme);
        mkdirSync(`tests/screenshots/${theme}`, { recursive: true });
        // On phones the badge sequence starts when it enters view (A2), so bring it into view first,
        // then scroll through once so the trace and contact state reflect a full read.
        await page.locator('#badge').evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await page.waitForFunction(() => document.querySelector('#badge')?.getAttribute('data-badge-state') === 'granted', null, { timeout: 5000 });
        await page.waitForTimeout(700);
        await scrollToY(page, 'bottom');
        await scrollToY(page, 0);
        await page.screenshot({ path: `tests/screenshots/${theme}/${label(viewport)}.png`, fullPage: true });
      });
    }

    for (const viewport of [V[0], V[1]]) {
      test(`AC 5.2 menu-open screenshot at ${label(viewport)} ${theme}`, async ({ browser }) => {
        const page = await openPage(browser, viewport, theme);
        await page.locator('[data-menu-open]').click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: `tests/screenshots/${theme}/${label(viewport)}-menu.png` });
      });
    }
  }

  test('AC 5.5 content caps at 1280 and centres while the board stays edge to edge', async ({ browser }) => {
    for (const width of [1920, 2560, 3840]) {
      const page = await openPage(browser, { width, height: 1080 }, 'dark');
      const result = await page.evaluate(() => ({
        vw: document.documentElement.clientWidth,
        contents: [...document.querySelectorAll('[data-content]')].map((e) => {
          const b = e.getBoundingClientRect();
          return { width: b.width, left: b.left, right: b.right };
        }),
        board: document.querySelector('.board-layer')!.getBoundingClientRect().width,
        trace: document.querySelector('svg[data-trace]')!.getBoundingClientRect().width,
      }));
      for (const c of result.contents) {
        expect(c.width).toBeLessThanOrEqual(1280);
        expect(Math.abs(c.left - (result.vw - c.right))).toBeLessThanOrEqual(1);
      }
      expect(result.board).toBe(result.vw);
      expect(result.trace).toBe(result.vw);
      await page.context().close();
    }
  });

  test('AC 5.6 mobile menu: trap, Esc, focus return, link navigation', async ({ browser }) => {
    const page = await openPage(browser, { width: 375, height: 667 }, 'dark');
    const opener = page.locator('[data-menu-open]');
    await expect(opener).toBeVisible();
    await expect(page.locator('.nav-links')).toBeHidden();
    await opener.click();
    await expect(opener).toHaveAttribute('aria-expanded', 'true');
    const box = await page.locator('#mobile-menu').boundingBox();
    expect(box).toEqual({ x: 0, y: 0, width: 375, height: 667 });
    const inside = () => page.evaluate(() => Boolean(document.activeElement?.closest('#mobile-menu')));
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      expect(await inside(), `Tab ${i}`).toBe(true);
    }
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Shift+Tab');
      expect(await inside(), `Shift+Tab ${i}`).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(opener).toHaveAttribute('aria-expanded', 'false');
    await expect(opener).toBeFocused();
    await expect(page.locator('#mobile-menu')).toBeHidden();

    await opener.click();
    await page.locator('#mobile-menu a[href="#research"]').click();
    await expect(page.locator('#mobile-menu')).toBeHidden();
    await expect(opener).toHaveAttribute('aria-expanded', 'false');
    await page.waitForTimeout(1200);
    expect(page.url()).toContain('#research');
    await expect(page.locator('#research h2')).toBeInViewport();
  });

  test('AC 5.7 below 768 the trace is one vertical line with no branches', async ({ browser }) => {
    for (const viewport of V.filter((v) => v.width < 768)) {
      const page = await openPage(browser, viewport, 'dark');
      await expect(page.locator('[data-branch]')).toHaveCount(0);
      const points = await pathVertices(page, '[data-trace-main]');
      const xs = points.map((p) => p.x);
      expect(xs.some(Number.isNaN), 'only M/L/H/V/C commands').toBe(false);
      expect(xs.length).toBeGreaterThanOrEqual(2);
      expect(Math.max(...xs) - Math.min(...xs), label(viewport)).toBeLessThanOrEqual(1);
      await page.context().close();
    }
  });

  for (const viewport of [{ width: 375, height: 667 }, { width: 1440, height: 900 }]) {
    test(`AC 5.8 touch targets are at least 44px at ${viewport.width}`, async ({ browser }) => {
      const page = await openPage(browser, viewport, 'dark');
      const small = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('a, button, [tabindex="0"]')]
          .filter((e) => e.checkVisibility() && !e.closest('dialog:not([open])'))
          .map((e) => ({ e, b: e.getBoundingClientRect() }))
          .filter(({ b }) => b.width < 44 || b.height < 44)
          .map(({ e, b }) => `${e.tagName}.${e.className} ${Math.round(b.width)}x${Math.round(b.height)} "${e.textContent?.trim().slice(0, 30)}"`),
      );
      expect(small).toEqual([]);
    });
  }

  test('AC 5.10 who, what and every CTA are above the fold', async ({ browser }) => {
    const sizes = [
      { width: 320, height: 568 },
      { width: 375, height: 667 },
      { width: 768, height: 1024 },
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 },
      { width: 1024, height: 768 },
    ];
    for (const viewport of sizes) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await page.goto('/');
      const bottoms = await page.evaluate(() => {
        const b = (sel: string) => document.querySelector(sel)!.getBoundingClientRect().bottom;
        return {
          h1: b('h1'),
          tagline: b('.tagline'),
          headline: b('.headline'),
          ctas: Math.max(...[...document.querySelectorAll('#hero .cta-group a')].map((a) => a.getBoundingClientRect().bottom)),
          card: b('#badge'),
          scrollY,
        };
      });
      expect(bottoms.scrollY).toBe(0);
      for (const key of ['h1', 'tagline', 'headline', 'ctas'] as const) expect(bottoms[key], `${key} at ${label(viewport)}`).toBeLessThanOrEqual(viewport.height);
      if (viewport.width >= 1024) expect(bottoms.card, `card at ${label(viewport)}`).toBeLessThanOrEqual(viewport.height);
      await context.close();
    }
    const context = await browser.newContext({ viewport: { width: 844, height: 390 } });
    const page = await context.newPage();
    await page.goto('/');
    expect(await page.locator('h1').evaluate((e) => e.getBoundingClientRect().bottom)).toBeLessThanOrEqual(390);
    expect(await page.locator('#hero .btn-primary').evaluate((e) => e.getBoundingClientRect().bottom)).toBeLessThanOrEqual(390);
  });
});
