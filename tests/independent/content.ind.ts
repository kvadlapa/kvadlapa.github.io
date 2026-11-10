import { expect, test } from '@playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { open } from './util.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const brief = readFileSync(join(root, 'BRIEF.md'), 'utf8');
const dist = join(root, 'dist');
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
const walk = (d: string): string[] => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
const textFiles = walk(dist).filter((f) => /\.(html|css|js|xml|txt|webmanifest|json|svg)$/.test(f));

test.describe('brief strings, verbatim, where they belong', () => {
  test('identity, tagline, headline, summary', async ({ browser }) => {
    const page = await open(browser, { width: 1440, height: 900 });
    const hero = norm(await page.locator('#hero').innerText());
    const about = norm(await page.locator('#about').innerText());
    expect(hero).toContain('From copper traces to API connectors.');
    expect(hero).toContain('Backend Software Engineer: reliable, fault-tolerant services in C#/.NET and Java');
    expect(hero).toContain('Houghton, MI');
    expect(hero.toLowerCase()).toContain('open to relocation');
    expect(about).toContain(norm(brief.match(/- Summary: (.+)/)![1]));
  });

  test('each role shows its brief title, employer, location and dates inside its own component', async ({ browser }) => {
    const page = await open(browser, { width: 1440, height: 900 });
    const roles = [
      ['U3', 'Software Engineer', 'SoftwareIDM', 'Houghton, MI', 'Dec 2025–Present'],
      ['U2', 'Software Engineer', 'Antra, Inc.', 'Remote', 'May 2025–Nov 2025'],
      ['U1', 'Associate Software Developer', 'Accenture', 'Hyderabad, India', 'Apr 2022–Aug 2023'],
      ['TP1', 'Teaching Assistant & Grader', 'Michigan Technological University', null, 'Aug 2024–May 2025'],
    ] as const;
    for (const [d, title, org, loc, dates] of roles) {
      const t = norm(await page.locator(`[data-component="${d}"]`).innerText());
      for (const s of [title, org, loc, dates].filter(Boolean) as string[]) expect(t, `${d} ${s}`).toContain(s);
    }
  });

  test('every brief bullet appears exactly once on the page, in its own role and no other', async ({ browser }) => {
    const page = await open(browser, { width: 1440, height: 900 });
    const section = brief.split('Experience (render')[1].split('Education:')[0];
    const blocks = section.split(/\n(?=U\d · |TP\d · )/).filter((b) => /^(U\d|TP\d) · /.test(b));
    expect(blocks).toHaveLength(4);
    for (const block of blocks) {
      const d = block.match(/^(U\d|TP\d)/)![1];
      const bullets = [...block.matchAll(/^ - (.+)$/gm)].map((m) => norm(m[1]));
      expect(bullets.length, d).toBeGreaterThan(0);
      const items = (await page.locator(`[data-component="${d}"] li`).allInnerTexts()).map(norm);
      expect(items, d).toEqual(bullets);
    }
    expect(await page.locator('#experience li').count()).toBe(13);
  });

  test('education, certification, skills, research, contact and footer strings', async ({ browser }) => {
    const page = await open(browser, { width: 1440, height: 900 });
    const body = norm(await page.locator('body').innerText());
    for (const s of [
      'M.S. Computer Science, Michigan Tech, 2025',
      'B.S. Electrical & Electronics Engineering, MLR Institute of Technology, Hyderabad',
      'Microsoft Certified: Identity and Access Administrator Associate (SC-300)',
      'VERIFIED CREDENTIAL',
      'query tuning, indexing, execution plans',
      'LLM-Assisted SQL Query Optimization',
      'Security Misconfigurations in CI/CD Workflows',
      'Request access',
      'vadlapallykiran@gmail.com',
      'Built in Copper Country.',
    ]) expect(body, s).toContain(s);
    const parts = await page.locator('#skills [data-part]').allInnerTexts();
    const briefParts = brief.split('Skills (as labeled parts')[1].split('Research (')[0]
      .split('\n').filter((l) => l.startsWith('- '))
      .flatMap((l) => l.replace(/^- [^:]+: /, '').replace(/ \((?:query tuning|object-oriented)[^)]*\)$/, '').split(', '));
    // Skills render in sentence case: only a lowercase first letter may differ from the brief.
    expect(parts.map(norm)).toEqual(briefParts.map((p) => norm(p[0].toUpperCase() + p.slice(1))));
  });

  // Team-lead decision (re-verification round): descriptions are stored and rendered in sentence case;
  // wording otherwise exactly the brief's.
  test('research descriptions render in sentence case and otherwise match the brief exactly', async ({ browser }) => {
    const page = await open(browser, { width: 1440, height: 900 });
    const rendered = (await page.locator('#research [data-research-card] .research-desc').allInnerTexts()).map(norm);
    expect(rendered).toEqual([
      'Using LLMs to detect and rewrite inefficient SQL, evaluated against execution plans',
      'An empirical study of software supply-chain risks in pipeline configurations',
    ]);
    const fromBrief = [...brief.matchAll(/^\d\. (?:LLM-Assisted SQL Query Optimization|Security Misconfigurations in CI\/CD Workflows): (.+)$/gm)].map((m) => norm(m[1]));
    expect(fromBrief).toHaveLength(2);
    for (const [i, text] of rendered.entries()) {
      // Only the first letter may differ from the brief, and only in case.
      expect(text.slice(1), `research ${i + 1} after first letter`).toBe(fromBrief[i].slice(1));
      expect(text.toLowerCase(), `research ${i + 1} case-insensitive`).toBe(fromBrief[i].toLowerCase());
    }
  });

  test('mailto CTAs: hero Email and contact Request access carry the brief address and the planned subjects', async ({ browser }) => {
    const page = await open(browser, { width: 1440, height: 900 });
    const heroEmail = await page.locator('#hero').getByRole('link', { name: /^Email$/ }).getAttribute('href');
    expect(heroEmail).toMatch(/^mailto:vadlapallykiran@gmail\.com(\?|$)/);
    const request = await page.locator('#contact a.btn-primary, #contact').getByRole('link', { name: 'Request access' }).getAttribute('href');
    expect(request).toBe('mailto:vadlapallykiran@gmail.com?subject=Access%20request');
  });
});

test.describe('nothing private, unfinished or invented ships', () => {
  test('no phone number, tel: or +91 in any shipped text file', () => {
    const phone = /(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
    const hits: string[] = [];
    for (const f of textFiles) {
      const raw = readFileSync(f, 'utf8');
      if (/tel:/i.test(raw)) hits.push(`tel: in ${f}`);
      if (raw.includes('+91')) hits.push(`+91 in ${f}`);
      if (!/\.(html|txt|xml|json|webmanifest)$/.test(f)) continue; // minified JS/CSS are full of digit runs
      const text = raw.replace(/<script(?![^>]*ld\+json)[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ');
      const m = text.match(phone);
      if (m) hits.push(`phone-like "${m[0]}" in ${f}`);
    }
    expect(hits).toEqual([]);
  });

  test('no TODO, lorem, placeholder or template words in any shipped text file', () => {
    const bad = /\b(todo|lorem|ipsum|tbd|fixme|xxx|coming soon|placeholder text|your name|example\.com)\b/i;
    const hits = textFiles.filter((f) => bad.test(readFileSync(f, 'utf8'))).map((f) => `${f}: ${readFileSync(f, 'utf8').match(bad)![0]}`);
    expect(hits).toEqual([]);
  });

  test('every number in visible text, meta, JSON-LD, alt, aria-label and title is from the brief or explained', async ({ browser }) => {
    const page = await open(browser, { width: 1440, height: 900 });
    const surfaces = await page.evaluate(() => {
      const attrs = [...document.querySelectorAll('[alt], [aria-label], [title]')].flatMap((e) => ['alt', 'aria-label', 'title'].map((a) => e.getAttribute(a) ?? ''));
      const meta = [...document.querySelectorAll('title, meta[content]')].map((m) => (m.tagName === 'TITLE' ? m.textContent : m.getAttribute('content')) ?? '').filter((c) => !/^#|^width=|^https?:|^\d+$/.test(c));
      const ld = document.querySelector('script[type="application/ld+json"]')?.textContent ?? '';
      return [document.body.innerText, ...attrs, ...meta, ld].join('\n');
    });
    const tokens = [...new Set(surfaces.match(/[A-Za-z]*\d[\w.+%°]*/g) ?? [])];
    const explained = [
      /^(U[1-3]|TP1|Q[1-8]|J1|0[1-6])$/, // reference designators and section indices (design system)
      /^(47\.12°N|88\.57°W)$/, // Houghton's coordinates in the About caption, true but not from the brief
      /^20(1\d|2[0-6])$/, // years: brief dates or GitHub pushed_at
    ];
    const unexplained = tokens.filter((t) => !brief.includes(t) && !explained.some((r) => r.test(t)));
    expect(unexplained).toEqual([]);
  });

  test('JSON-LD holds only brief facts, and no extra claims', () => {
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
    expect(Object.keys(ld).sort()).toEqual(['@context', '@type', 'address', 'email', 'jobTitle', 'name', 'sameAs', 'url'].sort());
    expect(ld).toMatchObject({ name: 'Kiran Vadlapally', email: 'vadlapallykiran@gmail.com', jobTitle: 'Software Engineer', url: 'https://kvadlapa.github.io/' });
    expect(ld.sameAs.sort()).toEqual(['https://github.com/kvadlapa', 'https://linkedin.com/in/kvadlapa']);
    expect(ld.address.addressLocality).toBe('Houghton');
    expect(ld.address.addressRegion).toBe('MI');
  });

  test('meta description and OG/Twitter text use only brief phrases', () => {
    const head = html.split('</head>')[0];
    const texts = [...head.matchAll(/<meta (?:name|property)="(?:description|og:title|og:description|twitter:title|twitter:description)" content="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
    expect(texts.length).toBe(5);
    const allowedWords = new Set(`${brief} | software engineer and`.toLowerCase().match(/[a-z#/.&+-]+/g));
    for (const t of texts) {
      const words = t.toLowerCase().match(/[a-z#/.&+-]+/g) ?? [];
      const foreign = words.map((w) => w.replace(/[.,:]+$/, '')).filter((w) => w && !allowedWords.has(w) && !brief.toLowerCase().includes(w));
      expect(foreign, t).toEqual([]);
    }
  });

  test('alt text in the image build does not claim to be a photograph and contains no TODO', () => {
    let fixture = '';
    try {
      fixture = readFileSync(join(root, 'dist-fixture', 'index.html'), 'utf8');
    } catch {
      test.skip(true, 'dist-fixture not built');
    }
    const alts = [...fixture.matchAll(/alt="([^"]*)"/g)].map((m) => m[1]);
    expect(alts.length).toBeGreaterThan(0);
    for (const a of alts) {
      expect(a).not.toMatch(/photo(graph)?/i);
      expect(a).not.toMatch(/todo|lorem/i);
    }
  });
});

test.describe('project cards match GitHub, nothing written in', () => {
  test('every repo card is a real, non-fork, non-archived, non-empty public repo with its GitHub language and month, and no invented description', async ({ browser }) => {
    let repos: { name: string; fork: boolean; archived: boolean; size: number; language: string | null; pushed_at: string; description: string | null; html_url: string }[];
    let source = 'live api.github.com';
    try {
      const r = await fetch('https://api.github.com/users/kvadlapa/repos?per_page=100&type=owner', { headers: { 'User-Agent': 'portfolio-tester' }, signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error(String(r.status));
      repos = await r.json();
    } catch {
      repos = JSON.parse(readFileSync(join(root, 'src/data/github-snapshot.json'), 'utf8'));
      source = 'committed snapshot';
    }
    test.info().annotations.push({ type: 'github-source', description: source });
    const page = await open(browser, { width: 1440, height: 900 });
    const cards = await page.locator('#projects [data-project-card]:not([data-placeholder])').evaluateAll((cs) =>
      cs.map((c) => ({
        name: (c.querySelector('h3')?.textContent ?? '').trim(),
        href: c.querySelector('h3 a')?.getAttribute('href') ?? c.querySelector('a')?.getAttribute('href'),
        text: (c as HTMLElement).innerText,
        description: c.querySelector('.description')?.textContent?.trim() ?? null,
        updated: c.querySelector('.updated')?.textContent?.trim() ?? '',
      })),
    );
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.length).toBeLessThanOrEqual(6);
    for (const c of cards) {
      const repo = repos.find((r) => r.name === c.name);
      expect(repo, `${c.name} exists (${source})`).toBeTruthy();
      expect(repo!.fork || repo!.archived || repo!.size === 0, `${c.name} filtered`).toBe(false);
      expect(c.href).toBe(repo!.html_url);
      if (repo!.language) expect(c.text.toLowerCase()).toContain(repo!.language.toLowerCase());
      const month = new Date(repo!.pushed_at).toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
      expect(c.updated, `${c.name} updated`).toBe(`updated ${month}`);
      expect(c.description, `${c.name} description must come from GitHub`).toBe(repo!.description?.trim() || null);
    }
  });
});
