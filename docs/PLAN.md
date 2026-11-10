# Copper Circuit Portfolio: Build Plan

Source of truth: `BRIEF.md`. Visual system, component look and motion: `docs/DESIGN.md`. This document owns scope and acceptance. If they conflict on what ships, this document wins; on how it looks, DESIGN.md wins.

Facts checked 2026-11-02: astro 7.4.5 (Vite 8, Node >=22.23.4; 23.11 satisfies this), tailwindcss and @tailwindcss/vite 4.3.4, sharp 0.35.5 (optional in Astro, so declare it directly), playwright 1.64.1, lighthouse 13.6.0, satori 0.63.2, @resvg/resvg-js 2.6.2. Astro's `<Picture>` has no per-source `media` prop.

## 1. Folder structure

```
/
├── BRIEF.md
├── README.md
├── package.json, package-lock.json
├── astro.config.ts          site, static output, sitemap, tailwind vite plugin
├── tsconfig.json            extends astro strict
├── playwright.config.ts     channel: 'chrome' (no browser download)
├── .env.example             OPENAI_API_KEY=, GITHUB_TOKEN=
├── .gitignore               node_modules, dist*, .astro, .env, tests/screenshots, tests/reports
├── .node-version            24
├── .github/workflows/deploy.yml
├── docs/PLAN.md, docs/DESIGN.md
├── public/
│   ├── robots.txt
│   ├── favicon.svg, favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png
│   ├── site.webmanifest
│   └── Kiran_Vadlapally_Resume.pdf     absent until Kiran adds it
├── scripts/
│   ├── generate-images.ts              reads prompts from src/data/image-slots.ts
│   ├── generate-favicons.ts            rasterises favicon.svg
│   ├── refresh-github-snapshot.ts      rewrites src/data/github-snapshot.json
│   ├── check-dist.ts                   static checks over dist/
│   └── lighthouse.ts                   3 mobile runs, writes tests/reports/
├── src/
│   ├── assets/images/.gitkeep          PNG masters dropped here later
│   ├── components/                     see section 2
│   ├── data/
│   │   ├── profile.ts                  identity, links, summary, education, certification
│   │   ├── experience.ts
│   │   ├── skills.ts
│   │   ├── research.ts
│   │   ├── projects.ts                 featured, exclude, overrides, placeholders
│   │   ├── image-slots.ts              slot name, dimensions, prompt, alt, sizes
│   │   └── github-snapshot.json        committed fallback
│   ├── layouts/Base.astro
│   ├── lib/
│   │   ├── github.ts                   fetch, filter, rank, fall back
│   │   ├── images.ts                   import.meta.glob slot resolver
│   │   └── resume.ts                   PDF existence check
│   ├── pages/
│   │   ├── index.astro
│   │   └── og-image.png.ts             Satori + resvg static endpoint
│   ├── scripts/
│   │   ├── theme-init.ts               inlined in head
│   │   ├── scroll.ts                   one rAF loop: --oxidation and trace draw
│   │   ├── trace.ts                    builds path from anchors, ResizeObserver
│   │   ├── badge.ts, menu.ts, theme-toggle.ts, power.ts, pointer-glow.ts, copy-email.ts
│   ├── styles/global.css, tokens.css
│   └── types.ts
└── tests/
    ├── content.spec.ts, theme.spec.ts, interactions.spec.ts
    ├── responsive.spec.ts, a11y.spec.ts, seo.spec.ts
    ├── fixtures.spec.ts                PNG and PDF present state
    ├── helpers/viewports.ts
    └── screenshots/                    gitignored output
```

## 2. Components

"JS" means it ships a client script. All JS is plain Astro `<script>` with no UI framework.

| Component | Purpose | JS | Data source |
|---|---|---|---|
| `Base.astro` (layout) | html shell, head, skip link, theme-init inline | Inline theme-init only | profile.ts |
| `Seo.astro` | Meta, OG, canonical, JSON-LD Person | No | profile.ts |
| `BoardGrid.astro` | Edge-to-edge grid and the single texture layer | No | section-texture slot |
| `Nav.astro` | Sticky blurred nav, silkscreen links | No | Static section list |
| `MobileMenu.astro` | Hamburger, full-screen menu, focus trap, Esc | Yes (menu.ts) | Static section list |
| `ThemeToggle.astro` | Dark/blueprint switch with board flip | Yes (theme-toggle.ts) | None |
| `Trace.astro` | The single page-long SVG trace | Yes (trace.ts, scroll.ts) | `data-trace-anchor` elements |
| `Hero.astro` | Name, tagline, headline, CTAs | No | profile.ts |
| `HeroImage.astro` | Hand-built `<picture>` with portrait source, preload, LQIP | No | hero slot |
| `CredentialCard.astro` | ID badge authenticate sequence | Yes (badge.ts) | profile.ts |
| `CtaGroup.astro` | Resume, GitHub, LinkedIn, Email | No | profile.ts, lib/resume.ts |
| `About.astro` | Summary, EE story, education, SC-300 chip | No | profile.ts, keweenaw slot |
| `ImageSlot.astro` | `<Picture>` if the PNG exists, else fallback | No | lib/images.ts |
| `SlotFallback.astro` | Inline SVG/CSS art per slot | No | Slot name |
| `Experience.astro` | Board region, sorted by start date | Yes (power.ts) | experience.ts |
| `BoardComponent.astro` | One role (U-n or TP variant), LED | No (uses parent script) | experience.ts |
| `Projects.astro` | Chip grid | Yes (pointer-glow.ts) | lib/github.ts, projects.ts |
| `ProjectCard.astro` | Repo chip or placeholder chip, mono tags | No | Same |
| `Research.astro`, `ResearchCard.astro` | Two cards, cover slot, status chip | No | research.ts |
| `Skills.astro`, `PartGroup.astro` | Labeled parts by group | No | skills.ts |
| `Contact.astro` | "Request access" panel, mailto, socials | Yes (copy-email.ts) | profile.ts |
| `Footer.astro` | "Built in Copper Country." | No | Static |
| `StatusChip.astro` | ACTIVE, IN PROGRESS, ACCESS GRANTED states | No | Props |
| `SectionLabel.astro` | Silkscreen `/about` style heading label | No | Props |

## 3. Build milestones

Run in order. Each ends with its check green.

- **M0 Scaffold.** Astro at project root, TypeScript strict, Tailwind v4 via `@tailwindcss/vite`, sitemap, direct `sharp`, Fontsource (latin subsets only), `@playwright/test`, `@axe-core/playwright`, `lighthouse`, `serve`, `satori`, `@resvg/resvg-js`. No `git init` (D19). Check: `npm run build` exits 0.
- **M1 Data layer.** All `src/data/*.ts` with types and `// TODO(Kiran)` comments keyed to section 6, `github-snapshot.json`, `lib/github.ts`, `lib/images.ts`, `lib/resume.ts`. Check: `astro check` has 0 errors.
- **M2 Tokens and layout.** tokens.css from DESIGN.md, light-mode darkened accents, fonts, Base, Seo, BoardGrid, section skeleton in final order, theme-init. Check: AC 1.8-1.12 pass.
- **M3 Content sections, no motion.** Hero, CredentialCard in final state, About, Experience, Projects, Research, Skills, Contact, Footer, Nav, MobileMenu. Check: AC section 2 passes, and the page is complete with JS disabled.
- **M4 Image slots.** ImageSlot, SlotFallback, HeroImage, og-image endpoint, favicons, generate-images.ts. Check: AC section 4 passes in both fallback and fixture builds.
- **M5 Signature motion.** Trace, oxidation, badge sequence, power-up, pointer glow, board flip, reduced-motion paths. Check: AC section 3 and 6.9 pass.
- **M6 Responsive pass.** Run the viewport suite in both themes, fix all overflow and layout bugs. Check: AC section 5 passes.
- **M7 Quality.** SEO, axe, keyboard, JS budget, Lighthouse. Check: AC section 6 passes.
- **M8 Delivery.** README, deploy.yml, `.env.example`, clean-install build. Check: AC section 7 passes.
- **M9 Final run.** Production build, Lighthouse, Playwright screenshots, fix everything found, re-run all.

Scripts required: `dev`, `build`, `check` (astro check), `test` (playwright against `serve dist`), `test:fixtures`, `lighthouse`, `snapshot`, `images`.

Page order: `#hero, #about, #experience, #projects, #research, #skills, #contact`.

## 4. Acceptance criteria

Definitions:
- **V** is 320×568, 375×667, 414×896, 768×1024, 1024×768, 1280×720, 1440×900, 1920×1080, 2560×1440, 3840×2160, 844×390.
- **Both themes** means dark and light.
- **[PW]** Playwright on Google Chrome against `serve dist`. **[DIST]** static check over `dist/`. **[SRC]** grep over `src/`. **[LH]** Lighthouse. **[FIX]** fixture build per D6.
- "Award-quality" and "tasteful" are not ACs. They go to the design reviewer against DESIGN.md.

### Section 1: Theme
- 1.1 [PW] `#hero` contains exactly "From copper traces to API connectors."
- 1.2 [PW] `#about` contains each of: "Electrical Engineering", "Michigan Tech", "Keweenaw", "Copper Country", "API connectors".
- 1.3 [PW] `#experience` shows visible designators U3, U2, TP1, U1, each with computed font-family starting "JetBrains Mono".
- 1.4 [PW] `#skills` renders 26 parts (`[data-part]`) in 6 labeled groups. [DIST] No `<progress>`, no `role="progressbar"`, no `%` inside `#skills`.
- 1.5 [PW] `--oxidation` on `:root` is ≤0.01 at scrollY 0, ≥0.99 at page bottom, and non-decreasing across 5 evenly spaced scroll samples.
- 1.6 [PW] At dark-mode scrollY 0 the accent token computes to #C47A4A; at page bottom it computes to #5FA39A. Hover colour on a primary CTA at scrollY 0 computes to #E29A64.
- 1.7 [PW] "ACCESS GRANTED", "Request access" and the credential card exist only inside `#hero` or `#contact`.
- 1.8 [PW] Dark tokens compute exactly to the brief values: bg #0B1218, surface #111C24, grid #1C2A35, text #E8ECEF, muted #8C99A4. Light: bg #F4F1EA, surface #FFFFFF, grid #DCD6C8, ink #13202A, muted #5A6670.
- 1.9 [PW] Status green is the computed `color`, `background-color` or `fill` only on `[data-status="active"]` and `[data-status="granted"]`, across all elements in both themes. IN PROGRESS chips do not use it.
- 1.10 [PW] Theme resolution:
  - no storage + `colorScheme: dark` gives dark
  - no storage + `no-preference` gives dark
  - no storage + `light` gives light
  - stored value beats OS preference and survives reload
  - `data-theme` is set by an inline script placed before the first stylesheet in `<head>` [DIST]
- 1.11 [PW] axe `color-contrast` has 0 violations in both themes, at scrollY 0 and page bottom, at 375 and 1440. Any axe "incomplete" text over an image is pixel-sampled from a screenshot: the worst pixel in its box gives ≥4.5:1, or ≥3:1 for text ≥24px or ≥18.66px bold. [FIX] Repeat on `#hero` with a solid #808080 hero.png.
- 1.12 [PW] Computed families: h1 Space Grotesk weight 600-700; body Inter weight 400 or 500; labels JetBrains Mono. All font requests are same-origin `.woff2`. [DIST] Every built `@font-face` has `font-display: swap`; no font filename contains cyrillic, greek or vietnamese.
- 1.13 [PW] h1 computed font-size is 44px at width 320, 80px at width 1000, 104px at width 3840 (±0.5px). [SRC] `clamp(2.75rem, 8vw, 6.5rem)` present; `max-width: 68ch` (or Tailwind equivalent) on body copy.

### Section 2: About me
- 2.1 [PW] Visible: "Kiran Vadlapally", "Houghton, MI", text "open to relocation" (case-insensitive).
- 2.2 [PW] Links exist with exact hrefs: `mailto:vadlapallykiran@gmail.com` (query string allowed), `https://linkedin.com/in/kvadlapa`, `https://github.com/kvadlapa`.
- 2.3 [PW] Headline and Summary from the brief appear verbatim after whitespace normalisation. Headline in `#hero`, Summary in `#about`.
- 2.4 [PW] Every experience bullet and date range in the brief appears verbatim in its role.
- 2.5 [PW] DOM order in `#experience` is U3, U2, TP1, U1. Reversing the array in experience.ts does not change it.
- 2.6 [PW] Exactly one ACTIVE indicator in `#experience`, inside U3. TP1 has `data-variant="test-point"`.
- 2.7 [PW] Education strings and the certification name are visible. The SC-300 chip reads "verified credential" and carries a link only if a URL is set in profile.ts.
- 2.8 [PW] Each of the 26 skills from the brief is visible under its group. "query tuning, indexing, execution plans" is visible in Databases.
- 2.9 [PW] `#research` has 2 cards with exact titles and descriptions, each with a "● IN PROGRESS" chip. [SRC] research.ts type has optional `paperUrl` and `repoUrl`. A card renders a link only when set.
- 2.10 [PW] `#projects` shows at most 6 repo cards plus 2 research placeholder cards. Excluded repos from D13 never appear.
- 2.11 [SRC] projects.ts exports `featured`, `exclude`, `overrides`, `placeholders`. Test: a repo added to `exclude` disappears, and a repo moved to `featured[0]` renders first.
- 2.12 [DIST] Phone: no `tel:` anywhere and no `telephone` key in JSON-LD. Visible text and JSON-LD contain 0 matches of `(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}` and 0 matches of `\+91`.

### Section 3: Sections and signature moments
- 3.1 [PW] Top-level sections appear in the order given in section 3 above. Nav labels are exactly `/about /experience /projects /research /skills /contact`, in order, and each scrolls its target section into view with its heading not hidden behind the nav.
- 3.2 [PW] At 1440, after scrolling 2000px, nav `top` is 0 and computed `backdrop-filter` contains `blur`.
- 3.3 [PW] `[data-badge-state]` goes `scanning`, then `verifying`, then `granted`, reaching `granted` ≤2000ms after load. "VERIFYING…" and "● ACCESS GRANTED" each appear in sequence.
- 3.4 [PW] After `granted` the card shows role, stack, location and `"open_to_work": true`. [DIST] All of these are already in the served HTML.
- 3.5 [PW] Hero has 4 CTAs with accessible names Resume (or Request resume per D3), GitHub, LinkedIn, Email. They are clickable before `granted`.
- 3.6 [PW] Exactly one `svg[data-trace]`. At ≥768 wide: main path starts inside `#hero` box, ends inside the contact panel box, and has branches for about, experience, projects, research, skills, contact (≥6 `[data-branch]`).
- 3.7 [PW] Main path `stroke-dashoffset` strictly decreases across 5 increasing scroll samples and is ≤1 at page bottom. Its stroke is copper at start and patina at end.
- 3.8 [PW] `#about` contains the story in 3 or 4 sentences (count of `.`-terminated sentences in `[data-story]`) beside the keweenaw slot at ≥1024 (same row by box overlap).
- 3.9 [PW] Hover on a component (pointer: fine) sets `data-powered`, computed `box-shadow` is not `none`, and its `[data-branch]` changes stroke. Same via tap (mobile context) and keyboard focus. Tapping another component moves the state.
- 3.10 [PW] U3's LED has a running CSS animation. No other LED does.
- 3.11 [PW] On `pointer: fine`, mousemove over a project card changes its `--glow-x`/`--glow-y`. In a mobile context they never change. Tech tags are JetBrains Mono.
- 3.12 [PW] 2 research cards, each with a `[data-slot]` cover.
- 3.13 [PW] `#contact` has heading "Request access", a mailto link, GitHub, LinkedIn. Footer text is exactly "Built in Copper Country." The copy-email button is absent with JS disabled, and after click the clipboard equals the email.
- 3.14 [PW] Clicking the toggle changes `data-theme`, starts an animation or transition lasting ≤800ms, and updates the control's accessible state.

### Section 4: Images
- 4.1 [SRC] image-slots.ts has 5 slots with the brief's exact filenames, dimensions and prompts.
- 4.2 [PW] Fallback build: `[data-slot]` for hero, keweenaw, research-sql, research-cicd and section-texture all have `data-slot-state="fallback"`; 0 failed requests; 0 console errors.
- 4.3 [DIST] Fallback build logs one warning per missing slot and exits 0. No image preload in `<head>`.
- 4.4 [FIX] With all 5 PNGs: every slot has `data-slot-state="image"`; each `<picture>` has AVIF and WebP sources.
- 4.5 [FIX] Srcset widths are 480/768/1280/1920/2560/3840 for 3840px masters, and 480/768/1280/1920 for 2400px masters (no upscaling). Hero portrait source is 480/768/1280. Every image has a `sizes` attribute that is not the bare default.
- 4.6 [FIX] Hero: `fetchpriority="high"`, `loading` not lazy, matching `<link rel="preload" as="image">`, inline LQIP ≤2KB. All other slot images have `loading="lazy"`.
- 4.7 [FIX] At 375 wide, deviceScaleFactor 3, the requested hero image is portrait and ≤1280px wide; no response exceeds it. At 1920 DPR 1, the landscape source loads.
- 4.8 [FIX] No slot `.png` in `dist/`.
- 4.9 [PW] An overlay element exists over each image holding text, in both themes. Contrast covered by 1.11.
- 4.10 [PW] Texture layer computed opacity is 0.06-0.10.
- 4.11 [DIST] `dist/og-image.png` is exactly 1200×630. `og:image` is its absolute URL. Name and tagline are passed to the renderer [SRC]; the design reviewer confirms the render.
- 4.12 `npm run images` with no key exits 0 and prints the slot list without writing files. README lists all 5 filenames with dimensions and prompts.

### Section 5: Responsive
- 5.1 [PW] For every V in both themes: `documentElement.scrollWidth <= innerWidth`, at top and bottom of page and with menu open where it exists.
- 5.2 [PW] A full-page screenshot exists for every V in both themes (22 files) at `tests/screenshots/<theme>/<w>x<h>.png`, plus a menu-open shot at 320 and 375.
- 5.3 [SRC] ≥4 components (BoardComponent, ProjectCard, ResearchCard, PartGroup) use container queries. Spacing and type use `clamp()`.
- 5.4 [SRC] 0 matches for `(min-|max-)?width:\s*\d+px` with value >2, or `w-\[\d+px\]`, in `src/**/*.{astro,css}`, excluding `@media` and `@container` conditions.
- 5.5 [PW] At 1920, 2560, 3840: `[data-content]` width ≤1280px and centred (±1px). BoardGrid and trace SVG width equal the viewport width.
- 5.6 [PW] Below 768: hamburger visible, nav links hidden. Opening sets `aria-expanded="true"` and the menu fills the viewport. 20 Tab presses and 20 Shift+Tab presses stay inside. Esc closes it, `aria-expanded="false"`, focus returns to the hamburger. Choosing a link closes it and navigates.
- 5.7 [PW] Below 768: 0 `[data-branch]` rendered, main path is a single vertical line (all points' x within 1px).
- 5.8 [PW] At 375 and 1440: every visible `a, button, [tabindex="0"]` box is ≥44×44 px.
- 5.9 [DIST] Viewport meta has `viewport-fit=cover`. Built CSS has `env(safe-area-inset-` for nav, menu and footer, and `dvh` on hero and menu.
- 5.10 [PW] Above-fold, no scrolling and no waiting: at 320×568, 375×667, 768×1024, 1280×720 and 1920×1080, the bottoms of h1, tagline, headline and all 4 CTAs are ≤ viewport height. At ≥1024 the credential card is too. At 844×390, h1 and the Resume CTA are.

### Section 6: Tech and quality
- 6.1 [SRC] package.json has astro, tailwindcss ^4, typescript. `output` is static. No react, vue, svelte, preact or gsap.
- 6.2 [DIST] Total JS in `dist/` is ≤30KB gzipped.
- 6.3 [SRC] All 5 data files exist. No hardcoded resume facts in `.astro` files: the employer names return 0 matches in `src/components`. `npm run check` reports 0 errors.
- 6.4 [LH] Mobile preset, 3 runs against `serve dist`: median of each category ≥95; median LCP <2000ms; median CLS <0.05.
- 6.5 [PW] axe (WCAG 2 A/AA tags) has 0 violations in both themes at 375 and 1440.
- 6.6 [PW] Exactly one h1, no heading level skips, landmarks header, nav, main, footer present.
- 6.7 [PW] First Tab focuses a visible skip link; activating it moves focus to `main`. All interactive elements are reachable by Tab.
- 6.8 [PW] Every focusable element shows `outline-style: solid`, width ≥2px, in the accent token on keyboard focus. Every `<img>` has an `alt` attribute. Decorative images use `alt=""`, and SVG art is `aria-hidden`.
- 6.9 [PW] With `reducedMotion: 'reduce'`: on load the badge is `granted` immediately, trace offset is 0, 0 running animations from `document.getAnimations()`, LED static, toggle flip skipped, `scroll-behavior` is not smooth.
- 6.10 [PW] With JS disabled: all section text is visible, badge in final state, 0 elements hidden by a pre-animation class, theme follows the OS.
- 6.11 [DIST] Head has title, description (≤160 chars), canonical `https://kvadlapa.github.io/`, `og:title`, `og:description`, `og:image`, `og:url`, `twitter:card`.
- 6.12 [DIST] JSON-LD parses with `@type` Person and name, url, email, jobTitle, address, sameAs.
- 6.13 [DIST] `sitemap-index.xml` lists the site root. `robots.txt` allows all and names the sitemap. All favicon files in the tree exist and are linked.
- 6.14 [DIST] 0 case-insensitive matches of "lorem" and "TODO" in `dist/`. [SRC] Every T-item that touches data has a `// TODO(Kiran)` comment.

### Section 7: Deliverables
- 7.1 README has headings for local dev, editing content, adding/regenerating images, deploying to GitHub Pages, deploying to Vercel, and pre-launch TODOs.
- 7.2 deploy.yml triggers on push to `main` and `workflow_dispatch`, has `pages: write` and `id-token: write`, uses Node 24 and `npm ci`, passes `GITHUB_TOKEN` to build, and deploys via `actions/deploy-pages`. It parses as valid YAML.
- 7.3 From a clean copy with no `node_modules`, `dist` or `.env`: `npm ci && npm run build` exits 0.
- 7.4 Build resilience: `GH_API_BASE=http://127.0.0.1:9 npm run build` exits 0 and renders snapshot cards. Same against a local mock returning 403 with `x-ratelimit-remaining: 0`, a mock returning 500, and a mock returning `[]`.
- 7.5 Resume, absent: CTA reads "Request resume" with a mailto href, and no `.pdf` href exists anywhere in `dist`. [FIX] Present: CTA reads "Resume", href `/Kiran_Vadlapally_Resume.pdf`, returns 200.
- 7.6 Final run: production build, 6.4 report and 5.2 screenshots all come from the same final commit-state tree, with all ACs green.
- 7.7 After `test:fixtures`, `src/assets/images/` contains only `.gitkeep` and no fixture PDF remains in `public/`.

Not verifiable in this environment: live Pages deployment (no repo), and Safari/iOS rendering (Chrome only). Report these as open, not as passes.

## 5. Decisions

- **D1 Contact form vs mailto.** No form and no backend. The brief says mailto in section 3 item 7; "contact form" in item 2 means the contact panel, which is where the trace ends. The primary button is a mailto with subject "Access request". Add a small copy-email button for visitors with no mail client.
- **D2 TP1 position.** Strict reverse chronological by start date: U3, U2, TP1, U1. TP1 sits on the same trace as a smaller test-point variant, and it visibly accounts for time in the 2023-2025 window. Sort in code from `start` dates, so array order does not matter.
- **D3 Resume CTA.** `lib/resume.ts` checks for the PDF at build time. If present: a "Resume" link to the PDF. If absent: the same button reads "Request resume" and opens a mailto with subject "Resume request", and the build logs a warning. The next build after the PDF is added flips it with no code change.
- **D4 GitHub failure.** The build never fails on GitHub. 8s timeout. One retry on network or 5xx errors, no retry on 403/429. Any failure, or a 200 with no usable repos, uses the committed `github-snapshot.json` and logs a warning. Builds do not rewrite the snapshot; `npm run snapshot` does. `GITHUB_TOKEN` is optional and used when present. The base URL is overridable with `GH_API_BASE` for tests.
- **D5 "Pinned".** Pinned repos need GraphQL with a token, so skip it. Use the REST API plus the `featured` list in projects.ts as the pin mechanism. Ranking: `featured` order first, then fill to 6 by stars descending, then `pushed_at` descending. A featured repo missing from the API is dropped with a warning.
- **D6 Image slot detection.** `lib/images.ts` uses `import.meta.glob('/src/assets/images/*.png', { eager: true })` and looks slots up by filename. Nothing statically imports a PNG, so a missing file cannot break the build. `ImageSlot` renders `<Picture>` if found, else `SlotFallback`, and sets `data-slot-state`. An undersized master logs a warning and still ships without upscaling; a corrupt file fails the build loudly. Fixture tests generate PNGs with sharp, build to `dist-fixture`, and clean up in a `finally`. `glob` needs a literal path, so fixtures are copied into the real folder.
- **D7 Hero art direction.** `<Picture>` has no per-source media, so `HeroImage.astro` hand-builds `<picture>` using `getImage()`. Portrait is a 4:5 crop (1728×2160 from the master, widths 480/768/1280) below 768px. 9:16 would top out at 1215px and fail the 1280 width. `fallbackFormat` is WebP so no PNG ships.
- **D8 30-second recruiter test.** Yes, this constrains the fold. Who, what, where, availability and every way to act must be visible with no scroll and no wait (AC 5.10). Hero stack is name, tagline, headline, CTAs. On phones CTAs come before the card, as a 2×2 grid. The animation is decoration over content already in the HTML, it finishes within 2s, and it never gates CTAs. Summary is the first thing in `#about`, then story, education, cert.
- **D9 Education and certification placement.** No nav item exists for them, so they go in `#about`.
- **D10 Skills position.** Section 3 of the brief omits Skills but the nav lists it. Follow the nav: after Research, before Contact.
- **D11 Theme default.** Stored choice, then OS `light` gives light, otherwise dark. "Dark is the default" applies when the OS has no light preference.
- **D12 GSAP vs IntersectionObserver.** Plain rAF and IntersectionObserver. No GSAP, to hold the JS budget.
- **D13 Project curation.** Live data has 16 repos and all have 0 stars, so ranking cannot select. Initial `featured`, based only on language and name: `job-portal-springboot`, `springboot-microservices-main`, `smartbudget`, `iot-pipeline`, `RemoteRobotUI`, `robot_tracker`. Exclude `kvadlapa`, `-smartbudget`, `Mermaid-tester`, `kvadlapa.github.io`, `neetcode-submissions`, `Java`. Filter out forks, archived repos and size 0. Descriptions come only from GitHub or from Kiran's `overrides`. Nobody writes them from guesses, and a card with no description shows name, language and last-updated.
- **D14 TODO placeholders.** "TODO" never renders publicly. The two research cards show the title and "● IN PROGRESS", with no link until a URL exists. TODOs live in code comments and the README.
- **D15 Risky bullets.** The brief's bullets are the approved ceiling and ship verbatim, each with a `// TODO(Kiran)` where section 6 flags it. Nothing gets added, and no metrics are written in.
- **D16 Trace construction.** Generated at runtime from `data-trace-anchor` positions with a ResizeObserver, because page height varies by viewport. "Single trace" means one SVG with one main path and short branches. Static straight line without JS.
- **D17 Reduced motion and oxidation.** Oxidation is a colour change, not motion, so it stays scroll-linked. All movement stops and final states show at once.
- **D18 Test tooling.** Playwright uses `channel: 'chrome'`, with no browser download. Lighthouse and tests run against `serve dist`, not `astro preview`, because it compresses responses. Local dev runs on Node 23.11 and CI on Node 24 LTS.
- **D19 Git and image script.** The engineer does not `git init`, commit or push; that's for Kiran or a later instruction. `generate-images.ts` still ships, since the README needs a regeneration path. Only the no-key path is testable now. If the provider caps below target width, it upscales with sharp to slot dimensions and says so in its output.
- **D20 Light-mode accents.** Measured against paper #F4F1EA: copper 2.99:1, bright copper 2.06:1, patina 2.59:1, status green 1.57:1. All fail AA for text; ink 14.69 and muted 5.22 pass. All dark-mode values pass (≥5.59:1). DESIGN.md must supply darkened light-mode accents reaching ≥4.5:1 on both paper and #FFFFFF. If it doesn't, the engineer darkens them to that threshold and flags it to the designer. Section texture ships as one instance per page.

Out of scope: blog, analytics, custom 404, CMS, i18n, form backend, scheduled rebuilds, GraphQL pinned repos.

## 5a. Amendments after design review

These override the matching acceptance criteria and decisions above.

- **A1 (AC 1.6).** The test converts `color-mix()` output to sRGB or samples a pixel, and compares within ±1 per channel. In light mode the accent tokens are the corrected DESIGN.md values, not the brief's.
- **A2 (AC 3.3).** Run at widths ≥1024 only. Below that the badge sequence starts when the badge scrolls into view, because it may be off-screen at load. Below 1024, assert the sequence reaches `granted` within 2000ms of entering view.
- **A3 (AC 3.9 vs 5.7).** The `[data-branch]` clause of 3.9 applies only at ≥768. Below 768, assert `data-powered`, the box-shadow and the card edge light.
- **A4 (AC 5.9).** The hero uses `dvh` at ≥64rem and `svh` below, so mobile toolbars cannot resize the hero and rebuild the trace. The menu uses `dvh` at all widths.
- **A5 (components).** The hero fallback renders inside `CredentialCard`, not `HeroImage`, and `data-slot="hero"` goes on that SVG. AC 4.2 still applies. When `hero.png` exists, `HeroImage` renders the background image as planned.
- **A6 (hero height).** Hero height is capped at 67.5rem. AC 5.5 is unaffected: the grid and trace remain edge to edge.
- **A7 (status green).** `● IN PROGRESS`, `"open_to_work": true` and the SC-300 chip use the accent colour, never status green.
- **A8 (light grid).** Light `--grid` stays `#DCD6C8` for hairlines (AC 1.8). The ink-blue board grid uses the new `--board-line` token from DESIGN.md.
- **A9 (D20).** Resolved by DESIGN.md's corrected light-mode accents.
- **A10 (D13).** Project curation stays as listed, but no description may be invented. Cards with no description use the sparse layout from DESIGN.md and must still look intentional.

## 6. Content risks for Kiran (TODO)

Anything marked "blocks launch" needs an answer before the site goes public.

- [ ] **T1 Resume PDF and phone (blocks launch).** You said not to show your phone number, but resumes usually carry one. Publishing the PDF at a public URL would expose it. Remove it from the PDF and check the PDF metadata. No automated check covers this.
- [ ] **T2 SoftwareIDM disclosure (blocks launch).** Your brief says "no code, client names, or internal details", but these lines may cross that line. Check them against your employment agreement:
  - The named systems (CyberArk Privilege Cloud, HashiCorp Vault, Microsoft Intune, ServiceNow) could reveal the product roadmap or customer stack.
  - "Own the ServiceNow provider" and the redesign detail.
  - "production-only bugs (null references, serialization mismatches)" advertises defects.
  - "no dedicated QA on the team" is an internal team detail.
  - "Docker → Azure, released via Bitbucket Pipelines" is internal infrastructure.
  - Claude Code use and "client data and credentials kept out of prompts" describes internal tooling and data handling. Does your employer permit saying this publicly?
- [ ] **T3 Accenture and Antra details.** "production insurance onboarding platform" and "daily production reports" hint at a client's sector and systems. Check against your Accenture confidentiality terms. Confirm "enterprise clients" at Antra is fine to say.
- [ ] **T4 Project content (blocks launch quality).** All 16 repos have 0 stars and almost none have descriptions, so cards will show only name and language. Add descriptions on GitHub or in `overrides`, and confirm or replace the D13 list. Please check:
  - Coursework repos: is publishing them allowed?
  - `csharp-templates`: size 0 and updated during your current job. If it gets content, make sure none of it derives from work.
  - `kvadlapa` is about 600MB, about the same size as `RemoteRobotUI`. Likely duplicated or binary content.
  - `-smartbudget` is an empty duplicate of `smartbudget`.
- [ ] **T5 Deployment repo (blocks launch).** `kvadlapa.github.io` is not in your public repo list. Create it, set Pages source to GitHub Actions, and use `main`.
- [ ] **T6 "2.5+ years" claim.** Against your listed dates, as of Nov 2026: Accenture 14 months, Antra 6, SoftwareIDM 12, total about 32 months (2.67 years). True as a combined figure, excluding the TA role. Java is only about 14 months and C#/.NET about 18, so confirm you are comfortable if it is read per language. It reaches 3 years around Mar 2027; update it then.
- [ ] **T7 Job titles.** Confirm "Software Engineer" matches official titles, especially at Accenture, since background checks compare them.
- [ ] **T8 SC-300 "verified credential".** "Verified" implies proof. Provide a verification URL, and confirm the cert is current; Microsoft associate certs need renewal. No Microsoft badge artwork is used.
- [ ] **T9 Education dates.** Only "2025" is given for the M.S. and no year for the B.S. Provide if wanted. Accenture ends Aug 2023 and TP1 starts Aug 2024, leaving a gap of about 12 months on the board. If that's when your M.S. began, a start date would explain it; otherwise it stays unexplained.
- [ ] **T10 Work authorization.** Your brief covers on-site, remote and relocation but says nothing on work authorization, which is a common recruiter screen. It's left out because nothing was stated. Decide if you want a line.
- [ ] **T11 Skills without visible backing.** VB.NET, OAuth 2.0 / OpenID Connect, PostgreSQL and MySQL appear in Skills but in no experience bullet. Keep only what you can defend in an interview.
- [ ] **T12 Research disclosure.** Confirm titles and descriptions can be public (advisor, co-authors, unpublished work), and supply paper and repo URLs when ready.
- [ ] **T13 Metrics.** "cut response times" has no number. None will be invented; add a real figure only if you have one you may share.
- [ ] **T14 Course and institution names.** Confirm spelling of the three course names and "MLR Institute of Technology".
- [ ] **T15 LinkedIn URL.** Confirm `https://linkedin.com/in/kvadlapa` resolves.
- [ ] **T16 Public email.** The Gmail address will be plain text in the HTML and JSON-LD, so expect some spam.
- [ ] **T17 Images, when added.** Review generated PNGs for text, logos and faces. Keweenaw art is AI-generated, so its alt text must describe the scene and not claim to be a photograph. Re-run Lighthouse after adding them, because the LCP element becomes the hero image and the fallback score will no longer apply.
- [ ] **T18 Safari.** Testing is Chrome only. Check once on a real iPhone: notch insets, `dvh`, the menu.
