import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { checkContrast } from './helpers/contrast.ts';
import { hexDistance, openPage, resolveColor, scrollToY } from './helpers/page.ts';
import { THEMES } from './helpers/viewports.ts';

const widths = [
  { width: 375, height: 667 },
  { width: 1440, height: 900 },
];

test.describe('accessibility', () => {
  for (const theme of THEMES) {
    for (const viewport of widths) {
      for (const position of ['top', 'bottom'] as const) {
        test(`AC 1.11 contrast at ${viewport.width} ${theme} ${position}`, async ({ browser }) => {
          test.setTimeout(180_000);
          const page = await openPage(browser, viewport, theme);
          if (position === 'bottom') await scrollToY(page, 'bottom');
          const report = await checkContrast(page);
          test.info().annotations.push({ type: 'sampled', description: String(report.sampled) });
          console.log(`contrast ${viewport.width} ${theme} ${position}: ${report.sampled} nodes pixel-sampled`);
          expect(report.violations).toEqual([]);
          expect(report.failures).toEqual([]);
        });
      }

      test(`AC 6.5 axe WCAG A/AA at ${viewport.width} ${theme}`, async ({ browser }) => {
        const page = await openPage(browser, viewport, theme);
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
      });
    }
  }

  test('AC 6.6 one h1, no skipped heading levels, landmarks present', async ({ browser }) => {
    const page = await openPage(browser, widths[1], 'dark');
    await expect(page.locator('h1')).toHaveCount(1);
    const levels = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll((els) => els.map((e) => Number(e.tagName[1])));
    for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    for (const landmark of ['header', 'nav', 'main', 'footer']) expect(await page.locator(landmark).count()).toBeGreaterThan(0);
  });

  test('AC 6.7 skip link first, moves focus to main, every control reachable by Tab', async ({ browser }) => {
    const page = await openPage(browser, widths[1], 'dark');
    await page.keyboard.press('Tab');
    const skip = page.locator('.skip-link');
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();

    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    const expected = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('a[href], button, [tabindex="0"]')]
        .filter((e) => e.checkVisibility() && !e.closest('dialog:not([open])'))
        .map((e, i) => (e.dataset.tabProbe = String(i))),
    );
    const reached = new Set<string>();
    for (let i = 0; i < expected.length + 5; i++) {
      await page.keyboard.press('Tab');
      const probe = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.tabProbe);
      if (probe) reached.add(probe);
    }
    expect(expected.filter((p) => !reached.has(p))).toEqual([]);
  });

  test('AC 6.8 focus rings are 2px solid accent; images have alt; SVG art is hidden', async ({ browser }) => {
    test.setTimeout(120_000);
    const page = await openPage(browser, widths[1], 'dark');
    const total = await page.evaluate(() => document.querySelectorAll('a[href], button, [tabindex="0"]').length);
    const problems: string[] = [];
    for (let i = 0; i < total + 2; i++) {
      await page.keyboard.press('Tab');
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      // Ring and accent are read in the same frame, since focus scrolling moves --oxidation.
      const ring = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        if (!el || el === document.body) return null;
        const s = getComputedStyle(el);
        const probe = document.createElement('span');
        probe.style.color = 'var(--accent)';
        document.body.append(probe);
        const accent = getComputedStyle(probe).color;
        probe.remove();
        return { name: `${el.tagName}${el.className ? '.' + el.className.split(' ')[0] : ''}`, style: s.outlineStyle, width: parseFloat(s.outlineWidth), color: s.outlineColor, accent };
      });
      if (!ring) continue;
      const [ringHex, accentHex] = [await resolveColor(page, ring.color), await resolveColor(page, ring.accent)];
      if (ring.style !== 'solid' || ring.width < 2 || hexDistance(ringHex, accentHex) > 1) problems.push(JSON.stringify(ring));
    }
    expect(problems).toEqual([]);
    expect(await page.locator('img:not([alt])').count()).toBe(0);
    const exposedSvg = await page.evaluate(() => [...document.querySelectorAll('svg')].filter((s) => !s.closest('[aria-hidden="true"]')).map((s) => s.outerHTML.slice(0, 80)));
    expect(exposedSvg).toEqual([]);
  });

  test('AC 6.9 reduced motion shows final states with nothing running', async ({ browser }) => {
    const context = await browser.newContext({ viewport: widths[1], reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#badge')).toHaveAttribute('data-badge-state', 'granted');
    await page.waitForLoadState('load');
    await page.waitForTimeout(300);
    expect(await page.locator('[data-trace-main]').evaluate((e) => parseFloat(getComputedStyle(e).strokeDashoffset))).toBe(0);
    expect(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length)).toBe(0);
    expect(await page.locator('[data-led]').evaluate((e) => getComputedStyle(e, '::after').animationName)).toBe('none');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).not.toBe('smooth');
    const startTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.locator('[data-theme-toggle]').click();
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    await expect(page.locator('html')).toHaveAttribute('data-theme', startTheme === 'light' ? 'dark' : 'light');
    await expect(page.locator('[data-contact-status]')).toHaveAttribute('data-status', 'granted');
  });

  for (const scheme of ['dark', 'light'] as const) {
    test(`AC 6.10 without JS everything is visible and the OS picks the theme (${scheme})`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: widths[0], javaScriptEnabled: false, colorScheme: scheme });
      const page = await context.newPage();
      await page.goto('/');
      for (const id of ['hero', 'about', 'experience', 'projects', 'research', 'skills', 'contact']) {
        await expect(page.locator(`#${id}`)).toBeVisible();
        expect((await page.locator(`#${id}`).innerText()).trim().length).toBeGreaterThan(20);
      }
      await expect(page.locator('#badge')).toHaveAttribute('data-badge-state', 'granted');
      await expect(page.locator('#badge').getByText('● ACCESS GRANTED')).toBeVisible();
      const hidden = await page.evaluate(() =>
        [...document.querySelectorAll('main *')]
          .filter((e) => !e.closest('[aria-hidden="true"], .sr-only') && (e.textContent ?? '').trim())
          .filter((e) => {
            const s = getComputedStyle(e);
            return s.opacity === '0' || s.visibility === 'hidden';
          })
          .map((e) => e.className),
      );
      expect(hidden).toEqual([]);
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(bg).toBe(scheme === 'light' ? 'rgb(244, 241, 234)' : 'rgb(11, 18, 24)');
      await expect(page.locator('.nav-links')).toBeVisible();
    });
  }
});
