import { expect, test, type Browser, type Page } from '@playwright/test';
import { openPage } from './helpers/page.ts';
import { THEMES } from './helpers/viewports.ts';

// Regression tests for the fix rounds: theme toggle, history and print.

const toggleState = (page: Page) =>
  page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    pressed: document.querySelector('[data-theme-toggle]')!.getAttribute('aria-pressed'),
    stored: localStorage.getItem('theme'),
  }));

async function fresh(browser: Browser, viewport: { width: number; height: number }, options = {}) {
  const context = await browser.newContext({ viewport, colorScheme: 'dark', ...options });
  const page = await context.newPage();
  await page.goto('/');
  await page.waitForTimeout(500);
  return page;
}

test.describe('theme toggle', () => {
  for (const presses of [2, 3, 5]) {
    test(`AC 3.14 ${presses} rapid clicks land on the parity-correct theme`, async ({ browser }) => {
      const page = await fresh(browser, { width: 1440, height: 900 });
      const b = (await page.locator('[data-theme-toggle]').boundingBox())!;
      for (let i = 0; i < presses; i++) {
        await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
        await page.waitForTimeout(40);
      }
      await page.waitForTimeout(1000);
      const light = presses % 2 === 1;
      expect(await toggleState(page)).toEqual({ theme: light ? 'light' : 'dark', pressed: String(light), stored: light ? 'light' : 'dark' });
    });
  }

  test('AC 3.14 Enter twice quickly returns to the original theme', async ({ browser }) => {
    const page = await fresh(browser, { width: 1440, height: 900 });
    await page.locator('[data-theme-toggle]').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    expect(await toggleState(page)).toEqual({ theme: 'dark', pressed: 'false', stored: 'dark' });
  });

  test('AC 3.14 a nav link clicked during the flip still navigates, and does not toggle', async ({ browser }) => {
    const page = await fresh(browser, { width: 1440, height: 900 });
    const t = (await page.locator('[data-theme-toggle]').boundingBox())!;
    const n = (await page.locator('.nav-links a[href="#skills"]').boundingBox())!;
    await page.mouse.click(t.x + t.width / 2, t.y + t.height / 2);
    await page.waitForTimeout(80);
    expect(await page.evaluate(() => document.getAnimations().some((a) => String((a.effect as KeyframeEffect)?.pseudoElement ?? '').includes('view-transition')))).toBe(true);
    await page.mouse.click(n.x + n.width / 2, n.y + n.height / 2);
    await page.waitForTimeout(1500);
    expect(page.url()).toContain('#skills');
    await expect(page.locator('#skills h2')).toBeInViewport();
    expect((await toggleState(page)).theme).toBe('light');
  });

  test('AC 3.14 a CTA clicked during the flip still activates', async ({ browser }) => {
    const page = await fresh(browser, { width: 1440, height: 900 });
    await page.evaluate(() => document.querySelector('#hero a[href="https://github.com/kvadlapa"]')!.addEventListener('click', (e) => {
      e.preventDefault();
      (window as unknown as { __cta: number }).__cta = ((window as unknown as { __cta?: number }).__cta ?? 0) + 1;
    }));
    const t = (await page.locator('[data-theme-toggle]').boundingBox())!;
    const c = (await page.locator('#hero').getByRole('link', { name: 'GitHub' }).boundingBox())!;
    await page.mouse.click(t.x + t.width / 2, t.y + t.height / 2);
    await page.waitForTimeout(80);
    await page.mouse.click(c.x + c.width / 2, c.y + c.height / 2);
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => (window as unknown as { __cta?: number }).__cta)).toBe(1);
    expect((await toggleState(page)).theme).toBe('light');
  });

  test('AC 3.14 clicks beside the button during the flip do not toggle', async ({ browser }) => {
    const page = await fresh(browser, { width: 1440, height: 900 });
    const b = (await page.locator('[data-theme-toggle]').boundingBox())!;
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(60);
    await page.mouse.click(b.x - 3, b.y + b.height / 2);
    await page.waitForTimeout(1000);
    expect(await toggleState(page)).toEqual({ theme: 'light', pressed: 'true', stored: 'light' });
  });
});

test.describe('history', () => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 667 }]) {
    const go = async (page: Page, id: string) => {
      if (viewport.width < 768) {
        await page.locator('[data-menu-open]').click();
        await page.locator(`#mobile-menu a[href="#${id}"]`).click();
      } else {
        await page.locator(`.nav-links a[href="#${id}"]`).click();
      }
      await page.waitForTimeout(1300);
    };
    const wheel = async (page: Page, dy: number) => {
      await page.mouse.move(viewport.width / 2, viewport.height / 2);
      await page.mouse.wheel(0, dy);
      await page.waitForTimeout(800);
    };
    const y = (page: Page) => page.evaluate(() => Math.round(scrollY));

    test(`AC 3.1 Back/Forward restore the exact positions, with no glide (${viewport.width})`, async ({ browser }) => {
      const page = await openPage(browser, viewport, 'dark');
      await wheel(page, 1100);
      const before = await y(page);
      await go(page, 'projects');
      await wheel(page, 700);
      const reading = await y(page);
      await go(page, 'skills');
      const skills = await y(page);

      await page.goBack();
      // Landed immediately: no animated scroll between the old and restored positions.
      await page.waitForTimeout(120);
      expect(Math.abs((await y(page)) - reading), 'Back to the reading position in #projects').toBeLessThanOrEqual(2);
      await page.waitForTimeout(900);
      expect(page.url()).toContain('#projects');
      expect(Math.abs((await y(page)) - reading), 'and it stays there').toBeLessThanOrEqual(2);

      await page.goBack();
      await page.waitForTimeout(900);
      expect(Math.abs((await y(page)) - before), 'Back to the manual position').toBeLessThanOrEqual(2);

      await page.goForward();
      await page.waitForTimeout(900);
      expect(Math.abs((await y(page)) - reading)).toBeLessThanOrEqual(2);
      await page.goForward();
      await page.waitForTimeout(900);
      expect(Math.abs((await y(page)) - skills)).toBeLessThanOrEqual(2);
      expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
    });
  }
});

/** Text nodes crushed into a narrow column (fewer than 4 characters per rendered line). */
const crushed = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = (n.textContent ?? '').trim();
      const el = n.parentElement!;
      if (text.length < 8 || el.closest('[aria-hidden="true"], .sr-only') || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const r = document.createRange();
      r.selectNodeContents(n);
      const lines = new Set([...r.getClientRects()].filter((t) => t.width > 0).map((t) => Math.round(t.top))).size;
      if (lines > 1 && text.length / lines < 4) out.push(`"${text}" on ${lines} lines`);
    }
    return out;
  });

const pdfPages = async (page: Page, format: 'Letter' | 'A4') => ((await page.pdf({ format })).toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;

test.describe('print', () => {
  for (const theme of THEMES) {
    for (const [format, width] of [['Letter', 816], ['A4', 794]] as const) {
      test(`print ${format} ${theme}: contact rows readable, footer not orphaned, final states`, async ({ browser }) => {
        const page = await openPage(browser, { width, height: 1056 }, theme);
        await page.emulateMedia({ media: 'print' });
        await page.waitForTimeout(400);
        expect(await crushed(page)).toEqual([]);
        for (const row of await page.locator('#contact .rows a').all()) {
          expect(await row.locator('.row-value').evaluate((e) => e.getBoundingClientRect().width)).toBeGreaterThan(60);
        }
        await expect(page.locator('[data-contact-status]')).toHaveAttribute('data-status', 'granted');
        const cta = await page.locator('#hero .btn-primary').evaluate((e) => getComputedStyle(e).color);
        expect(cta).toBe('rgb(0, 0, 0)');

        const withFooter = await pdfPages(page, format);
        await page.addStyleTag({ content: '.site-footer{display:none!important}' });
        const withoutFooter = await pdfPages(page, format);
        expect(withFooter, 'the footer does not add a page of its own').toBe(withoutFooter);
        expect(withFooter).toBeGreaterThanOrEqual(2);
        expect(withFooter).toBeLessThanOrEqual(12);
      });
    }
  }
});
