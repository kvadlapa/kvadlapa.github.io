import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';
import { open, toBottom, toY } from './util.ts';

// Re-verification round 1: probes for regressions the defect fixes could cause.

const V = [
  [320, 568], [375, 667], [414, 896], [768, 1024], [1024, 768], [1280, 720], [1440, 900], [1920, 1080], [2560, 1440], [3840, 2160], [844, 390],
].map(([width, height]) => ({ width, height }));
const label = (v: { width: number; height: number }) => `${v.width}x${v.height}`;

const state = (page: Page) =>
  page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    pressed: document.querySelector('[data-theme-toggle]')!.getAttribute('aria-pressed'),
    stored: localStorage.getItem('theme'),
  }));

test.describe('toggle click forwarding from <html>', () => {
  test('during a flip, clicks just outside the button and elsewhere on the page do not toggle', async ({ browser }) => {
    const page = await open(browser, { width: 1440, height: 900 }, { colorScheme: 'dark' });
    const b = (await page.locator('[data-theme-toggle]').boundingBox())!;
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(60);
    for (const [x, y] of [[b.x + b.width + 2, b.y + b.height / 2], [b.x - 2, b.y + b.height / 2], [b.x + b.width / 2, b.y + b.height + 2], [720, 450], [20, 880]]) {
      await page.mouse.click(x, y);
      await page.waitForTimeout(30);
    }
    await page.waitForTimeout(1200);
    expect(await state(page)).toEqual({ theme: 'light', pressed: 'true', stored: 'light' });
  });

  test('a click on the button during a flip counts exactly once', async ({ browser }) => {
    const page = await open(browser, { width: 1440, height: 900 }, { colorScheme: 'dark' });
    const b = (await page.locator('[data-theme-toggle]').boundingBox())!;
    for (let i = 0; i < 3; i++) {
      await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(1200);
    expect(await state(page)).toEqual({ theme: 'light', pressed: 'true', stored: 'light' });
  });

  test('outside a flip, a click event targeted at <html> over the button box does not toggle', async ({ browser }) => {
    const page = await open(browser, { width: 1440, height: 900 }, { colorScheme: 'dark' });
    const b = (await page.locator('[data-theme-toggle]').boundingBox())!;
    await page.evaluate(({ x, y }) => document.documentElement.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y })), { x: b.x + b.width / 2, y: b.y + b.height / 2 });
    await page.waitForTimeout(800);
    expect(await state(page)).toEqual({ theme: 'dark', pressed: 'false', stored: null });
  });

  test('reduced motion: rapid clicks still land on the parity-correct theme', async ({ browser }) => {
    const page = await open(browser, { width: 1440, height: 900 }, { colorScheme: 'dark', reducedMotion: 'reduce' });
    const b = (await page.locator('[data-theme-toggle]').boundingBox())!;
    for (let i = 0; i < 4; i++) await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await page.waitForTimeout(300);
    expect(await state(page)).toEqual({ theme: 'dark', pressed: 'false', stored: 'dark' });
  });
});

test.describe('Back/Forward after nav clicks and manual scrolling', () => {
  for (const vp of [{ width: 1440, height: 900 }, { width: 375, height: 667 }]) {
    const go = async (page: Page, id: string) => {
      if (vp.width < 768) {
        await page.locator('[data-menu-open]').click();
        await page.locator(`#mobile-menu a[href="#${id}"]`).click();
      } else await page.locator(`.nav-links a[href="#${id}"]`).click();
      await page.waitForTimeout(1300);
    };
    const wheel = async (page: Page, dy: number) => {
      await page.mouse.move(vp.width / 2, vp.height / 2);
      await page.mouse.wheel(0, dy);
      await page.waitForTimeout(800);
    };
    const y = (page: Page) => page.evaluate(() => Math.round(scrollY));

    test(`${vp.width}: manual scroll, nav jump, Back returns to the manual position; Forward returns to the section`, async ({ browser }) => {
      const page = await open(browser, vp);
      await wheel(page, 1200);
      const before = await y(page);
      await go(page, 'projects');
      const at = await y(page);
      await page.goBack();
      await page.waitForTimeout(1200);
      expect(Math.abs((await y(page)) - before), `back to ${before}`).toBeLessThanOrEqual(2);
      await page.goForward();
      await page.waitForTimeout(1200);
      expect(Math.abs((await y(page)) - at), `forward to ${at}`).toBeLessThanOrEqual(2);
    });

    test(`${vp.width}: after reading further inside a section, Back to that section entry restores the reading position (what the fix's comment promises)`, async ({ browser }) => {
      const page = await open(browser, vp);
      await go(page, 'projects');
      await wheel(page, 900);
      const reading = await y(page);
      await go(page, 'skills');
      await page.goBack();
      await page.waitForTimeout(1500);
      expect(page.url()).toContain('#projects');
      expect(Math.abs((await y(page)) - reading), `back to ${reading}`).toBeLessThanOrEqual(2);
    });

    test(`${vp.width}: Back/Forward never leave the menu open or the page scroll-locked`, async ({ browser }) => {
      const page = await open(browser, vp);
      await go(page, 'research');
      await go(page, 'contact');
      await page.goBack();
      await page.waitForTimeout(800);
      await page.goBack();
      await page.waitForTimeout(800);
      await page.goForward();
      await page.waitForTimeout(800);
      const s = await page.evaluate(() => ({ open: (document.querySelector('#mobile-menu') as HTMLDialogElement).open, lock: document.documentElement.style.overflow }));
      expect(s).toEqual({ open: false, lock: '' });
      // The page still scrolls by wheel afterwards.
      const y0 = await y(page);
      await wheel(page, 300);
      expect(await y(page)).not.toBe(y0);
    });
  }
});

/** Paints all own-text in `scope` pure magenta and counts magenta pixels with and without the given layers. */
export async function textCoveredBy(page: Page, scope: string, layers: string): Promise<string[]> {
  const els = await page.evaluate((scope) => {
    document.querySelectorAll('[data-mag]').forEach((e) => e.removeAttribute('data-mag'));
    const out: { i: number; name: string; x: number; y: number; w: number; h: number }[] = [];
    let i = 0;
    for (const el of document.querySelectorAll<HTMLElement>(`${scope} *`)) {
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim());
      if (!own || el.closest('[aria-hidden="true"], .sr-only') || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const r = document.createRange();
      r.selectNodeContents(el);
      const b = r.getBoundingClientRect();
      if (b.width < 2 || b.height < 2 || b.bottom <= 0 || b.top >= innerHeight || b.right <= 0 || b.left >= innerWidth) continue;
      el.setAttribute('data-mag', String(i));
      out.push({ i: i++, name: `${el.tagName}.${el.className} "${(el.textContent ?? '').trim().slice(0, 24)}"`, x: b.left, y: b.top, w: b.width, h: b.height });
    }
    return out;
  }, scope);
  const style = await page.addStyleTag({ content: '[data-mag]{color:#ff00ff!important;-webkit-text-fill-color:#ff00ff!important;text-shadow:none!important}' });
  await page.waitForTimeout(50);
  const vp = page.viewportSize()!;
  const count = async () => {
    const { data, info } = await sharp(await page.screenshot({ animations: 'disabled' })).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    return els.map((e) => {
      let n = 0;
      const x0 = Math.max(0, Math.floor(e.x)), x1 = Math.min(vp.width, Math.ceil(e.x + e.w));
      const y0 = Math.max(0, Math.floor(e.y)), y1 = Math.min(vp.height, Math.ceil(e.y + e.h));
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
          const k = (y * info.width + x) * 3;
          if (data[k] > 235 && data[k + 1] < 25 && data[k + 2] > 235) n++;
        }
      return n;
    });
  };
  const withLayers = await count();
  const hide = await page.addStyleTag({ content: `${layers}{visibility:hidden!important}` });
  await page.waitForTimeout(50);
  const without = await count();
  await hide.evaluate((n) => (n as Element).remove());
  await style.evaluate((n) => (n as Element).remove());
  return els.filter((e, k) => without[k] > 0 && withLayers[k] < without[k] * 0.98).map((e, k) => `${e.name} ${withLayers[els.indexOf(e)]}/${without[els.indexOf(e)]} magenta px`);
}

const DECOR = '.hero-board, .board-layer, svg[data-trace], .socket-art, [data-slot="hero"], .margin-trace';

test.describe('hero stacking order', () => {
  for (const theme of ['dark', 'light'] as const) {
    for (const vp of V) {
      test(`${label(vp)} ${theme}: no grid, trace or art paints over hero text`, async ({ browser }) => {
        const page = await open(browser, vp, { colorScheme: theme, reducedMotion: 'reduce' });
        expect(await textCoveredBy(page, '#hero', DECOR)).toEqual([]);
      });
    }
  }

  for (const vp of V) {
    test(`${label(vp)}: every hero and nav control is the topmost hit target at its centre`, async ({ browser }) => {
      const page = await open(browser, vp, { reducedMotion: 'reduce' });
      const blocked = await page.evaluate(() => {
        const out: string[] = [];
        for (const el of document.querySelectorAll<HTMLElement>('#hero a, #hero button, .site-header a, .site-header button')) {
          if (!el.checkVisibility()) continue;
          const b = el.getBoundingClientRect();
          if (b.width === 0 || b.bottom <= 0 || b.top >= innerHeight) continue;
          for (const [fx, fy] of [[0.5, 0.5], [0.15, 0.5], [0.85, 0.5]]) {
            const hit = document.elementFromPoint(b.left + b.width * fx, b.top + b.height * fy);
            if (!hit || !(hit === el || el.contains(hit))) {
              out.push(`${(el.textContent ?? '').trim() || el.getAttribute('aria-label')} at ${fx},${fy} -> ${hit?.tagName}.${hit?.className}`);
              break;
            }
          }
        }
        return out;
      });
      expect(blocked).toEqual([]);
    });
  }

  test('1440: the hero CTAs receive real clicks (trial) before and after the badge finishes', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    for (const name of [/^(Resume|Request resume)$/, /^GitHub$/, /^LinkedIn$/, /^Email$/]) await page.locator('#hero').getByRole('link', { name }).click({ trial: true, timeout: 1000 });
    await page.waitForTimeout(2000);
    for (const name of [/^(Resume|Request resume)$/, /^GitHub$/, /^LinkedIn$/, /^Email$/]) await page.locator('#hero').getByRole('link', { name }).click({ trial: true, timeout: 1000 });
  });
});

/**
 * Paint-based: for each visible text box in `scope`, compares pixels with the trace SVG shown and hidden.
 * Any difference inside a text box means a trace line shows through or over the text.
 */
async function traceVisibleInText(page: Page, scope: string): Promise<string[]> {
  const boxes = await page.evaluate((scope) => {
    const out: { name: string; x: number; y: number; w: number; h: number }[] = [];
    const walker = document.createTreeWalker(document.querySelector(scope)!, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement!;
      if (!(n.textContent ?? '').trim() || el.closest('[aria-hidden="true"], .sr-only, svg') || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const r = document.createRange();
      r.selectNodeContents(n);
      for (const t of r.getClientRects()) {
        if (t.width < 2 || t.bottom <= 0 || t.top >= innerHeight) continue;
        out.push({ name: (n.textContent ?? '').trim().slice(0, 24), x: t.left, y: t.top, w: t.width, h: t.height });
      }
    }
    return out;
  }, scope);
  const vp = page.viewportSize()!;
  const shot = async () => sharp(await page.screenshot({ animations: 'disabled' })).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const a = await shot();
  const hide = await page.addStyleTag({ content: 'svg[data-trace]{visibility:hidden!important}' });
  await page.waitForTimeout(50);
  const b = await shot();
  await hide.evaluate((n) => (n as Element).remove());
  const out: string[] = [];
  for (const t of boxes) {
    let diff = 0;
    const x0 = Math.max(0, Math.ceil(t.x + 1)), x1 = Math.min(vp.width, Math.floor(t.x + t.w - 1));
    const y0 = Math.max(0, Math.ceil(t.y + 1)), y1 = Math.min(vp.height, Math.floor(t.y + t.h - 1));
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const k = (y * a.info.width + x) * 3;
        if (Math.abs(a.data[k] - b.data[k]) + Math.abs(a.data[k + 1] - b.data[k + 1]) + Math.abs(a.data[k + 2] - b.data[k + 2]) > 30) diff++;
      }
    if (diff > 0) out.push(`"${t.name}" ${diff}px of trace inside its box at ${Math.round(t.x)},${Math.round(t.y)}`);
  }
  return out;
}

test.describe('contact-label branch never covers text (paint-based)', () => {
  for (const theme of ['dark', 'light'] as const) {
    for (const vp of V) {
      test(`${label(vp)} ${theme}: no trace pixel shows inside any text box in #contact (label, heading, rows)`, async ({ browser }) => {
        const page = await open(browser, vp, { colorScheme: theme, reducedMotion: 'reduce' });
        const present = await page.locator('[data-branch="contact-label"]').count();
        expect(present, vp.width >= 768 ? 'branch exists at >=768' : 'no branches below 768 (AC 5.7)').toBe(vp.width >= 768 ? 1 : 0);
        const hits: string[] = [];
        for (const pos of ['label', 'bottom']) {
          if (pos === 'label') await page.locator('#contact').evaluate((e) => e.scrollIntoView({ block: 'start', behavior: 'instant' }));
          else await toBottom(page);
          await page.waitForTimeout(200);
          hits.push(...(await traceVisibleInText(page, '#contact')));
        }
        expect(hits).toEqual([]);
      });
    }
  }

  for (const vp of V) {
    test(`${label(vp)} dark: wider sweep, no trace line shows inside any text box anywhere in main`, async ({ browser }) => {
      test.setTimeout(120_000);
      const page = await open(browser, vp, { reducedMotion: 'reduce' });
      const hits: string[] = [];
      for (const id of ['hero', 'about', 'experience', 'projects', 'research', 'skills', 'contact']) {
        await page.locator(`#${id}`).evaluate((e) => e.scrollIntoView({ block: 'start', behavior: 'instant' }));
        await page.waitForTimeout(150);
        hits.push(...(await traceVisibleInText(page, 'main')).map((h) => `${id}: ${h}`));
      }
      expect([...new Set(hits)]).toEqual([]);
    });
  }
});

test.describe('print in both themes (adds desktop light, not covered by adversarial.ind.ts)', () => {
  test('desktop light: all text >= 4.5:1 on white, primary buttons legible, contact prints granted, 2-12 pages', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForTimeout(2500);
    await page.emulateMedia({ media: 'print' });
    // .btn has a colour transition; a real print renders final styles, so let emulation settle.
    await page.waitForTimeout(600);
    const bad = await page.evaluate(() => {
      const ctx = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
      const px = (c: string) => {
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
        if (r < 4.5) out.push(`${el.tagName}.${el.className} ${r.toFixed(2)}`);
      }
      return out;
    });
    expect(bad).toEqual([]);
    const contact = await page.locator('[data-contact-status]').evaluate((e) => ({
      pending: getComputedStyle(e.querySelector('.cs-pending')!).visibility,
      granted: getComputedStyle(e.querySelector('.cs-granted')!).visibility,
    }));
    expect(contact).toEqual({ pending: 'hidden', granted: 'visible' });
    const pdf = await page.pdf({ format: 'Letter' });
    const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    expect(pages).toBeGreaterThanOrEqual(2);
    expect(pages).toBeLessThanOrEqual(12);
    await context.close();
  });

  for (const theme of ['dark', 'light'] as const) {
    test(`${theme}: printing does not change the screen afterwards (status reverts or stays sensible, no layout left in print mode)`, async ({ browser }) => {
      const page = await open(browser, { width: 1440, height: 900 }, { colorScheme: theme });
      await page.emulateMedia({ media: 'print' });
      await page.waitForTimeout(100);
      await page.emulateMedia({ media: 'screen' });
      await page.waitForTimeout(200);
      // After printing, the screen must still be a working page: header shown, trace shown, theme intact.
      const s = await page.evaluate(() => ({
        header: getComputedStyle(document.querySelector('.site-header')!).display,
        trace: getComputedStyle(document.querySelector('svg[data-trace]')!).display,
        theme: document.documentElement.dataset.theme,
      }));
      expect(s).toEqual({ header: expect.not.stringMatching(/^none$/), trace: expect.not.stringMatching(/^none$/), theme });
    });
  }
});

test.describe('container-query layouts at every viewport', () => {
  for (const vp of V) {
    test(`${label(vp)}: every card's content stays inside its card, nothing overflows sideways`, async ({ browser }) => {
      const page = await open(browser, vp);
      const problems: string[] = [];
      for (const where of ['experience', 'projects', 'research', 'skills']) {
        await page.locator(`#${where}`).evaluate((e) => e.scrollIntoView({ block: 'start', behavior: 'instant' }));
        await page.waitForTimeout(100);
        problems.push(
          ...(await page.evaluate((where) => {
            const out: string[] = [];
            const cards = document.querySelectorAll<HTMLElement>(`#${where} [data-component], #${where} [data-project-card], #${where} [data-research-card], #${where} [data-group]`);
            if (!cards.length) out.push(`no cards in #${where}`);
            for (const card of cards) {
              const c = card.getBoundingClientRect();
              const name = card.getAttribute('data-component') ?? card.getAttribute('data-group') ?? card.querySelector('h3')?.textContent?.trim().slice(0, 20);
              if (card.scrollWidth > card.clientWidth + 1 && getComputedStyle(card).overflowX !== 'visible') out.push(`${name}: internal overflow ${card.scrollWidth}>${card.clientWidth}`);
              for (const el of card.querySelectorAll<HTMLElement>('*')) {
                if (el.closest('[aria-hidden="true"], .sr-only') || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
                // Own text nodes only, so a visually hidden child cannot widen the measured box.
                const rects = [...el.childNodes]
                  .filter((n) => n.nodeType === 3 && (n.textContent ?? '').trim())
                  .flatMap((n) => {
                    const r = document.createRange();
                    r.selectNodeContents(n);
                    return [...r.getClientRects()];
                  });
                for (const t of rects) {
                  if (t.width && (t.left < c.left - 1 || t.right > c.right + 1)) {
                    out.push(`${name}: "${(el.textContent ?? '').trim().slice(0, 20)}" ${Math.round(t.left)}-${Math.round(t.right)} outside card ${Math.round(c.left)}-${Math.round(c.right)}`);
                    break;
                  }
                }
              }
            }
            return out;
          }, where)),
        );
      }
      expect(problems).toEqual([]);
    });
  }
});

/** Text nodes whose characters are crushed into a narrow column (fewer than 4 characters per rendered line). */
function squeezedText(page: Page, scope: string): Promise<string[]> {
  return page.evaluate((scope) => {
    const out: string[] = [];
    const walker = document.createTreeWalker(document.querySelector(scope)!, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = (n.textContent ?? '').trim();
      const el = n.parentElement!;
      if (text.length < 8 || el.closest('[aria-hidden="true"], .sr-only') || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const r = document.createRange();
      r.selectNodeContents(n);
      const lines = new Set([...r.getClientRects()].filter((t) => t.width > 0).map((t) => Math.round(t.top))).size;
      if (lines > 1 && text.length / lines < 4) out.push(`"${text.slice(0, 30)}" ${text.length} chars on ${lines} lines`);
    }
    return out;
  }, scope);
}

test.describe('no text crushed into a one-character column', () => {
  for (const theme of ['dark', 'light'] as const) {
    for (const [paper, width] of [['Letter', 816], ['A4', 794]] as const) {
      test(`print ${paper} (${width}px) ${theme}: every text node keeps >= 4 characters per line`, async ({ browser }) => {
        const page = await open(browser, { width, height: 1056 }, { colorScheme: theme });
        await page.waitForTimeout(1600);
        await page.emulateMedia({ media: 'print' });
        await page.waitForTimeout(600);
        expect(await squeezedText(page, 'body')).toEqual([]);
      });
    }
  }

  for (const vp of V) {
    test(`screen ${label(vp)}: every text node keeps >= 4 characters per line`, async ({ browser }) => {
      const page = await open(browser, vp);
      expect(await squeezedText(page, 'body')).toEqual([]);
    });
  }
});
