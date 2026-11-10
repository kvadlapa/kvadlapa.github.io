import { expect, test, type Page } from '@playwright/test';
import { BRAND, hexDistance, openPage, pathVertices, resolveColor, scrollToY } from './helpers/page.ts';

const desktop = { width: 1440, height: 900 };
const phone = { viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true };

/** Converts trace user units (main-relative CSS px) to page coordinates. */
const svgOrigin = (page: Page) =>
  page.evaluate(() => {
    const box = (document.querySelector('svg[data-trace]') as SVGSVGElement).getBoundingClientRect();
    return { x: box.left + scrollX, y: box.top + scrollY };
  });

const pageBox = (page: Page, selector: string) =>
  page.locator(selector).evaluate((el) => {
    const b = el.getBoundingClientRect();
    return { left: b.left + scrollX, top: b.top + scrollY, right: b.right + scrollX, bottom: b.bottom + scrollY };
  });

test.describe('sections and signature moments', () => {
  test('AC 3.1 section order, nav labels, and nav targets clear the nav', async ({ browser }) => {
    const page = await openPage(browser, desktop, 'dark');
    const ids = await page.locator('main > section').evaluateAll((els) => els.map((e) => e.id));
    expect(ids).toEqual(['hero', 'about', 'experience', 'projects', 'research', 'skills', 'contact']);
    const links = page.locator('.nav-links a');
    await expect(links).toHaveText(['/about', '/experience', '/projects', '/research', '/skills', '/contact']);
    for (const id of ['about', 'experience', 'projects', 'research', 'skills', 'contact']) {
      await scrollToY(page, 0);
      await page.locator(`.nav-links a[href="#${id}"]`).click();
      await page.waitForTimeout(1200);
      const nav = await page.locator('.site-header').evaluate((e) => e.getBoundingClientRect().bottom);
      const heading = await page.locator(`#${id} h2`).evaluate((e) => {
        const b = e.getBoundingClientRect();
        return { top: b.top, bottom: b.bottom };
      });
      expect(heading.top, id).toBeGreaterThanOrEqual(nav);
      expect(heading.bottom, id).toBeLessThanOrEqual(desktop.height);
    }
  });

  test('AC 3.2 nav stays at the top with a blur', async ({ browser }) => {
    const page = await openPage(browser, desktop, 'dark');
    await scrollToY(page, 2000);
    const nav = await page.locator('.site-header').evaluate((e) => ({ top: e.getBoundingClientRect().top, filter: getComputedStyle(e).backdropFilter }));
    expect(nav.top).toBe(0);
    expect(nav.filter).toContain('blur');
  });

  test('AC 3.3 badge goes scanning, verifying, granted within 2s of load (>=1024)', async ({ browser }) => {
    const context = await browser.newContext({ viewport: desktop });
    await context.addInitScript(() => {
      const log: { state: string; text: string; t: number }[] = [];
      (window as unknown as { __badge: typeof log }).__badge = log;
      new MutationObserver((records) => {
        for (const r of records) {
          const el = r.target as HTMLElement;
          if (r.attributeName !== 'data-badge-state' || !el.dataset.badgeState) continue;
          const visible = [...el.querySelectorAll<HTMLElement>('.st')].find((s) => getComputedStyle(s).visibility === 'visible');
          log.push({ state: el.dataset.badgeState, text: visible?.textContent?.trim() ?? '', t: performance.now() });
        }
      }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-badge-state'] });
    });
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForFunction(() => document.querySelector('#badge')?.getAttribute('data-badge-state') === 'granted', null, { timeout: 4000 });
    const { log, load } = await page.evaluate(() => ({
      log: (window as unknown as { __badge: { state: string; text: string; t: number }[] }).__badge,
      load: performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming,
    }));
    expect(log.map((e) => e.state)).toEqual(['scanning', 'verifying', 'granted']);
    expect(log[1].text).toBe('VERIFYING…');
    expect(log[2].text).toBe('● ACCESS GRANTED');
    expect(log[2].t - load.loadEventEnd).toBeLessThanOrEqual(2000);
  });

  test('AC 3.3 (A2) below 1024 the sequence completes within 2s of entering view', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForTimeout(500);
    const state = await page.locator('#badge').getAttribute('data-badge-state');
    const inView = await page.locator('#badge').evaluate((e) => e.getBoundingClientRect().top < innerHeight * 0.85);
    if (!inView) expect(state).toBe('scanning');
    const start = Date.now();
    await page.locator('#badge').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('#badge')?.getAttribute('data-badge-state') === 'granted', null, { timeout: 3000 });
    expect(Date.now() - start).toBeLessThanOrEqual(2000);
  });

  test('AC 3.4 granted card shows role, stack, location and open_to_work', async ({ browser }) => {
    const page = await openPage(browser, desktop, 'dark');
    const card = page.locator('#badge');
    await expect(card).toHaveAttribute('data-badge-state', 'granted');
    const text = (await card.innerText()).replace(/\s+/g, ' ');
    for (const s of ['Software Engineer', 'C#/.NET · Java · REST/SOAP', 'Houghton, MI', '"open_to_work": true']) expect(text).toContain(s);
  });

  test('AC 3.5 four hero CTAs, clickable before granted', async ({ browser }) => {
    const context = await browser.newContext({ viewport: desktop });
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const hero = page.locator('#hero');
    const names = [/^(Resume|Request resume)$/, /^GitHub$/, /^LinkedIn$/, /^Email$/];
    const stateBefore = await page.locator('#badge').getAttribute('data-badge-state');
    for (const name of names) {
      const cta = hero.getByRole('link', { name });
      await expect(cta).toHaveCount(1);
      await cta.click({ trial: true, timeout: 500 });
    }
    expect(['scanning', 'verifying']).toContain(stateBefore);
    await expect(hero.locator('.cta-group a')).toHaveCount(4);
  });

  for (const [viewport, theme] of [
    [{ width: 768, height: 1024 }, 'dark'],
    [{ width: 1024, height: 768 }, 'light'],
    [{ width: 1440, height: 900 }, 'dark'],
    [{ width: 1440, height: 900 }, 'light'],
    [{ width: 3840, height: 2160 }, 'dark'],
  ] as const) {
    test(`AC 3.6 one trace, hero to contact panel, six section branches (${viewport.width} ${theme})`, async ({ browser }) => {
      const page = await openPage(browser, viewport, theme);
      await expect(page.locator('svg[data-trace]')).toHaveCount(1);
      const points = await pathVertices(page, '[data-trace-main]');
      expect(points.some((p) => Number.isNaN(p.x))).toBe(false);
      const origin = await svgOrigin(page);
      const start = { x: points[0].x + origin.x, y: points[0].y + origin.y };
      const end = { x: points.at(-1)!.x + origin.x, y: points.at(-1)!.y + origin.y };
      const inside = (p: { x: number; y: number }, b: { left: number; top: number; right: number; bottom: number }) => p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom;
      expect(inside(start, await pageBox(page, '#hero'))).toBe(true);
      expect(inside(end, await pageBox(page, '[data-contact-panel]'))).toBe(true);
      // The trace leaves the credential: it starts at the badge's bottom pad.
      const pad = await pageBox(page, '[data-trace-anchor="start"]');
      expect(Math.abs(start.x - (pad.left + pad.right) / 2)).toBeLessThanOrEqual(1);
      expect(Math.abs(start.y - (pad.top + pad.bottom) / 2)).toBeLessThanOrEqual(1);
      const branches = await page.locator('[data-branch]').evaluateAll((els) => els.map((e) => e.getAttribute('data-branch')));
      for (const name of ['about', 'experience', 'projects', 'research', 'skills', 'contact', 'contact-label']) expect(branches).toContain(name);
    });

    test(`AC 3.7 trace draws with scroll and shifts copper to patina (${viewport.width} ${theme})`, async ({ browser }) => {
      const page = await openPage(browser, viewport, theme);
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      const offsets: number[] = [];
      for (let i = 0; i < 5; i++) {
        await scrollToY(page, Math.round((max * i) / 4));
        offsets.push(await page.locator('[data-trace-main]').evaluate((e) => parseFloat(getComputedStyle(e).strokeDashoffset)));
      }
      for (let i = 1; i < offsets.length; i++) expect(offsets[i]).toBeLessThan(offsets[i - 1]);
      expect(offsets.at(-1)).toBeLessThanOrEqual(1);
      const stops = await page.locator('#trace-grad stop').evaluateAll((els) => els.map((e) => getComputedStyle(e).stopColor));
      expect(hexDistance(await resolveColor(page, stops[0]), BRAND[theme].copper)).toBeLessThanOrEqual(1);
      expect(hexDistance(await resolveColor(page, stops.at(-1)!), BRAND[theme].patina)).toBeLessThanOrEqual(1);
    });
  }

  test('M2 the /contact label via is wired to the drop line, along the label row', async ({ browser }) => {
    const page = await openPage(browser, { width: 1440, height: 900 }, 'dark');
    const branch = await pathVertices(page, '[data-branch="contact-label"]');
    const origin = await svgOrigin(page);
    const via = await pageBox(page, '#contact [data-trace-anchor="section"]');
    const drop = (await pathVertices(page, '[data-branch="contact"]'))[0];
    expect(Math.abs(branch[0].x - drop.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(branch.at(-1)!.x + origin.x - (via.left + via.right) / 2)).toBeLessThanOrEqual(1);
    for (const p of branch) expect(Math.abs(p.y + origin.y - (via.top + via.bottom) / 2)).toBeLessThanOrEqual(1);
  });

  test('M1 the board grid runs through the hero above its scrim', async ({ browser }) => {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 3840, height: 2160 }]) {
      const page = await openPage(browser, viewport, 'dark');
      const layers = await page.evaluate(() => {
        const grid = document.querySelector('#hero .board-grid-pattern') as HTMLElement;
        const base = document.querySelector('.board-grid.board-grid-pattern') as HTMLElement;
        const z = (el: Element, pseudo?: string) => Number(getComputedStyle(el, pseudo).zIndex);
        const g = grid.getBoundingClientRect();
        const b = base.getBoundingClientRect();
        return {
          sameImage: getComputedStyle(grid).backgroundImage === getComputedStyle(base).backgroundImage,
          // Both layers start at the page top, so their grid phase matches at the seam.
          phase: Math.round(g.top + scrollY) - Math.round(b.top + scrollY),
          gridZ: z(grid),
          scrimZ: z(document.querySelector('.hero-copy')!, '::before'),
          copyZ: z(document.querySelector('#hero h1')!),
        };
      });
      expect(layers.sameImage).toBe(true);
      expect(layers.phase).toBe(0);
      expect(layers.gridZ).toBeGreaterThan(layers.scrimZ);
      expect(layers.copyZ).toBeGreaterThan(layers.gridZ);
      await page.context().close();
    }
  });

  test('M3 landscape 844x390: all four CTAs on one row, badge values inside the card', async ({ browser }) => {
    const page = await openPage(browser, { width: 844, height: 390 }, 'dark');
    const tops = await page.locator('#hero .cta-group a').evaluateAll((as) => as.map((a) => Math.round(a.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    for (const box of await page.locator('#hero .cta-group a').evaluateAll((as) => as.map((a) => a.getBoundingClientRect().height))) expect(box).toBeGreaterThanOrEqual(44);
    const spill = await page.locator('#badge .val').evaluateAll((vs) =>
      vs.map((v) => {
        const card = v.closest('.badge')!;
        const right = card.getBoundingClientRect().right - parseFloat(getComputedStyle(card).paddingRight);
        return { lines: v.getClientRects().length, over: v.getBoundingClientRect().right - right };
      }),
    );
    for (const v of spill) {
      expect(v.lines).toBe(1);
      expect(v.over).toBeLessThanOrEqual(0);
    }
  });

  test('AC 3.8 story is 3-4 sentences beside the Keweenaw slot', async ({ browser }) => {
    const page = await openPage(browser, { width: 1440, height: 900 }, 'dark');
    const story = await page.locator('[data-story]').innerText();
    const sentences = story.match(/[^.]+\./g) ?? [];
    expect(sentences.length).toBeGreaterThanOrEqual(3);
    expect(sentences.length).toBeLessThanOrEqual(4);
    for (const width of [1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(200);
      const a = await pageBox(page, '[data-story]');
      const b = await pageBox(page, '#about [data-slot="keweenaw"]');
      expect(a.top < b.bottom && b.top < a.bottom, `same row at ${width}`).toBe(true);
      expect(b.left).toBeGreaterThan(a.right);
    }
  });

  test('AC 3.9 hover, keyboard focus power a component and light its branch', async ({ browser }) => {
    const page = await openPage(browser, desktop, 'dark');
    const card = page.locator('[data-component="U2"]');
    const branch = page.locator('[data-branch="component-U2"]');
    const stroke = () => branch.evaluate((e) => `${getComputedStyle(e).stroke} ${getComputedStyle(e).strokeWidth}`);
    const before = await stroke();
    await card.hover();
    await page.waitForTimeout(350);
    await expect(card).toHaveAttribute('data-powered', '');
    expect(await card.evaluate((e) => getComputedStyle(e).boxShadow)).not.toBe('none');
    expect(await stroke()).not.toBe(before);
    await page.mouse.move(5, 5);
    await page.waitForTimeout(300);
    await expect(card).not.toHaveAttribute('data-powered');

    await page.locator('[data-component="U3"]').focus();
    await page.keyboard.press('Tab');
    await expect(card).toBeFocused();
    await expect(card).toHaveAttribute('data-powered', '');
    await expect(page.locator('[data-powered]')).toHaveCount(1);
  });

  test('AC 3.9 tap powers a component and moves on tap (phone and 768 touch)', async ({ browser }) => {
    for (const viewport of [phone.viewport, { width: 768, height: 1024 }]) {
      const page = await openPage(browser, viewport, 'dark', { hasTouch: true, isMobile: true });
      const u2 = page.locator('[data-component="U2"]');
      const u1 = page.locator('[data-component="U1"]');
      await u2.scrollIntoViewIfNeeded();
      await u2.tap();
      await page.waitForTimeout(350);
      await expect(u2).toHaveAttribute('data-powered', '');
      expect(await u2.evaluate((e) => getComputedStyle(e).boxShadow)).not.toBe('none');
      if (viewport.width < 768) {
        expect(await u2.evaluate((e) => getComputedStyle(e, '::before').transform)).toBe('matrix(1, 0, 0, 1, 0, 0)');
      } else {
        await expect(page.locator('[data-branch="component-U2"]')).toHaveAttribute('data-lit', '');
      }
      await u1.scrollIntoViewIfNeeded();
      await u1.tap();
      await page.waitForTimeout(100);
      await expect(u1).toHaveAttribute('data-powered', '');
      await expect(u2).not.toHaveAttribute('data-powered');
      await page.context().close();
    }
  });

  test('AC 3.10 only U3 has a running LED animation, across every LED on the page', async ({ browser }) => {
    const page = await openPage(browser, desktop, 'dark');
    await scrollToY(page, 'bottom');
    await page.waitForTimeout(600);
    const result = await page.evaluate(() => {
      const running = document.getAnimations().filter((a) => a.playState === 'running');
      const target = (a: Animation) => (a.effect as KeyframeEffect).target as Element;
      const leds = [...document.querySelectorAll('[data-led], .led')];
      return {
        ledCount: leds.length,
        animatedLeds: leds
          .filter((led) => running.some((a) => target(a) === led))
          .map((led) => led.closest('[data-component], #hero, #contact')?.getAttribute('data-component') ?? led.closest('section')?.id),
        infinite: running.filter((a) => (a.effect as KeyframeEffect).getComputedTiming().iterations === Infinity).map((a) => target(a).closest('[data-component]')?.getAttribute('data-component') ?? target(a).tagName),
      };
    });
    expect(result.ledCount).toBeGreaterThanOrEqual(3);
    expect(result.animatedLeds).toEqual(['U3']);
    expect(result.infinite).toEqual(['U3']);
  });

  test('AC 3.11 cursor glow follows a fine pointer only; tags are mono', async ({ browser }) => {
    const page = await openPage(browser, desktop, 'dark');
    const card = page.locator('[data-project-card]').first();
    await card.scrollIntoViewIfNeeded();
    const glow = () => card.evaluate((e) => [getComputedStyle(e).getPropertyValue('--glow-x'), getComputedStyle(e).getPropertyValue('--glow-y')].join());
    const before = await glow();
    const box = (await card.boundingBox())!;
    await page.mouse.move(box.x + 20, box.y + 30);
    await page.mouse.move(box.x + 60, box.y + 50);
    await page.waitForTimeout(100);
    expect(await glow()).not.toBe(before);
    for (const family of await page.locator('[data-tag]').evaluateAll((els) => els.map((e) => getComputedStyle(e).fontFamily))) expect(family).toMatch(/^"?DM Mono/);
    expect(await page.locator('[data-tag]').count()).toBeGreaterThan(0);

    const mobile = await openPage(browser, phone.viewport, 'dark', { hasTouch: true, isMobile: true });
    // The stretched title link covers the card; keep the tap on this page.
    await mobile.evaluate(() => document.addEventListener('click', (event) => event.preventDefault(), true));
    const mcard = mobile.locator('[data-project-card]').first();
    await mcard.scrollIntoViewIfNeeded();
    const mglow = () => mcard.evaluate((e) => [getComputedStyle(e).getPropertyValue('--glow-x'), getComputedStyle(e).getPropertyValue('--glow-y')].join());
    const mbefore = await mglow();
    const mbox = (await mcard.boundingBox())!;
    await mobile.touchscreen.tap(mbox.x + 30, mbox.y + mbox.height - 20);
    await mobile.mouse.move(mbox.x + 50, mbox.y + 40);
    await mobile.waitForTimeout(100);
    expect(await mglow()).toBe(mbefore);
  });

  test('AC 3.12 two research cards, each with a slot cover', async ({ browser }) => {
    const page = await openPage(browser, desktop, 'dark');
    const cards = page.locator('#research [data-research-card]');
    await expect(cards).toHaveCount(2);
    for (const card of await cards.all()) await expect(card.locator('.cover [data-slot]')).toHaveCount(1);
  });

  test('AC 3.13 contact panel, footer line, and copy email', async ({ browser }) => {
    const page = await openPage(browser, desktop, 'dark', { permissions: ['clipboard-read', 'clipboard-write'] });
    const contact = page.locator('#contact');
    await expect(contact.getByRole('heading', { name: 'Request access' })).toBeVisible();
    expect(await contact.locator('a[href^="mailto:"]').count()).toBeGreaterThan(0);
    await expect(contact.locator('a[href="https://github.com/kvadlapa"]')).toHaveCount(1);
    await expect(contact.locator('a[href="https://linkedin.com/in/kvadlapa"]')).toHaveCount(1);
    expect((await page.locator('footer').innerText()).trim()).toBe('Built in Copper Country.');
    await expect(contact.getByRole('button', { name: 'Copy email' })).toHaveCount(1);
    const copy = contact.locator('[data-copy-slot] button');
    await copy.click();
    await expect(copy).toHaveText('Copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('vadlapallykiran@gmail.com');

    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: desktop });
    const plain = await noJs.newPage();
    await plain.goto('/');
    await expect(plain.locator('#contact button')).toHaveCount(0);
    await noJs.close();
  });
});
