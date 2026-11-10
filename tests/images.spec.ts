import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { imageSlots } from '../src/data/image-slots.ts';
import { openPage, scrollToY } from './helpers/page.ts';
import { THEMES } from './helpers/viewports.ts';

const brief = readFileSync(new URL('../BRIEF.md', import.meta.url), 'utf8');
const SLOTS = ['hero', 'keweenaw', 'research-sql', 'research-cicd', 'section-texture'];

test.describe('images', () => {
  test('AC 4.1 five slots with the brief filenames, dimensions and prompts', () => {
    expect(imageSlots).toHaveLength(5);
    const fromBrief = [...brief.matchAll(/^- ([a-z-]+\.png) \((\d+)×(\d+)[^)]*\): "([^"]+)"/gm)];
    expect(fromBrief, 'slots parsed from BRIEF.md').toHaveLength(5);
    for (const [, file, w, h, prompt] of brief.matchAll(/^- ([a-z-]+\.png) \((\d+)×(\d+)[^)]*\): "([^"]+)"/gm)) {
      const slot = imageSlots.find((s) => s.file === file);
      expect(slot, file).toBeTruthy();
      expect(slot!.width).toBe(Number(w));
      expect(slot!.height).toBe(Number(h));
      expect(slot!.prompt).toBe(prompt);
    }
    expect(imageSlots.map((s) => s.file).sort()).toEqual(['hero.png', 'keweenaw.png', 'research-cicd.png', 'research-sql.png', 'section-texture.png']);
  });

  for (const theme of THEMES) {
    test(`AC 4.2 fallback slots, no failed requests, no console errors (${theme})`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme });
      const page = await context.newPage();
      const problems: string[] = [];
      page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));
      page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
      page.on('requestfailed', (r) => problems.push(`failed: ${r.url()}`));
      page.on('response', (r) => r.status() >= 400 && problems.push(`${r.status()}: ${r.url()}`));
      await page.goto('/');
      await scrollToY(page, 'bottom');
      await page.waitForTimeout(500);
      for (const slot of SLOTS) await expect(page.locator(`[data-slot="${slot}"]`)).toHaveAttribute('data-slot-state', 'fallback');
      expect(problems).toEqual([]);
    });

    test(`AC 4.9 an overlay sits over the hero art that holds text (${theme})`, async ({ browser }) => {
      const page = await openPage(browser, { width: 1440, height: 900 }, theme);
      const overlay = await page.locator('#hero [data-overlay]').evaluate((e) => getComputedStyle(e, '::before').backgroundImage);
      expect(overlay).toContain('gradient');
    });

    test(`AC 4.10 texture opacity is 6-10% (${theme})`, async ({ browser }) => {
      const page = await openPage(browser, { width: 1440, height: 900 }, theme);
      const opacity = await page.locator('[data-slot="section-texture"]').evaluate((e) => Number(getComputedStyle(e).opacity));
      expect(opacity).toBeGreaterThanOrEqual(0.06);
      expect(opacity).toBeLessThanOrEqual(0.1);
    });
  }

  test('AC 4.12 npm run images without a key lists slots and writes nothing; README lists them', () => {
    const before = readdirSync('src/assets/images').sort();
    const env = { ...process.env, OPENAI_API_KEY: '' };
    const output = execFileSync('node', ['scripts/generate-images.ts'], { env, encoding: 'utf8' });
    for (const slot of imageSlots) expect(output).toContain(slot.file);
    expect(readdirSync('src/assets/images').sort()).toEqual(before);
    expect(existsSync('README.md')).toBe(true);
    const readme = readFileSync('README.md', 'utf8').replace(/\s+/g, ' ');
    for (const slot of imageSlots) {
      expect(readme).toContain(slot.file);
      expect(readme).toContain(`${slot.width}×${slot.height}`);
      expect(readme).toContain(slot.prompt);
    }
  });
});
