import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { byStartDesc, experience } from '../src/data/experience.ts';
import { exclude, featured } from '../src/data/projects.ts';
import { rankRepos } from '../src/lib/github.ts';
import snapshot from '../src/data/github-snapshot.json' with { type: 'json' };
import type { GitHubRepo } from '../src/types.ts';
import { openPage } from './helpers/page.ts';

const brief = readFileSync(new URL('../BRIEF.md', import.meta.url), 'utf8');
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
const desktop = { width: 1440, height: 900 };

test.describe('content', () => {
  test('AC 1.1 hero contains the tagline', async ({ browser }) => {
    const page = await openPage(browser, desktop, 'dark');
    expect(await page.locator('#hero').innerText()).toContain('From copper traces to API connectors.');
  });

  test('AC 1.2 about tells the copper story', async ({ browser }) => {
    const page = await openPage(browser, desktop, 'dark');
    const about = await page.locator('#about').innerText();
    for (const s of ['Electrical Engineering', 'Michigan Tech', 'Keweenaw', 'Copper Country', 'API connectors']) expect(about).toContain(s);
  });

  test('AC 1.3 designators are visible and mono', async ({ browser }) => {
    const page = await openPage(browser, desktop, 'dark');
    for (const d of ['U3', 'U2', 'TP1', 'U1']) {
      const el = page.locator(`#experience [data-component="${d}"] .designator`);
      await expect(el).toBeVisible();
      await expect(el).toHaveText(d);
      expect(await el.evaluate((e) => getComputedStyle(e).fontFamily)).toMatch(/^"?DM Mono/);
    }
  });

  test('AC 1.4 skills render 34 parts in 6 labeled groups', async ({ browser }) => {
    const page = await openPage(browser, desktop, 'dark');
    await expect(page.locator('#skills [data-part]')).toHaveCount(34);
    await expect(page.locator('#skills [data-group]')).toHaveCount(6);
    // Group names come from the brief's Skills list, in its order; banks are lettered A-F.
    const groups = brief
      .split('Skills (as labeled parts')[1]
      .split('Research (')[0]
      .split('\n')
      .filter((l) => l.startsWith('- '))
      .map((l) => l.slice(2).split(':')[0].trim());
    expect(groups).toHaveLength(6);
    const labels = (await page.locator('#skills [data-group] h3').allInnerTexts()).map((t) => t.trim());
    expect(labels).toEqual(groups.map((g, i) => `BANK ${'ABCDEF'[i]} · ${g}`));
    expect(await page.locator('#skills [data-group]').evaluateAll((els) => els.map((e) => e.getAttribute('data-group')))).toEqual(groups);
  });

  test('AC 1.7 access strings and the credential exist only in hero or contact', async ({ browser }) => {
    const page = await openPage(browser, desktop, 'dark');
    const stray = await page.evaluate(() => {
      const bad: string[] = [];
      const inside = (el: Element) => Boolean(el.closest('#hero, #contact'));
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const text = n.textContent ?? '';
        if (/ACCESS GRANTED|Request access/i.test(text) && !inside(n.parentElement as Element)) bad.push(text);
      }
      for (const el of document.querySelectorAll('[data-credential]')) if (!inside(el)) bad.push('credential card');
      return bad;
    });
    expect(stray).toEqual([]);
  });

  test('AC 2.1 name, location and relocation are visible', async ({ browser }) => {
    const page = await openPage(browser, desktop, 'dark');
    await expect(page.getByText('Kiran Vadlapally').first()).toBeVisible();
    await expect(page.getByText('Houghton, MI').first()).toBeVisible();
    await expect(page.getByText(/open to relocation/i).first()).toBeVisible();
  });

  test('AC 2.2 contact links have exact hrefs', async ({ browser }) => {
    const page = await openPage(browser, desktop, 'dark');
    const hrefs = await page.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
    expect(hrefs.some((h) => /^mailto:vadlapallykiran@gmail\.com(\?.*)?$/.test(h))).toBe(true);
    expect(hrefs).toContain('https://linkedin.com/in/kvadlapa');
    expect(hrefs).toContain('https://github.com/kvadlapa');
  });

  test('AC 2.3 headline in hero and summary in about, verbatim', async ({ browser }) => {
    const page = await openPage(browser, desktop, 'dark');
    const headline = brief.match(/- Headline: "([^"]+)"/)?.[1] as string;
    const summary = brief.match(/- Summary: (.+)/)?.[1] as string;
    expect(norm(await page.locator('#hero').innerText())).toContain(norm(headline));
    expect(norm(await page.locator('#about').innerText())).toContain(norm(summary));
  });

  test('AC 2.4 every bullet and date range appears verbatim in its role', async ({ browser }) => {
    const page = await openPage(browser, desktop, 'dark');
    const blocks = brief.split('Experience (render')[1].split('Education:')[0];
    const roles = [...blocks.matchAll(/^(U\d|TP\d) · .*?, ([A-Z][a-z]{2} \d{4}–(?:Present|[A-Z][a-z]{2} \d{4}))[^\n]*\n((?: - .*\n)+)/gm)];
    expect(roles).toHaveLength(4);
    for (const [, designator, dates, bullets] of roles) {
      const text = norm(await page.locator(`[data-component="${designator}"]`).innerText());
      expect(text).toContain(dates);
      for (const bullet of bullets.split('\n').filter(Boolean)) expect(text).toContain(norm(bullet.replace(/^ - /, '')));
    }
  });

  test('AC 2.5 experience order is U3, U2, TP1, U1 whatever the array order', async ({ browser }) => {
    const page = await openPage(browser, desktop, 'dark');
    const order = await page.locator('#experience [data-component]').evaluateAll((els) => els.map((e) => e.getAttribute('data-component')));
    expect(order).toEqual(['U3', 'U2', 'TP1', 'U1']);
    expect(byStartDesc([...experience].reverse()).map((r) => r.designator)).toEqual(['U3', 'U2', 'TP1', 'U1']);
    expect(byStartDesc(experience).map((r) => r.designator)).toEqual(['U3', 'U2', 'TP1', 'U1']);
  });

  test('AC 2.6 one ACTIVE indicator, in U3; TP1 is a test point', async ({ browser }) => {
    const page = await openPage(browser, desktop, 'dark');
    await expect(page.locator('#experience [data-status="active"]')).toHaveCount(1);
    await expect(page.locator('[data-component="U3"] [data-status="active"]')).toHaveText('● ACTIVE');
    await expect(page.locator('[data-component="TP1"]')).toHaveAttribute('data-variant', 'test-point');
  });

  test('AC 2.7 education, certification and the verified credential chip', async ({ browser }) => {
    const page = await openPage(browser, desktop, 'dark');
    for (const s of ['M.S. Computer Science, Michigan Tech, 2025', 'B.S. Electrical & Electronics Engineering, MLR Institute of Technology, Hyderabad', 'Microsoft Certified: Identity and Access Administrator Associate (SC-300)']) {
      await expect(page.getByText(s, { exact: false }).first()).toBeVisible();
    }
    const chip = page.locator('.cert');
    await expect(chip).toContainText('VERIFIED CREDENTIAL');
    // profile.ts has no certification url yet, so the chip is not a link.
    expect(await chip.evaluate((e) => e.tagName)).toBe('P');
    await expect(page.locator('#about a.cert')).toHaveCount(0);
  });

  test('AC 2.8 all 34 skills sit under their groups', async ({ browser }) => {
    const page = await openPage(browser, desktop, 'dark');
    const groups = {
      Languages: 'Java, C#, SQL, VB.NET',
      Backend: '.NET Framework, ASP.NET, Spring Boot, Hibernate (JPA), REST, SOAP, Microservices',
      Data: 'PostgreSQL, MySQL, SQL Server',
      'Reliability & Practices': 'Incremental sync, Idempotency, Fault tolerance, Retries, Rate limiting, Unit & integration testing, Code reviews, CI/CD, Production operations',
      'Identity & Security': 'OAuth 2.0, OpenID Connect, Microsoft Entra ID, Active Directory',
      'Cloud & DevOps': 'AWS, Azure, Docker, Jenkins, Bitbucket Pipelines, Git, Linux',
    };
    for (const [group, list] of Object.entries(groups)) {
      const parts = page.locator(`[data-group="${group}"] [data-part]`);
      await expect(parts).toHaveText(list.split(', '));
      for (const part of await parts.all()) await expect(part).toBeVisible();
    }
    await expect(page.locator('[data-group="Data"]').getByText('query tuning, indexing, execution plans')).toBeVisible();
  });

  test('AC 2.9 research cards: exact titles, descriptions, IN PROGRESS, links only when set', async ({ browser }) => {
    const page = await openPage(browser, desktop, 'dark');
    const cards = page.locator('#research [data-research-card]');
    await expect(cards).toHaveCount(2);
    // From BRIEF.md: "1. <title>: <description>". The team lead's decision (fix round 1) is sentence
    // case, so the rendered description is the brief's with only the first letter capitalised.
    const fromBrief = [...brief.split('Research (')[1].split('Projects:')[0].matchAll(/^\d\. ([^:]+): (.+)$/gm)].map((m) => [m[1].trim(), norm(m[2])]);
    expect(fromBrief).toHaveLength(2);
    for (const [i, [title, description]] of fromBrief.entries()) {
      const card = cards.nth(i);
      await expect(card.locator('h3')).toHaveText(title);
      const rendered = norm(await card.locator('.research-desc').innerText());
      expect(rendered).toBe(description[0].toUpperCase() + description.slice(1));
      await expect(card.getByText('● IN PROGRESS')).toBeVisible();
      await expect(card.locator('a')).toHaveCount(0);
    }
    const types = readFileSync(new URL('../src/types.ts', import.meta.url), 'utf8');
    const researchType = types.split('interface ResearchItem')[1].split('}')[0];
    expect(researchType).toMatch(/paperUrl\?: string/);
    expect(researchType).toMatch(/repoUrl\?: string/);
  });

  test('AC 2.10 at most 6 repo cards plus 2 placeholders, no excluded repos', async ({ browser }) => {
    const page = await openPage(browser, desktop, 'dark');
    const repoCards = page.locator('#projects [data-project-card]');
    expect(await repoCards.count()).toBeLessThanOrEqual(6);
    expect(await repoCards.count()).toBeGreaterThan(0);
    await expect(page.locator('#projects [data-placeholder]')).toHaveCount(2);
    const names = await repoCards.locator('h3').allInnerTexts();
    for (const name of ['kvadlapa', '-smartbudget', 'Mermaid-tester', 'kvadlapa.github.io', 'neetcode-submissions', 'Java']) expect(names).not.toContain(name);
  });

  test('AC 2.11 projects.ts curation: exclude removes, featured[0] renders first', () => {
    const source = readFileSync(new URL('../src/data/projects.ts', import.meta.url), 'utf8');
    for (const name of ['featured', 'exclude', 'overrides', 'placeholders']) expect(source).toMatch(new RegExp(`export const ${name}\\b`));
    const repos = snapshot as GitHubRepo[];
    const base = { featured, exclude, overrides: {} };
    expect(rankRepos(repos, base).map((r) => r.name)).toContain('smartbudget');
    expect(rankRepos(repos, { ...base, exclude: [...exclude, 'smartbudget'] }).map((r) => r.name)).not.toContain('smartbudget');
    const moved = ['robot_tracker', ...featured.filter((n) => n !== 'robot_tracker')];
    expect(rankRepos(repos, { ...base, featured: moved })[0].name).toBe('robot_tracker');
    expect(rankRepos(repos, base).length).toBeLessThanOrEqual(6);
  });
});
