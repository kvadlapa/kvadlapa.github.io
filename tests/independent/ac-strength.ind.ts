import AxeBuilder from '@axe-core/playwright';
import sharp from 'sharp';
import { expect, test, type Page } from '@playwright/test';
import { clippedText, mainPathPoints, open, pageBox, rgb, svgOrigin, toBottom, toY } from './util.ts';

const V = [
  [320, 568], [375, 667], [414, 896], [768, 1024], [1024, 768], [1280, 720], [1440, 900], [1920, 1080], [2560, 1440], [3840, 2160], [844, 390],
].map(([width, height]) => ({ width, height }));
const THEMES = ['dark', 'light'] as const;
const STATUS = { dark: [0x3d, 0xdc, 0x97], light: [0x08, 0x74, 0x43] };
const COPPER = { dark: [0xc4, 0x7a, 0x4a], light: [0x8e, 0x4e, 0x26] };
const PATINA = { dark: [0x5f, 0xa3, 0x9a], light: [0x1e, 0x66, 0x70] };
const near = (a: number[], b: number[], tol = 1) => a.every((v, i) => Math.abs(v - b[i]) <= tol);

/** AC 1.9 including ::before/::after, which the engineer's scan skips. */
function greenOutsideStatus(page: Page, status: number[]): Promise<string[]> {
  return page.evaluate((status) => {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
    const hex = (c: string) => {
      if (!c || c === 'none' || c.startsWith('url')) return null;
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return d[3] === 0 ? null : [d[0], d[1], d[2]];
    };
    const isStatus = (c: number[] | null) => !!c && c.every((v, i) => Math.abs(v - status[i]) <= 1);
    const bad: string[] = [];
    for (const el of document.querySelectorAll('body *')) {
      const allowed = el.closest('[data-status="active"], [data-status="granted"]');
      for (const pseudo of [null, '::before', '::after'] as const) {
        const s = getComputedStyle(el, pseudo);
        if (pseudo && s.content === 'none') continue;
        if ([s.color, s.backgroundColor, s.fill].some((c) => isStatus(hex(c))) && !allowed) bad.push(`${el.tagName}.${(el.getAttribute('class') ?? '').split(' ')[0]}${pseudo ?? ''}`);
      }
    }
    return bad;
  }, status);
}

test.describe('AC 1.9 status green, stricter', () => {
  for (const theme of THEMES) {
    test(`status green never paints outside active/granted, incl. pseudo-elements, mid-badge-sequence and mid-scroll (${theme})`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme });
      const page = await context.newPage();
      await page.goto('/');
      await page.waitForFunction(() => document.getElementById('badge')?.dataset.badgeState === 'verifying', null, { timeout: 3000 }).catch(() => {});
      const during = await greenOutsideStatus(page, STATUS[theme]);
      await page.waitForTimeout(1500);
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      await toY(page, Math.round(max / 2));
      const mid = await greenOutsideStatus(page, STATUS[theme]);
      await toBottom(page);
      await page.waitForTimeout(600);
      const bottom = await greenOutsideStatus(page, STATUS[theme]);
      expect({ during, mid, bottom }).toEqual({ during: [], mid: [], bottom: [] });
    });
  }
});

test.describe('AC 1.12 labels are DM Mono (beyond the .silk class the engineer chose)', () => {
  test('section labels, designators, bank labels, tags, badge keys and dates use DM Mono', async ({ browser }) => {
    const page = await open(browser, { width: 1440, height: 900 });
    const wrong = await page.evaluate(() => {
      const want = /^\/(about|experience|projects|research|skills|contact|whoami)$|^(U\d|TP\d|Q\d|J1|DNP|EDU)$|^BANK [A-F] · |^(role|stack|location|CREDENTIAL)$/;
      const out: string[] = [];
      let seen = 0;
      for (const el of document.querySelectorAll<HTMLElement>('main *')) {
        const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent?.trim()).join('');
        if (!own || !want.test((el.innerText ?? '').trim())) continue;
        seen++;
        if (!/^"?DM Mono/.test(getComputedStyle(el).fontFamily)) out.push(`${(el.innerText ?? '').trim()}: ${getComputedStyle(el).fontFamily.slice(0, 30)}`);
      }
      return { out, seen };
    });
    expect(wrong.seen).toBeGreaterThan(20);
    expect(wrong.out).toEqual([]);
  });
});

test.describe('AC 1.13 measure, computed (engineer only grepped the source)', () => {
  test('summary, story, bullets and research descriptions render no wider than 68ch of their own font', async ({ browser }) => {
    const page = await open(browser, { width: 3840, height: 2160 });
    const wide = await page.evaluate(() => {
      const out: string[] = [];
      const els = document.querySelectorAll<HTMLElement>('#about p:not(.cert), [data-story], #experience li, #research p, #contact p');
      for (const el of els) {
        if (!(el.innerText ?? '').trim() || (el.innerText ?? '').length < 80) continue;
        const probe = document.createElement('span');
        probe.textContent = '0'.repeat(68);
        probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;letter-spacing:inherit';
        el.append(probe);
        const ch68 = probe.getBoundingClientRect().width;
        probe.remove();
        const w = el.getBoundingClientRect().width;
        if (w > ch68 + 1) out.push(`${el.tagName}.${el.className} ${Math.round(w)}px > 68ch ${Math.round(ch68)}px: "${el.innerText.slice(0, 30)}"`);
      }
      return { out, n: els.length };
    });
    expect(wide.n).toBeGreaterThan(5);
    expect(wide.out).toEqual([]);
  });
});

test.describe('AC 3.6 / 3.7 trace at every width >= 768 and in light mode', () => {
  for (const vp of [{ width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1920, height: 1080 }, { width: 3840, height: 2160 }, { width: 844, height: 390 }]) {
    test(`trace starts in #hero, ends in the contact panel, six section branches at ${vp.width}x${vp.height}`, async ({ browser }) => {
      const page = await open(browser, vp);
      await expect(page.locator('svg[data-trace]')).toHaveCount(1);
      const pts = await mainPathPoints(page);
      expect(pts.some((p) => Number.isNaN(p.x))).toBe(false);
      const o = await svgOrigin(page);
      const start = { x: pts[0].x + o.x, y: pts[0].y + o.y };
      const end = { x: pts.at(-1)!.x + o.x, y: pts.at(-1)!.y + o.y };
      const hero = await pageBox(page, '#hero');
      const panel = await pageBox(page, '[data-contact-panel]');
      expect(start.x >= hero.left && start.x <= hero.right && start.y >= hero.top && start.y <= hero.bottom, `start ${JSON.stringify(start)} in hero ${JSON.stringify(hero)}`).toBe(true);
      expect(end.x >= panel.left && end.x <= panel.right && end.y >= panel.top && end.y <= panel.bottom, `end ${JSON.stringify(end)} in panel ${JSON.stringify(panel)}`).toBe(true);
      const names = await page.locator('[data-branch]').evaluateAll((e) => e.map((x) => x.getAttribute('data-branch')));
      for (const n of ['about', 'experience', 'projects', 'research', 'skills', 'contact']) expect(names).toContain(n);
      // Every point of the main path lies inside the viewport horizontally (no off-board routing).
      for (const p of pts) expect(p.x + o.x).toBeGreaterThanOrEqual(0);
      for (const p of pts) expect(p.x + o.x).toBeLessThanOrEqual(vp.width);
    });
  }

  for (const [vp, theme] of [[{ width: 375, height: 667 }, 'dark'], [{ width: 768, height: 1024 }, 'light'], [{ width: 1440, height: 900 }, 'light']] as const) {
    test(`dashoffset strictly decreases over 5 samples and ends <= 1; stroke copper -> patina (${vp.width} ${theme})`, async ({ browser }) => {
      const page = await open(browser, vp, { colorScheme: theme });
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      const offs: number[] = [];
      for (let i = 0; i < 5; i++) {
        await toY(page, Math.round((max * i) / 4));
        offs.push(await page.locator('[data-trace-main]').evaluate((e) => parseFloat(getComputedStyle(e).strokeDashoffset)));
      }
      for (let i = 1; i < 5; i++) expect(offs[i], `sample ${i} ${offs.join(',')}`).toBeLessThan(offs[i - 1]);
      expect(offs[4]).toBeLessThanOrEqual(1);
      const stops = await page.locator('#trace-grad stop').evaluateAll((s) => s.map((e) => getComputedStyle(e).stopColor));
      expect(near(await rgb(page, stops[0]), COPPER[theme]), `first stop ${stops[0]}`).toBe(true);
      expect(near(await rgb(page, stops.at(-1)!), PATINA[theme]), `last stop ${stops.at(-1)}`).toBe(true);
    });
  }
});

test.describe('AC 3.9 keyboard focus gives the full powered state', () => {
  test('focus via Tab sets data-powered, a box-shadow and a changed branch stroke at 1440', async ({ browser }) => {
    const page = await open(browser, { width: 1440, height: 900 });
    const card = page.locator('[data-component="U1"]');
    const branch = page.locator('[data-branch="component-U1"]');
    const before = await branch.evaluate((e) => `${getComputedStyle(e).stroke} ${getComputedStyle(e).strokeWidth}`);
    await page.locator('[data-component="TP1"]').focus();
    await page.keyboard.press('Tab');
    await expect(card).toBeFocused();
    await page.waitForTimeout(350);
    await expect(card).toHaveAttribute('data-powered', '');
    expect(await card.evaluate((e) => getComputedStyle(e).boxShadow)).not.toBe('none');
    expect(await branch.evaluate((e) => `${getComputedStyle(e).stroke} ${getComputedStyle(e).strokeWidth}`)).not.toBe(before);
    await page.keyboard.press('Tab');
    await expect(card).not.toHaveAttribute('data-powered');
  });
});

test.describe('AC 3.10 one infinite animation on the whole page', () => {
  for (const where of ['top', 'bottom']) {
    test(`only U3's LED animates indefinitely; badge and contact LEDs are static after settling (${where})`, async ({ browser }) => {
      const page = await open(browser, { width: 1440, height: 900 });
      await page.waitForTimeout(1800);
      if (where === 'bottom') {
        await toBottom(page);
        await page.waitForTimeout(1500);
      }
      const running = await page.evaluate(() =>
        document
          .getAnimations()
          .filter((a) => a.playState === 'running')
          .map((a) => {
            const t = (a.effect as KeyframeEffect).target as Element;
            return {
              where: t.closest('[data-component]')?.getAttribute('data-component') ?? t.closest('section')?.id ?? t.tagName,
              infinite: a.effect?.getComputedTiming().iterations === Infinity,
              led: t.hasAttribute('data-led'),
            };
          }),
      );
      expect(running).toEqual([{ where: 'U3', infinite: true, led: true }]);
    });
  }
});

test.describe('AC 3.1 nav targets on mobile (engineer only tested 1440)', () => {
  test('each menu link at 375 lands its h2 below the nav and inside the viewport', async ({ browser }) => {
    const page = await open(browser, { width: 375, height: 667 });
    for (const id of ['about', 'experience', 'projects', 'research', 'skills', 'contact']) {
      await toY(page, 0);
      await page.locator('[data-menu-open]').click();
      await page.locator(`#mobile-menu a[href="#${id}"]`).click();
      await page.waitForTimeout(1200);
      const nav = await page.locator('.site-header').evaluate((e) => e.getBoundingClientRect().bottom);
      const h = await page.locator(`#${id} h2`).evaluate((e) => ({ top: e.getBoundingClientRect().top, bottom: e.getBoundingClientRect().bottom }));
      expect(h.top, id).toBeGreaterThanOrEqual(nav);
      expect(h.bottom, id).toBeLessThanOrEqual(667);
    }
  });
});

test.describe('AC 5.1 stricter: nothing clipped by overflow-x:clip', () => {
  for (const theme of THEMES) {
    for (const vp of V) {
      test(`no text box crosses the viewport edge at ${vp.width}x${vp.height} ${theme} (top and bottom)`, async ({ browser }) => {
        const page = await open(browser, vp, { colorScheme: theme });
        const top = await clippedText(page);
        await toBottom(page);
        const bottom = await clippedText(page);
        expect({ top, bottom }).toEqual({ top: [], bottom: [] });
      });
    }
  }
});

test.describe('AC 5.8 at the narrowest and the landscape phone', () => {
  for (const vp of [{ width: 320, height: 568 }, { width: 844, height: 390 }]) {
    test(`every visible a/button/[tabindex=0] is >= 44x44 at ${vp.width}x${vp.height}`, async ({ browser }) => {
      const page = await open(browser, vp, { hasTouch: true, isMobile: true });
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
});

test.describe('AC 6.5 axe at widths and positions the engineer skipped', () => {
  for (const theme of THEMES) {
    for (const vp of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 768, height: 1024 }]) {
      test(`axe WCAG A/AA at ${vp.width}x${vp.height} ${theme}, top and bottom`, async ({ browser }) => {
        const page = await open(browser, vp, { colorScheme: theme });
        const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
        const fmt = (r: Awaited<ReturnType<AxeBuilder['analyze']>>) => r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
        const top = fmt(await new AxeBuilder({ page }).withTags(tags).analyze());
        await toBottom(page);
        await page.waitForTimeout(500);
        const bottom = fmt(await new AxeBuilder({ page }).withTags(tags).analyze());
        expect({ top, bottom }).toEqual({ top: [], bottom: [] });
      });
    }
  }
});

test.describe('AC 6.8 focus ring is actually painted (pixel check, not just computed style)', () => {
  test('every Tab stop at 1440 changes pixels in a ring around its box', async ({ browser }) => {
    test.setTimeout(240_000);
    const page = await open(browser, { width: 1440, height: 900 }, { reducedMotion: 'reduce' });
    const invisible: string[] = [];
    let count = 0;
    for (let i = 0; i < 80; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(80);
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        if (!el || el === document.body) return null;
        const b = el.getBoundingClientRect();
        el.setAttribute('data-ring-probe', '');
        return { name: `${el.tagName}.${(el.className || '').toString().split(' ')[0]} "${(el.textContent ?? '').trim().slice(0, 20)}"`, x: b.left, y: b.top, w: b.width, h: b.height };
      });
      if (!info) break;
      if (count && info.name.startsWith('A.skip-link')) break;
      count++;
      const pad = 6;
      const left = Math.max(0, Math.floor(info.x - pad));
      const top = Math.max(0, Math.floor(info.y - pad));
      const region = { left, top, width: Math.min(1440 - left, Math.ceil(info.w + 2 * pad)), height: Math.min(900 - top, Math.ceil(info.h + 2 * pad)) };
      if (region.width < 2 || region.height < 2) continue;
      // Full-viewport screenshots cropped locally, so clip-coordinate semantics cannot skew the result.
      const crop = async () => sharp(await page.screenshot()).extract(region).raw().toBuffer();
      const focused = await crop();
      await page.evaluate(() => {
        const el = document.querySelector('[data-ring-probe]') as HTMLElement;
        el.style.setProperty('outline', 'none', 'important');
      });
      const plain = await crop();
      await page.evaluate(() => {
        const el = document.querySelector('[data-ring-probe]') as HTMLElement;
        el.style.removeProperty('outline');
        el.removeAttribute('data-ring-probe');
      });
      let changed = 0;
      for (let k = 0; k < focused.length; k++) if (Math.abs(focused[k] - plain[k]) > 40) changed++;
      // A 2px ring around the box changes at least ~2 * perimeter channel values.
      if (changed < Math.min(info.w, 1440) * 2) invisible.push(`${info.name} (${changed} changed)`);
    }
    expect(count).toBeGreaterThan(20);
    expect(invisible).toEqual([]);
  });
});

test.describe('AC 6.9 reduced motion holds after interaction', () => {
  test('after scrolling, hovering and tapping, nothing animates and the trace stays fully drawn (1440)', async ({ browser }) => {
    const page = await open(browser, { width: 1440, height: 900 }, { reducedMotion: 'reduce' });
    await page.locator('[data-component="U2"]').hover();
    await toY(page, 2500);
    await page.locator('[data-project-card]').first().hover();
    await page.mouse.move(400, 400);
    await toBottom(page);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length)).toBe(0);
    expect(await page.locator('[data-trace-main]').evaluate((e) => parseFloat(getComputedStyle(e).strokeDashoffset))).toBe(0);
    for (const led of await page.locator('[data-led]').all()) expect(await led.evaluate((e) => getComputedStyle(e, '::after').animationName)).toBe('none');
  });

  test('at 375 the off-screen badge is already granted under reduced motion', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 375, height: 667 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#badge')).toHaveAttribute('data-badge-state', 'granted');
    await expect(page.locator('[data-contact-status]')).toHaveAttribute('data-status', 'granted');
  });
});

test.describe('AC 6.6 / 6.7 on mobile', () => {
  test('at 375: one h1, no level skips, skip link first and moves focus to main', async ({ browser }) => {
    const page = await open(browser, { width: 375, height: 667 });
    await expect(page.locator('h1')).toHaveCount(1);
    const levels = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll((e) => e.map((x) => Number(x.tagName[1])));
    for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
    await expect(page.locator('.skip-link')).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
  });
});

test.describe('AC 1.4 group labels', () => {
  test('the six groups carry the brief group names in brief order', async ({ browser }) => {
    const page = await open(browser, { width: 1440, height: 900 });
    const labels = await page.locator('#skills [data-group]').evaluateAll((g) => g.map((x) => x.getAttribute('data-group')));
    expect(labels).toEqual(['Languages', 'Backend', 'Data', 'Reliability & Practices', 'Identity & Security', 'Cloud & DevOps']);
    const visible = await page.locator('#skills [data-group] h3').allTextContents();
    for (const [i, l] of labels.entries()) expect(visible[i].toLowerCase()).toContain(l!.toLowerCase());
  });
});

test.describe('AC 5.3 container queries are used, not just declared', () => {
  for (const name of ['BoardComponent', 'ProjectCard', 'ResearchCard', 'PartGroup']) {
    test(`${name} declares a container and queries it (@container rule or cq units)`, async () => {
      const { readFileSync } = await import('node:fs');
      const src = readFileSync(new URL(`../../src/components/${name}.astro`, import.meta.url), 'utf8');
      expect(src, 'container-type').toMatch(/container-type:\s*inline-size/);
      expect(/@container\b/.test(src) || /\d(cqi|cqw|cqh|cqb|cqmin|cqmax)\b/.test(src), 'uses a container query').toBe(true);
    });
  }
});
