# Copper Circuit: Kiran Vadlapally's portfolio

A single-page software engineer portfolio built with Astro 7, TypeScript and Tailwind CSS 4, with static output. The page is drawn as a circuit board: one copper trace runs from the credential badge in the hero to the contact panel, and copper oxidises to patina as you scroll.

- Requirements and content: `BRIEF.md`
- Scope, acceptance criteria and decisions: `docs/PLAN.md`
- Visual system, motion and fallback art: `docs/DESIGN.md`

## Local development

Node 24 is the CI target (`.node-version`); Node 22.23.4 or later works locally.

```sh
npm install
npm run dev          # http://127.0.0.1:4321
npm run build        # static site in dist/
npm run check        # astro check (TypeScript)
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server on localhost |
| `npm run build` | Production build to `dist/` |
| `npm run check` | `astro check`, must report 0 errors |
| `npm test` | Playwright suite (Google Chrome) against `serve dist`. Build first. Writes screenshots to `tests/screenshots/` |
| `npm run test:fixtures` | Builds `dist-fixture` with test PNGs and a test PDF, runs the image and resume checks, then the build-resilience checks. Removes every fixture file afterwards |
| `npm run lighthouse` | Three Lighthouse mobile runs against `serve dist`. Reports and medians go to `tests/reports/` |
| `npm run snapshot` | Refreshes `src/data/github-snapshot.json` from the GitHub API |
| `npm run images` | Lists the image slots, and generates them if `OPENAI_API_KEY` is set |
| `npm run favicons` | Rasterises `public/favicon.svg` into the PNG and ICO icons |
| `node scripts/check-dist.ts dist` | Static checks over a build (meta tags, JSON-LD, JS budget, no phone number, no TODO) |

Playwright uses the installed Google Chrome (`channel: 'chrome'`), so no browser download is needed.

## Editing content

All content lives in typed files in `src/data/`. Components contain no resume facts.

| File | Holds |
|---|---|
| `profile.ts` | Name, links, headline, tagline, summary, the About story, education, the SC-300 certification, the contact line, meta description |
| `experience.ts` | Roles. Display order comes from each role's `start` date (newest first), so array order does not matter |
| `skills.ts` | The six skill banks |
| `research.ts` | The two research items. Set `paperUrl` or `repoUrl` and the card shows a link; until then it shows a "DNP" (do not populate) chip |
| `projects.ts` | GitHub curation: `featured` (pin order), `exclude`, `overrides` (description, tags, url per repo) and the two research `placeholders` |
| `image-slots.ts` | Image slot names, sizes, prompts, alt text and `sizes` attributes |

**Projects.** At build time the site fetches `kvadlapa`'s public repos, drops forks, archived and empty repos and anything in `exclude`, then shows `featured` in order and fills to six by stars and recency. If the API fails, rate-limits or returns nothing usable, the build uses `src/data/github-snapshot.json` and logs a warning; it never fails on GitHub. Run `npm run snapshot` to refresh the snapshot. Descriptions come only from GitHub or from `overrides`. To add one:

```ts
export const overrides = {
  smartbudget: { description: 'Your own words', tags: ['java', 'spring-boot'] },
};
```

**Resume.** Put the PDF at `public/Kiran_Vadlapally_Resume.pdf`. The next build turns the hero CTA from "Request resume" (a mailto link) into "Resume" (a link to the PDF). No code changes are needed. Read T1 below first.

**SC-300.** Add `url` to `profile.certification` and the chip becomes a link to your verification page.

## Adding or regenerating images

The site ships with SVG and CSS fallback art for every slot, so it looks finished without any images. To use real images, drop PNG masters into `src/assets/images/` with these exact names and rebuild. No code changes are needed: each slot switches from the fallback art to a responsive `<picture>` (AVIF and WebP, widths up to the master's own size, never upscaled).

| File | Size | Prompt |
|---|---|---|
| `hero.png` | 3840×2160 | Ultra-macro photograph of a dark printed circuit board, glowing copper traces and solder pads, shallow depth of field, cinematic low-key lighting, deep blue-black background, copper and teal tones, subtle bokeh, 8k detail, minimalist, lots of negative space on the left |
| `keweenaw.png` | 3840×2160 | Moody aerial photograph of Lake Superior shoreline in Michigan's Keweenaw Peninsula at blue hour, dark rocky copper-colored cliffs, light snow, calm deep blue water, cinematic, muted palette with copper and teal accents, no buildings, no text |
| `research-sql.png` | 2400×1600 | Abstract 3D render of glowing data tables and query paths flowing through a neural network, copper and teal light on deep navy, clean minimal composition, soft volumetric light |
| `research-cicd.png` | 2400×1600 | Abstract 3D render of an interconnected software pipeline of glass cubes with one cracked, glowing node revealing a hidden flaw, copper and teal on deep navy, minimal, cinematic lighting |
| `section-texture.png` | 3840×2160 | Top-down macro of oxidized copper surface with patina streaks, seamless, dark, subtle texture |

No text, no logos and no faces in any image. `section-texture.png` is shown at 6-10% opacity. The Open Graph card (`/og-image.png`, 1200×630) is rendered at build time with Satori and needs no file.

**Generating them.** Copy `.env.example` to `.env`, set `OPENAI_API_KEY`, then:

```sh
npm run images                    # generate every missing slot
npm run images -- --only hero     # one slot
npm run images -- --force         # replace existing files
```

The provider returns at most 1536px, so the script upscales each image with sharp to its slot size and says so in its output. Without a key it only prints this list. The generation path has not been run, because no key was available when it was written.

**Checks after adding images:** a build logs a warning for any slot smaller than its target, and fails if a PNG is corrupt. Re-run `npm run lighthouse`, because the hero image becomes the LCP element.

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` builds on every push to `main` (and on manual dispatch) with Node 24 and `npm ci`, then deploys with `actions/deploy-pages`.

1. Create the public repository `kvadlapa/kvadlapa.github.io` and push this project to `main`.
2. In the repository, go to **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.
3. Push to `main`. The site is served at https://kvadlapa.github.io/.

The workflow passes the built-in `GITHUB_TOKEN` to the build, which raises the GitHub API rate limit for the project cards. No other secrets are needed.

## Deploying to Vercel

1. Import the repository in Vercel. The framework preset is **Astro**, the build command is `npm run build` and the output directory is `dist`.
2. Optionally add a `GITHUB_TOKEN` environment variable (a fine-grained token with public read access) to avoid API rate limits. Without it the build falls back to the snapshot.
3. The canonical URL, sitemap and Open Graph URLs point to `https://kvadlapa.github.io/`. If Vercel becomes the primary host, change `site` in `astro.config.ts`, `profile.site` in `src/data/profile.ts`, and the sitemap line in `public/robots.txt`.

## Testing

```sh
npm run build && npm test          # main suite, ACs from docs/PLAN.md section 4
npm run test:fixtures              # image, resume and build-resilience ACs
npm run lighthouse                 # AC 6.4
```

Every test title starts with its acceptance-criterion number, for example `AC 3.7`. Not covered here: live Pages deployment and Safari/iOS rendering (testing is Chrome only).

## Pre-launch TODOs

These come from `docs/PLAN.md` section 6. Each one that touches content has a matching `// TODO(Kiran) Tn` comment in `src/`. Items marked **blocks launch** need an answer before the site is public.

- [ ] **T1 Resume PDF and phone (blocks launch).** Remove the phone number from the PDF and check its metadata before adding it. No automated check covers the PDF.
- [ ] **T2 SoftwareIDM disclosure (blocks launch).** Check every U3 bullet against your employment agreement: the named systems, "Own the ServiceNow provider", "production-only bugs", "no dedicated QA", the infrastructure line, and the Claude Code and data-handling line.
- [x] **T3 Accenture and Antra details.** "production insurance onboarding platform", "daily production reports", "enterprise clients".
- [ ] **T4 Project content (blocks launch quality).** Repos have no descriptions or topics, so cards show name, language and last update. Add descriptions on GitHub or in `overrides`, and confirm the `featured` list and that coursework may be public.
- [ ] **T5 Deployment repo (blocks launch).** Create `kvadlapa.github.io` and set Pages to GitHub Actions (see above).
- [x] **T6 "2.5+ years".** True as a combined figure; update around Mar 2027.
- [x] **T7 Job titles.** Confirm "Software Engineer" matches official titles.
- [ ] **T8 SC-300 "verified credential".** Add a verification URL and confirm the cert is current.
- [ ] **T9 Education dates.** Add years if wanted; an M.S. start date would explain the 2023-2024 gap.
- [ ] **T10 Work authorization.** No line is shown, because none was stated.
- [x] **T11 Skills without visible backing.** VB.NET, OAuth 2.0 / OpenID Connect, PostgreSQL, MySQL.
- [ ] **T12 Research disclosure.** Confirm the titles can be public and add paper and repo URLs.
- [x] **T13 Metrics.** "cut response times" has no number; none was invented.
- [ ] **T14 Names.** Confirm the three course names and "MLR Institute of Technology".
- [ ] **T15 LinkedIn URL.** Confirm https://linkedin.com/in/kvadlapa resolves.
- [ ] **T16 Public email.** The address is plain text in the HTML and JSON-LD.
- [ ] **T17 Images.** Review generated PNGs for text, logos and faces, keep the alt text accurate, and re-run Lighthouse.
- [ ] **T18 Safari.** Check once on a real iPhone: notch insets, `dvh`, the menu.

**Photos.** There is no photo slot yet. To add one later, add a slot to `src/data/image-slots.ts` (with a `SlotName` entry in `src/types.ts`), render it with `ImageSlot`, and drop the PNG into `src/assets/images/`.
