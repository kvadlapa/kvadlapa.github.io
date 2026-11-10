import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import sharp from 'sharp';
import { contrast } from './page.ts';

export interface ContrastReport {
  violations: string[];
  sampled: number;
  failures: string[];
}

/**
 * Runs axe color-contrast. Nodes axe marks "incomplete" (text over an image) are pixel-sampled:
 * the text is made transparent, the content box is screenshotted, and the worst pixel is compared
 * with the text colour (AC 1.11).
 */
export async function checkContrast(page: Page, include?: string): Promise<ContrastReport> {
  let builder = new AxeBuilder({ page }).withRules(['color-contrast']);
  if (include) builder = builder.include(include);
  const results = await builder.analyze();
  const violations = results.violations.flatMap((v) => v.nodes.map((n) => `${n.target.join(' ')}: ${n.failureSummary}`));
  const nodes = results.incomplete.filter((r) => r.id === 'color-contrast').flatMap((r) => r.nodes);

  const failures: string[] = [];
  let sampled = 0;
  const startY = await page.evaluate(() => window.scrollY);
  for (const node of nodes) {
    const selector = node.target[node.target.length - 1] as string;
    const info = await page.evaluate((selector) => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return null;
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      const style = getComputedStyle(el);
      const ctx = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
      ctx.fillStyle = style.color;
      ctx.fillRect(0, 0, 1, 1);
      const fg = [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
      // "Its box" is the box of the text itself: the union of its rendered line boxes.
      const range = document.createRange();
      range.selectNodeContents(el);
      const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
      const px = (v: string) => parseFloat(v) || 0;
      if (rects.length === 0) return null;
      const left = Math.min(...rects.map((r) => r.left));
      const top = Math.min(...rects.map((r) => r.top));
      const clip = {
        x: left,
        y: top,
        width: Math.max(...rects.map((r) => r.right)) - left,
        height: Math.max(...rects.map((r) => r.bottom)) - top,
      };
      el.setAttribute('data-contrast-sample', '');
      return { fg, clip, size: px(style.fontSize), weight: Number(style.fontWeight) };
    }, selector);
    if (!info || info.clip.width < 1 || info.clip.height < 1) continue;

    await page.addStyleTag({
      content: '[data-contrast-sample],[data-contrast-sample] *{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}',
    });
    await page.waitForTimeout(30);
    const vw = await page.evaluate(() => [innerWidth, innerHeight]);
    const clip = {
      x: Math.max(0, info.clip.x),
      y: Math.max(0, info.clip.y),
      width: Math.min(info.clip.width, vw[0] - Math.max(0, info.clip.x)),
      height: Math.min(info.clip.height, vw[1] - Math.max(0, info.clip.y)),
    };
    const png = await page.screenshot({ clip, animations: 'disabled' });
    await page.evaluate(() => {
      document.querySelector('[data-contrast-sample]')?.removeAttribute('data-contrast-sample');
      document.head.lastElementChild?.remove();
    });

    const { data, info: raw } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let worst = Infinity;
    for (let i = 0; i < data.length; i += raw.channels) {
      worst = Math.min(worst, contrast(info.fg, [data[i], data[i + 1], data[i + 2]]));
    }
    sampled++;
    const large = info.size >= 24 || (info.size >= 18.66 && info.weight >= 700);
    const needed = large ? 3 : 4.5;
    if (worst < needed) failures.push(`${selector}: worst pixel ${worst.toFixed(2)}:1 < ${needed}`);
  }
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), startY);
  await page.waitForTimeout(150);
  return { violations, sampled, failures };
}
