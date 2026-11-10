import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

export interface DistCheck {
  ac: string;
  name: string;
  run: (dist: string) => string[];
}

const TEXT = /\.(html|css|js|xml|txt|webmanifest|json|svg)$/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const html = (dist: string) => readFileSync(join(dist, 'index.html'), 'utf8');
const head = (dist: string) => html(dist).split('</head>')[0];

function allCss(dist: string): string {
  const inline = [...html(dist).matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  const files = walk(dist).filter((f) => f.endsWith('.css')).map((f) => readFileSync(f, 'utf8'));
  return [...inline, ...files].join('\n');
}

/** Rule blocks whose selector matches `selector` and whose body contains `needle`. */
function rulesWith(css: string, selector: RegExp, needle: RegExp): string[] {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => selector.test(m[1]) && needle.test(m[2])).map((m) => m[1]);
}

function section(dist: string, id: string): string {
  const doc = html(dist);
  const start = doc.indexOf(`<section id="${id}"`);
  if (start < 0) return '';
  return doc.slice(start, doc.indexOf('</section>', start));
}

function visibleText(dist: string): string {
  return html(dist)
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/g, ' ');
}

function jsonLd(dist: string): Record<string, unknown> {
  const match = html(dist).match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('no JSON-LD');
  return JSON.parse(match[1]);
}

const PHONE = /(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;

export const checks: DistCheck[] = [
  {
    ac: '1.4',
    name: 'no progress bars or percentages in #skills',
    run: (dist) => {
      const skills = section(dist, 'skills');
      const errors: string[] = [];
      if (!skills) errors.push('#skills missing');
      if (/<progress/i.test(html(dist))) errors.push('<progress> found');
      if (/role="progressbar"/.test(html(dist))) errors.push('role=progressbar found');
      if (skills.includes('%')) errors.push('% inside #skills');
      return errors;
    },
  },
  {
    ac: '1.10',
    name: 'theme script runs before the first stylesheet',
    run: (dist) => {
      const doc = head(dist);
      const script = doc.indexOf('dataset.theme');
      const sheet = Math.min(...[doc.indexOf('<style'), doc.indexOf('rel="stylesheet"')].filter((i) => i >= 0));
      return script >= 0 && script < sheet ? [] : [`theme script at ${script}, first stylesheet at ${sheet}`];
    },
  },
  {
    ac: '1.12',
    name: 'font-display swap everywhere, latin files only',
    run: (dist) => {
      const faces = allCss(dist).match(/@font-face\{[^}]*\}/g) ?? [];
      const errors = faces.filter((f) => !/font-display:swap/.test(f)).map((f) => `no swap: ${f.slice(0, 80)}`);
      if (faces.length === 0) errors.push('no @font-face found');
      for (const file of walk(dist)) {
        if (/cyrillic|greek|vietnamese/i.test(file)) errors.push(`non-latin font file ${relative(dist, file)}`);
      }
      return errors;
    },
  },
  {
    ac: '2.12',
    name: 'no phone number anywhere',
    run: (dist) => {
      const errors: string[] = [];
      for (const file of walk(dist).filter((f) => TEXT.test(f))) {
        if (readFileSync(file, 'utf8').includes('tel:')) errors.push(`tel: in ${relative(dist, file)}`);
      }
      const ld = JSON.stringify(jsonLd(dist));
      if (/telephone/i.test(ld)) errors.push('telephone key in JSON-LD');
      for (const [where, text] of [['visible text', visibleText(dist)], ['JSON-LD', ld]]) {
        const hit = text.match(PHONE);
        if (hit) errors.push(`phone-like "${hit[0]}" in ${where}`);
        if (text.includes('+91')) errors.push(`+91 in ${where}`);
      }
      return errors;
    },
  },
  {
    ac: '3.4',
    name: 'badge rows are in the served HTML',
    run: (dist) => {
      const doc = html(dist);
      const start = doc.indexOf('data-credential');
      const badge = doc.slice(start, doc.indexOf('data-trace-anchor="start"', start)).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
      return ['Software Engineer', 'C#/.NET · Java · REST/SOAP', 'Houghton, MI', '"open_to_work": true']
        .filter((s) => !badge.includes(s))
        .map((s) => `missing ${s}`);
    },
  },
  {
    ac: '4.3',
    name: 'no image preload in the fallback build',
    run: (dist) => (/<link[^>]+rel="preload"[^>]+as="image"/.test(head(dist)) ? ['image preload present'] : []),
  },
  {
    ac: '4.11',
    name: 'og-image.png is 1200x630 and og:image is absolute',
    run: (dist) => {
      const errors: string[] = [];
      const png = readFileSync(join(dist, 'og-image.png'));
      const [w, h] = [png.readUInt32BE(16), png.readUInt32BE(20)];
      if (w !== 1200 || h !== 630) errors.push(`og-image is ${w}x${h}`);
      if (!head(dist).includes('<meta property="og:image" content="https://kvadlapa.github.io/og-image.png">')) errors.push('og:image not absolute');
      return errors;
    },
  },
  {
    ac: '5.9',
    name: 'viewport-fit, safe-area insets and dynamic viewport units',
    run: (dist) => {
      const css = allCss(dist);
      const errors: string[] = [];
      if (!/<meta name="viewport" content="[^"]*viewport-fit=cover/.test(head(dist))) errors.push('no viewport-fit=cover');
      const needs: [string, RegExp, RegExp][] = [
        ['nav safe-area', /\.site-header/, /env\(safe-area-inset-/],
        ['menu safe-area', /\.menu-inner/, /env\(safe-area-inset-/],
        ['footer safe-area', /\.site-footer/, /env\(safe-area-inset-/],
        ['hero dvh', /\.hero\b/, /\d+dvh/],
        ['menu dvh', /\.menu\b/, /100dvh/],
      ];
      for (const [name, selector, needle] of needs) if (rulesWith(css, selector, needle).length === 0) errors.push(`missing ${name}`);
      return errors;
    },
  },
  {
    ac: '6.2',
    name: 'total JS is at most 30KB gzipped',
    run: (dist) => {
      const files = walk(dist).filter((f) => f.endsWith('.js')).map((f) => readFileSync(f));
      const inline = [...html(dist).matchAll(/<script(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => Buffer.from(m[1]));
      const total = [...files, ...inline].reduce((sum, buf) => sum + gzipSync(buf, { level: 9 }).length, 0);
      return total <= 30 * 1024 ? [] : [`${total} bytes gzipped`];
    },
  },
  {
    ac: '6.11',
    name: 'head meta tags',
    run: (dist) => {
      const doc = head(dist);
      const errors: string[] = [];
      if (!/<title>[^<]+<\/title>/.test(doc)) errors.push('no title');
      const description = doc.match(/<meta name="description" content="([^"]*)"/)?.[1];
      if (!description || description.length > 160) errors.push(`description length ${description?.length}`);
      if (!doc.includes('<link rel="canonical" href="https://kvadlapa.github.io/">')) errors.push('canonical');
      for (const property of ['og:title', 'og:description', 'og:image', 'og:url']) {
        if (!doc.includes(`property="${property}"`)) errors.push(property);
      }
      if (!doc.includes('name="twitter:card"')) errors.push('twitter:card');
      return errors;
    },
  },
  {
    ac: '6.12',
    name: 'JSON-LD Person',
    run: (dist) => {
      const ld = jsonLd(dist);
      const errors = ['name', 'url', 'email', 'jobTitle', 'address', 'sameAs'].filter((key) => !ld[key]).map((key) => `missing ${key}`);
      if (ld['@type'] !== 'Person') errors.push(`@type ${ld['@type']}`);
      return errors;
    },
  },
  {
    ac: '6.13',
    name: 'sitemap, robots and favicons',
    run: (dist) => {
      const errors: string[] = [];
      const index = readFileSync(join(dist, 'sitemap-index.xml'), 'utf8');
      const sitemaps = [...index.matchAll(/<loc>https:\/\/kvadlapa\.github\.io\/([^<]+)<\/loc>/g)].map((m) => m[1]);
      const listsRoot = sitemaps.some((file) => existsSync(join(dist, file)) && readFileSync(join(dist, file), 'utf8').includes('<loc>https://kvadlapa.github.io/</loc>'));
      if (!listsRoot) errors.push('sitemap does not list the root');
      const robots = readFileSync(join(dist, 'robots.txt'), 'utf8');
      if (!/User-agent: \*/.test(robots) || !/Allow: \//.test(robots) || /Disallow: \//.test(robots)) errors.push('robots does not allow all');
      if (!robots.includes('Sitemap: https://kvadlapa.github.io/sitemap-index.xml')) errors.push('robots does not name the sitemap');
      const linked = [...head(dist).matchAll(/<link rel="(?:icon|apple-touch-icon|manifest)"[^>]*href="\/([^"]+)"/g)].map((m) => m[1]);
      for (const file of linked) if (!existsSync(join(dist, file))) errors.push(`linked ${file} missing`);
      for (const file of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest']) {
        if (!existsSync(join(dist, file))) errors.push(`${file} missing`);
        if (!linked.includes(file)) errors.push(`${file} not linked`);
      }
      return errors;
    },
  },
  {
    ac: '6.14',
    name: 'no lorem or TODO in the build',
    run: (dist) =>
      walk(dist)
        .filter((f) => TEXT.test(f))
        .filter((f) => /lorem|todo/i.test(readFileSync(f, 'utf8')))
        .map((f) => `found in ${relative(dist, f)}`),
  },
  {
    ac: '7.5',
    name: 'resume absent: Request resume mailto, no .pdf href',
    run: (dist) => {
      const doc = html(dist);
      const errors: string[] = [];
      if (!/<a class="btn btn-primary" href="mailto:vadlapallykiran@gmail.com\?subject=Resume%20request"[^>]*>Request resume<\/a>/.test(doc)) errors.push('no Request resume mailto CTA');
      for (const file of walk(dist).filter((f) => TEXT.test(f))) {
        if (/href="[^"]*\.pdf"/i.test(readFileSync(file, 'utf8'))) errors.push(`.pdf href in ${relative(dist, file)}`);
      }
      return errors;
    },
  },
];

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dist = process.argv[2] ?? 'dist';
  let failed = 0;
  for (const check of checks) {
    const errors = check.run(dist);
    if (errors.length) failed++;
    console.log(`${errors.length ? 'FAIL' : 'pass'}  AC ${check.ac}  ${check.name}${errors.length ? `\n      ${errors.join('\n      ')}` : ''}`);
  }
  process.exit(failed ? 1 : 0);
}
