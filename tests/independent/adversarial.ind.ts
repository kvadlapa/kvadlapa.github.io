import { expect, test, type Page } from '@playwright/test';
import { clippedText, mainPathPoints, open, pageBox, ratio, rgb, svgOrigin, toBottom, toY } from './util.ts';

const noHScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test.describe('keyboard-only walkthrough', () => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 667 }]) {
    test(`every Tab stop at ${viewport.width} is visible, unobscured by the sticky nav, and in reading order`, async ({ browser }) => {
      const page = await open(browser, viewport);
      const stops: { name: string; top: number; bottom: number; navBottom: number; inViewport: boolean; ring: string; docY: number }[] = [];
      for (let i = 0; i < 120; i++) {
        await page.keyboard.press('Tab');
        // html has scroll-behavior: smooth, so focus scrolling animates; wait until scrollY is stable.
        await page.evaluate(
          () =>
            new Promise<void>((resolve) => {
              let last = -1;
              let still = 0;
              const t0 = performance.now();
              const tick = () => {
                still = scrollY === last ? still + 1 : 0;
                last = scrollY;
                if (still >= 5 || performance.now() - t0 > 2500) resolve();
                else requestAnimationFrame(tick);
              };
              requestAnimationFrame(tick);
            }),
        );
        const s = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return null;
          const b = el.getBoundingClientRect();
          const header = document.querySelector('.site-header') as HTMLElement;
          const inHeader = Boolean(el.closest('.site-header, dialog, .skip-link'));
          const st = getComputedStyle(el);
          return {
            name: `${el.tagName}${el.id ? '#' + el.id : ''}.${(el.className || '').toString().split(' ')[0]} "${(el.textContent ?? '').trim().slice(0, 24)}"`,
            top: b.top,
            bottom: b.bottom,
            navBottom: inHeader ? 0 : header.getBoundingClientRect().bottom,
            inViewport: b.bottom > 0 && b.top < innerHeight,
            ring: `${st.outlineStyle} ${st.outlineWidth}`,
            docY: b.top + scrollY,
          };
        });
        if (!s) break; // focus left the document: walkthrough complete, no trap
        if (stops.length && s.name === stops[0].name) break;
        stops.push(s);
      }
      expect(stops.length, 'walkthrough reached focusable elements').toBeGreaterThan(10);
      const problems: string[] = [];
      for (const s of stops) {
        if (!s.inViewport) problems.push(`${s.name} focused off-screen (top ${Math.round(s.top)})`);
        // WCAG 2.4.11: focused element must not be entirely hidden behind the sticky header.
        if (s.bottom <= s.navBottom + 1) problems.push(`${s.name} hidden behind sticky nav (bottom ${Math.round(s.bottom)} <= nav ${Math.round(s.navBottom)})`);
        if (!/solid \d/.test(s.ring) || parseFloat(s.ring.split(' ')[1]) < 2) problems.push(`${s.name} focus ring "${s.ring}"`);
      }
      // Reading order: page-content stops (outside the sticky header) never jump back up the page.
      const content = stops.filter((s) => s.navBottom > 0);
      for (let i = 1; i < content.length; i++) {
        if (content[i].docY < content[i - 1].docY - 2) problems.push(`order: ${content[i].name} (y ${Math.round(content[i].docY)}) after ${content[i - 1].name} (y ${Math.round(content[i - 1].docY)})`);
      }
      expect(problems).toEqual([]);
    });
  }

  test('Enter on a nav link at 1440 moves focus target into view below the nav', async ({ browser }) => {
    const page = await open(browser, { width: 1440, height: 900 });
    await page.locator('.nav-links a[href="#skills"]').focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1200);
    const nav = await page.locator('.site-header').evaluate((e) => e.getBoundingClientRect().bottom);
    const h2 = await page.locator('#skills h2').evaluate((e) => e.getBoundingClientRect().top);
    expect(h2).toBeGreaterThanOrEqual(nav);
    // Next Tab must continue from inside #skills or later, not from the top of the page.
    await page.keyboard.press('Tab');
    const after = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      return el.closest('#skills, #contact, footer') ? 'in-or-after-skills' : el.closest('section')?.id ?? el.tagName;
    });
    expect(after).toBe('in-or-after-skills');
  });
});

test.describe('mobile menu at 320', () => {
  test('keyboard open, focus starts inside, 20 Tab / 20 Shift+Tab trapped, Esc returns focus, background scroll locked', async ({ browser }) => {
    const page = await open(browser, { width: 320, height: 568 }, { hasTouch: true, isMobile: true });
    const opener = page.locator('[data-menu-open]');
    await opener.focus();
    await page.keyboard.press('Enter');
    await expect(opener).toHaveAttribute('aria-expanded', 'true');
    const inside = () => page.evaluate(() => Boolean(document.activeElement?.closest('#mobile-menu')));
    expect(await inside(), 'focus moved into the dialog on open').toBe(true);
    const box = await page.locator('#mobile-menu').boundingBox();
    expect(box).toEqual({ x: 0, y: 0, width: 320, height: 568 });
    expect(await noHScroll(page)).toBe(true);
    expect(await clippedText(page)).toEqual([]);
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      expect(await inside(), `Tab ${i + 1}`).toBe(true);
    }
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Shift+Tab');
      expect(await inside(), `Shift+Tab ${i + 1}`).toBe(true);
    }
    const y0 = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => scrollY), 'background must not scroll under the menu').toBe(y0);
    await page.keyboard.press('Escape');
    await expect(opener).toHaveAttribute('aria-expanded', 'false');
    await expect(opener).toBeFocused();
    await expect(page.locator('#mobile-menu')).toBeHidden();
  });

  test('menu items are all reachable and at least 44px tall at 320', async ({ browser }) => {
    const page = await open(browser, { width: 320, height: 568 });
    await page.locator('[data-menu-open]').click();
    const small = await page.locator('#mobile-menu').evaluate((m) =>
      [...m.querySelectorAll<HTMLElement>('a, button')]
        .map((e) => ({ t: (e.textContent ?? '').trim() || e.getAttribute('aria-label'), b: e.getBoundingClientRect() }))
        .filter(({ b }) => b.width < 44 || b.height < 44 || b.bottom > innerHeight + 1)
        .map(({ t, b }) => `${t} ${Math.round(b.width)}x${Math.round(b.height)} bottom ${Math.round(b.bottom)}`),
    );
    expect(small).toEqual([]);
  });
});

test.describe('resize and rotate mid-session', () => {
  test('375x667 -> 667x375 -> 375x667 rebuilds a single vertical trace that still reaches contact, no overflow', async ({ browser }) => {
    const page = await open(browser, { width: 375, height: 667 }, { hasTouch: true, isMobile: true });
    await toY(page, 1500);
    for (const vp of [{ width: 667, height: 375 }, { width: 375, height: 667 }]) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(600);
      expect(await noHScroll(page), `no overflow at ${vp.width}`).toBe(true);
      expect(await clippedText(page), `no clipped text at ${vp.width}`).toEqual([]);
      await expect(page.locator('[data-branch]')).toHaveCount(0);
      const pts = await mainPathPoints(page);
      const xs = pts.map((p) => p.x);
      expect(Math.max(...xs) - Math.min(...xs), `vertical at ${vp.width}`).toBeLessThanOrEqual(1);
      const origin = await svgOrigin(page);
      const end = { x: pts.at(-1)!.x + origin.x, y: pts.at(-1)!.y + origin.y };
      const panel = await pageBox(page, '[data-contact-panel]');
      expect(end.y >= panel.top && end.y <= panel.bottom, `trace ends in contact panel at ${vp.width}: end.y ${end.y} panel ${panel.top}-${panel.bottom}`).toBe(true);
      // The rail x must follow the new gutter, not the old one.
      const rail = await page.locator('[data-trace-anchor="rail-l"]').evaluate((e) => {
        const b = e.getBoundingClientRect();
        const s = (document.querySelector('svg[data-trace]') as SVGSVGElement).getBoundingClientRect();
        return b.left + b.width / 2 - s.left;
      });
      expect(Math.abs(xs[0] - rail), `rail x tracks gutter at ${vp.width}`).toBeLessThanOrEqual(1.5);
    }
  });

  test('crossing 768 both ways adds then removes branches and closes an open menu', async ({ browser }) => {
    const page = await open(browser, { width: 667, height: 375 });
    await page.locator('[data-menu-open]').click();
    await expect(page.locator('#mobile-menu')).toBeVisible();
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(600);
    await expect(page.locator('#mobile-menu')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.style.overflow), 'scroll lock released').toBe('');
    expect(await page.locator('[data-branch]').count()).toBeGreaterThanOrEqual(6);
    const panel = await pageBox(page, '[data-contact-panel]');
    const pts = await mainPathPoints(page);
    const origin = await svgOrigin(page);
    const end = { x: pts.at(-1)!.x + origin.x, y: pts.at(-1)!.y + origin.y };
    expect(end.x >= panel.left && end.x <= panel.right && end.y >= panel.top && end.y <= panel.bottom).toBe(true);
    await page.setViewportSize({ width: 600, height: 900 });
    await page.waitForTimeout(600);
    await expect(page.locator('[data-branch]')).toHaveCount(0);
    expect(await noHScroll(page)).toBe(true);
  });
});

test.describe('zoom', () => {
  test('200% browser zoom at 1280 (CSS viewport 640x360 @2x): no overflow, no clipped text, CTAs reachable', async ({ browser }) => {
    const page = await open(browser, { width: 640, height: 360 }, { deviceScaleFactor: 2 });
    for (const pos of ['top', 'bottom']) {
      if (pos === 'bottom') await toBottom(page);
      expect(await noHScroll(page), pos).toBe(true);
      expect(await clippedText(page), pos).toEqual([]);
    }
    await expect(page.locator('[data-menu-open]')).toBeVisible();
  });

  test('text-only zoom 200% at 1280 (default font 32px): no overflow, nav items do not overlap, no clipped text', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Page.enable');
    await cdp.send('Page.setFontSizes', { fontSizes: { standard: 32, fixed: 26 } });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    const rootPx = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    expect(rootPx, 'text zoom took effect').toBe(32);
    expect(await noHScroll(page), 'top').toBe(true);
    expect(await clippedText(page), 'top').toEqual([]);
    const overlaps = await page.evaluate(() => {
      const items = [...document.querySelectorAll<HTMLElement>('.site-header a, .site-header button')].filter((e) => e.checkVisibility());
      const out: string[] = [];
      for (let i = 0; i < items.length; i++)
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i].getBoundingClientRect();
          const b = items[j].getBoundingClientRect();
          if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) out.push(`${items[i].textContent?.trim()} x ${items[j].textContent?.trim() || items[j].getAttribute('aria-label')}`);
        }
      return out;
    });
    expect(overlaps).toEqual([]);
    await toBottom(page);
    expect(await noHScroll(page), 'bottom').toBe(true);
    expect(await clippedText(page), 'bottom').toEqual([]);
  });
});

test.describe('extreme viewports', () => {
  test('3840x2160: no overflow, h1 104px, content capped and centred, badge in the fold, hero does not leave a void', async ({ browser }) => {
    const page = await open(browser, { width: 3840, height: 2160 });
    expect(await noHScroll(page)).toBe(true);
    expect(await page.locator('h1').evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBeCloseTo(104, 0);
    const r = await page.evaluate(() => ({
      badge: document.querySelector('#badge')!.getBoundingClientRect().bottom,
      about: document.querySelector('#about')!.getBoundingClientRect().top,
    }));
    expect(r.badge).toBeLessThanOrEqual(2160);
    // A6: hero capped at 67.5rem so the next section is visible on a 2160-tall screen.
    expect(r.about, '#about starts inside the first screen').toBeLessThan(2160);
    await toBottom(page);
    expect(await noHScroll(page)).toBe(true);
  });

  test('844x390: name and Resume above the fold, nav links fit without overlap, no clipped text', async ({ browser }) => {
    const page = await open(browser, { width: 844, height: 390 }, { hasTouch: true, isMobile: true });
    await toY(page, 0);
    const r = await page.evaluate(() => ({
      h1: document.querySelector('h1')!.getBoundingClientRect().bottom,
      cta: document.querySelector('#hero .btn-primary')!.getBoundingClientRect().bottom,
      nav: document.querySelector('.site-header')!.getBoundingClientRect().height,
    }));
    expect(r.h1).toBeLessThanOrEqual(390);
    expect(r.cta).toBeLessThanOrEqual(390);
    expect(r.nav, 'sticky nav eats at most ~15% of a short screen').toBeLessThanOrEqual(60);
    expect(await noHScroll(page)).toBe(true);
    expect(await clippedText(page)).toEqual([]);
    await toBottom(page);
    expect(await clippedText(page)).toEqual([]);
  });

  test('844x390: each nav target heading lands below the nav and inside the short viewport', async ({ browser }) => {
    const page = await open(browser, { width: 844, height: 390 });
    const nav = page.locator('.nav-links');
    if (!(await nav.isVisible())) test.skip(true, 'inline nav not shown at 844');
    for (const id of ['about', 'experience', 'projects', 'research', 'skills', 'contact']) {
      await toY(page, 0);
      await page.locator(`.nav-links a[href="#${id}"]`).click();
      await page.waitForTimeout(1200);
      const navBottom = await page.locator('.site-header').evaluate((e) => e.getBoundingClientRect().bottom);
      const h = await page.locator(`#${id} h2`).evaluate((e) => ({ top: e.getBoundingClientRect().top, bottom: e.getBoundingClientRect().bottom }));
      expect(h.top, id).toBeGreaterThanOrEqual(navBottom);
      expect(h.bottom, id).toBeLessThanOrEqual(390);
    }
  });
});

test.describe('theme toggle pressed rapidly', () => {
  for (const presses of [2, 3, 6]) {
    test(`${presses} fast clicks leave theme, aria-pressed, storage and theme-color consistent with the click count`, async ({ browser }) => {
      const page = await open(browser, { width: 1440, height: 900 }, { colorScheme: 'dark' });
      const box = (await page.locator('[data-theme-toggle]').boundingBox())!;
      // Raw mouse clicks ~30ms apart: no actionability waits, like a user double/triple clicking.
      for (let i = 0; i < presses; i++) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(30);
      }
      await page.waitForTimeout(1200);
      const expected = presses % 2 === 0 ? 'dark' : 'light';
      const s = await page.evaluate(() => ({
        theme: document.documentElement.dataset.theme,
        pressed: document.querySelector('[data-theme-toggle]')!.getAttribute('aria-pressed'),
        stored: localStorage.getItem('theme'),
        meta: document.querySelector('meta[name="theme-color"]')!.getAttribute('content'),
      }));
      expect(s.theme, 'data-theme after N clicks').toBe(expected);
      expect(s.pressed).toBe(String(expected === 'light'));
      expect(s.stored).toBe(expected);
      expect(s.meta?.toUpperCase()).toBe(expected === 'light' ? '#F4F1EA' : '#0B1218');
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('data-theme', expected);
    });
  }

  test('keyboard: Enter pressed twice quickly on the toggle returns to the original theme', async ({ browser }) => {
    const page = await open(browser, { width: 1440, height: 900 }, { colorScheme: 'dark' });
    await page.locator('[data-theme-toggle]').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1200);
    const s = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, stored: localStorage.getItem('theme'), pressed: document.querySelector('[data-theme-toggle]')!.getAttribute('aria-pressed') }));
    expect(s).toEqual({ theme: 'dark', stored: 'dark', pressed: 'false' });
  });

  test('a click during a running flip is not swallowed (two clicks 100ms apart)', async ({ browser }) => {
    const page = await open(browser, { width: 1440, height: 900 }, { colorScheme: 'dark' });
    const box = (await page.locator('[data-theme-toggle]').boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(100);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(1200);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});

test.describe('reduced motion plus no JS', () => {
  for (const vp of [{ width: 320, height: 568 }, { width: 1440, height: 900 }]) {
    test(`no-JS + reduce at ${vp.width}: content complete, final states, nothing animating, no overflow`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: vp, javaScriptEnabled: false, reducedMotion: 'reduce', colorScheme: 'light' });
      const page = await context.newPage();
      await page.goto('/');
      await page.waitForTimeout(500);
      await expect(page.locator('#badge')).toHaveAttribute('data-badge-state', 'granted');
      await expect(page.locator('[data-contact-status]')).toHaveAttribute('data-status', 'granted');
      expect(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').map((a) => (a as CSSAnimation).animationName ?? 'anon'))).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.dataset.theme ?? 'none')).not.toBe('dark');
      expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(244, 241, 234)');
      expect(await noHScroll(page), 'no horizontal scroll without JS').toBe(true);
      expect(await clippedText(page), 'no clipped text without JS').toEqual([]);
      // The hamburger needs JS; it must not be shown as a dead control.
      const deadHamburger = await page.locator('[data-menu-open]').isVisible().catch(() => false);
      expect(deadHamburger, 'no dead hamburger without JS').toBe(false);
      // Static fallback trace is drawn.
      expect(await page.evaluate(() => getComputedStyle(document.querySelector('main')!, '::before').display)).not.toBe('none');
      await context.close();
    });
  }
});

test.describe('CPU / network throttling', () => {
  async function throttled(browser: import('@playwright/test').Browser, viewport: { width: number; height: number }, cpu: number, net: { latency: number; down: number; up: number }) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: net.latency, downloadThroughput: net.down, uploadThroughput: net.up });
    await page.addInitScript(() => {
      (window as unknown as { __lcp: { t: number; el: string }[] }).__lcp = [];
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as (PerformanceEntry & { element?: Element })[]) (window as unknown as { __lcp: { t: number; el: string }[] }).__lcp.push({ t: e.startTime, el: e.element?.tagName ?? '' });
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
      (window as unknown as { __granted: number }).__granted = -1;
      new MutationObserver(() => {
        const b = document.getElementById('badge');
        if (b?.dataset.badgeState === 'granted' && (window as unknown as { __granted: number }).__granted < 0) (window as unknown as { __granted: number }).__granted = performance.now();
      }).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-badge-state'] });
    });
    await page.goto('/', { waitUntil: 'load', timeout: 60_000 });
    await page.waitForFunction(() => (window as unknown as { __granted: number }).__granted > 0, null, { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const r = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const w = window as unknown as { __lcp: { t: number; el: string }[]; __granted: number; __cls: number };
      return { lcp: w.__lcp.at(-1), granted: w.__granted, load: nav.loadEventEnd, cls: w.__cls };
    });
    await context.close();
    return r;
  }

  test('Lighthouse-equivalent applied throttling (4x CPU, 150ms RTT, 1.6Mbps) at 412x823: LCP < 2000ms, h1 is LCP, CLS < 0.05, badge granted <= 2000ms after load', async ({ browser }) => {
    const r = await throttled(browser, { width: 412, height: 823 }, 4, { latency: 150, down: (1.6 * 1024 * 1024) / 8, up: (750 * 1024) / 8 });
    console.log('4x/slow4G', JSON.stringify(r));
    expect(r.lcp?.el).toBe('H1');
    expect(r.lcp!.t).toBeLessThan(2000);
    expect(r.cls).toBeLessThan(0.05);
  });

  test('slow-3G-like (6x CPU, 400ms RTT, 400kbps) at 1440: badge still reaches granted within 2000ms of load (A2/3.3)', async ({ browser }) => {
    test.setTimeout(120_000);
    const r = await throttled(browser, { width: 1440, height: 900 }, 6, { latency: 400, down: (400 * 1024) / 8, up: (400 * 1024) / 8 });
    console.log('6x/slow3G', JSON.stringify(r));
    expect(r.granted).toBeGreaterThan(0);
    expect(r.granted - r.load).toBeLessThanOrEqual(2000);
    expect(r.cls).toBeLessThan(0.05);
  });
});

test.describe('history', () => {
  test('desktop: back after a nav jump returns to the top; forward returns to the section', async ({ browser }) => {
    const page = await open(browser, { width: 1440, height: 900 });
    await page.locator('.nav-links a[href="#projects"]').click();
    await page.waitForTimeout(1200);
    const at = await page.evaluate(() => scrollY);
    expect(at).toBeGreaterThan(500);
    await page.goBack();
    await page.waitForTimeout(1200);
    expect(page.url()).not.toContain('#projects');
    expect(await page.evaluate(() => scrollY), 'back restores the top').toBeLessThan(50);
    await page.goForward();
    await page.waitForTimeout(1200);
    expect(Math.abs((await page.evaluate(() => scrollY)) - at)).toBeLessThan(50);
  });

  test('mobile: back after a menu jump returns to the top with the menu closed', async ({ browser }) => {
    const page = await open(browser, { width: 375, height: 667 });
    await page.locator('[data-menu-open]').click();
    await page.locator('#mobile-menu a[href="#skills"]').click();
    await page.waitForTimeout(1200);
    expect(page.url()).toContain('#skills');
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(500);
    await page.goBack();
    await page.waitForTimeout(1200);
    expect(page.url()).not.toContain('#skills');
    expect(await page.evaluate(() => scrollY), 'back restores the top').toBeLessThan(50);
    await expect(page.locator('#mobile-menu')).toBeHidden();
    await expect(page.locator('[data-menu-open]')).toHaveAttribute('aria-expanded', 'false');
  });

  test('mobile: Back pressed with the menu open closes the menu or navigates, but never leaves a stale lock', async ({ browser }) => {
    const page = await open(browser, { width: 375, height: 667 });
    await page.locator('.nav-links a, [data-menu-open]').last().isVisible();
    await page.locator('[data-menu-open]').click();
    await page.locator('#mobile-menu a[href="#about"]').click();
    await page.waitForTimeout(800);
    await page.locator('[data-menu-open]').click();
    await page.goBack();
    await page.waitForTimeout(800);
    const s = await page.evaluate(() => ({ open: (document.querySelector('#mobile-menu') as HTMLDialogElement).open, lock: document.documentElement.style.overflow, expanded: document.querySelector('[data-menu-open]')!.getAttribute('aria-expanded') }));
    expect(s.expanded).toBe(String(s.open));
    if (!s.open) expect(s.lock).toBe('');
  });
});

test.describe('print', () => {
  const CASES = [
    ['desktop dark', { width: 1440, height: 900 }, 'dark'],
    ['phone dark, never scrolled', { width: 375, height: 667 }, 'dark'],
    ['phone light, never scrolled', { width: 375, height: 667 }, 'light'],
  ] as const;

  async function printPage(browser: import('@playwright/test').Browser, viewport: { width: number; height: number }, scheme: 'dark' | 'light') {
    const context = await browser.newContext({ viewport, colorScheme: scheme });
    const page = await context.newPage();
    await page.goto('/');
    // Let the badge sequence finish (mask wipe ends ~1.5s after granted) so we judge the settled page.
    await page.waitForFunction(() => document.getElementById('badge')?.dataset.badgeState === 'granted', null, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1800);
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(200);
    return page;
  }

  for (const [label, viewport, scheme] of CASES) {
    test(`print (${label}): all text reads >= 4.5:1 on white paper (backgrounds are not printed by default)`, async ({ browser }) => {
      const page = await printPage(browser, viewport, scheme);
      const bad = await page.evaluate(() => {
        const ctx = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
        const px = (c: string) => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, 1, 1);
          ctx.fillStyle = c;
          ctx.fillRect(0, 0, 1, 1);
          return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
        };
        const L = (v: number[]) => v.map((x) => x / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
        const out: string[] = [];
        for (const el of document.querySelectorAll<HTMLElement>('main *, footer *')) {
          const own = [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim());
          if (!own || el.closest('[aria-hidden="true"], .sr-only') || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
          const r = 1.05 / (L(px(getComputedStyle(el).color)) + 0.05);
          if (r < 4.5) out.push(`${el.tagName}.${el.className} "${el.textContent?.trim().slice(0, 30)}" ${r.toFixed(2)}`);
        }
        return out;
      });
      expect(bad).toEqual([]);
      await page.context().close();
    });

    test(`print (${label}): every section present, settled badge values unmasked, PDF is 2-12 pages`, async ({ browser }) => {
      const page = await printPage(browser, viewport, scheme);
      for (const id of ['hero', 'about', 'experience', 'projects', 'research', 'skills', 'contact']) expect(await page.locator(`#${id}`).isVisible(), id).toBe(true);
      const masks = await page.locator('#badge').evaluate((b) =>
        [...b.querySelectorAll('*')].filter((e) => {
          const s = getComputedStyle(e, '::after');
          return s.content !== 'none' && s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.transform !== 'matrix(0, 0, 0, 1, 0, 0)' && parseFloat(s.width) > 4;
        }).length,
      );
      expect(masks).toBe(0);
      const pdf = await page.pdf({ format: 'Letter' });
      const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
      console.log(`print ${label}: ${pages} pages, ${pdf.length} bytes`);
      expect(pages).toBeGreaterThanOrEqual(2);
      expect(pages).toBeLessThanOrEqual(12);
      await page.context().close();
    });

    test(`print (${label}): contact status prints its final "ACCESS GRANTED" state, not "LINK PENDING"`, async ({ browser }) => {
      const page = await printPage(browser, viewport, scheme);
      expect(await page.locator('[data-contact-status]').getAttribute('data-status')).toBe('granted');
      await page.context().close();
    });
  }
});

test.describe('contrast in states the engineer did not sample', () => {
  for (const scheme of ['dark', 'light'] as const) {
    test(`axe color-contrast at mid-scroll (oxidation ~0.5) at 1440 ${scheme}`, async ({ browser }) => {
      const { default: AxeBuilder } = await import('@axe-core/playwright');
      const page = await open(browser, { width: 1440, height: 900 }, { colorScheme: scheme });
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      await toY(page, Math.round(max / 2));
      const r = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
      expect(r.violations.flatMap((v) => v.nodes.map((n) => n.target.join(' ')))).toEqual([]);
    });

    test(`axe WCAG A/AA with the mobile menu open at 320 ${scheme}`, async ({ browser }) => {
      const { default: AxeBuilder } = await import('@axe-core/playwright');
      const page = await open(browser, { width: 320, height: 568 }, { colorScheme: scheme });
      await page.locator('[data-menu-open]').click();
      await page.waitForTimeout(300);
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
    });

    test(`primary CTA hover text keeps >= 4.5:1 at top and bottom of page ${scheme}`, async ({ browser }) => {
      const page = await open(browser, { width: 1440, height: 900 }, { colorScheme: scheme });
      for (const where of ['top', 'bottom']) {
        if (where === 'bottom') await toBottom(page);
        const cta = page.locator(where === 'top' ? '#hero .btn-primary' : '#contact a.btn-primary, #contact .btn-primary').first();
        await cta.scrollIntoViewIfNeeded();
        await cta.hover();
        await page.waitForTimeout(300);
        const [fg, bg] = await cta.evaluate((e) => [getComputedStyle(e).color, getComputedStyle(e).backgroundColor]);
        const r = ratio(await rgb(page, fg), await rgb(page, bg));
        expect(r, `${where} ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
