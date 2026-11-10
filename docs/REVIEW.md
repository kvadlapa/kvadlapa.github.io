# Design Review: Phase 2

Reviewer: UI/UX designer + overall reviewer. Baseline: `docs/DESIGN.md`, `BRIEF.md`, `docs/PLAN.md`.

**Method.** Built privately with `npx astro build --outDir dist-review` and served it on :4401, then removed it. Read all 26 test screenshots. Drove the site in Playwright on Chrome, in both themes, at 320, 375, 768, 844×390, 1024, 1440, 1920 and 3840:
- recorded badge state transitions;
- sampled the trace's dashoffset and `--oxidation` at each section;
- checked hover, tap and focus power-up, cursor glow, a mid-flip frame of the board flip, the mobile menu, reduced motion, and horizontal overflow.

Evidence crops are in `docs/review/`.

## Verdict

**Ships after the must-fix items.** The page reads as distinctive rather than a generic dark portfolio:
- the credential seated in the socket;
- one continuous trace that ends in J1 and flips the panel to ACCESS GRANTED;
- the routed Keweenaw outline;
- copper ageing into patina as you scroll.

The 30-second read works at every width: name, tagline, headline, location and four CTAs all paint on the first frame. Light mode is a true equal of dark, not an inverted afterthought.

What's holding it back from award level is a set of seams rather than concept problems:
- a hard edge under the hero on wide screens;
- one orphaned via;
- a cramped landscape hero;
- large empty areas inside the experience cards;
- thin project cards, which is a content problem.

### Verified working (no action)

| Behaviour | Result |
|---|---|
| Badge sequence | `scanning` 4ms → `verifying` 606ms → `granted` 1027ms (dark); 7 → 637 → 1057 (light). Matches spec ±50ms; well inside AC 3.3's 2s |
| Mask wipe and status | Name, CTAs and badge structure are static throughout |
| Oxidation | 0.16 / 0.30 / 0.58 / 0.74 / 0.92 / 1.00 at about / experience / projects / research / skills / bottom. Monotonic and quantised |
| Trace | Dashoffset decreases 6015 → 0, routes left rail → right rail → J1 as specified. Contact status `granted` at bottom |
| Power-up | Hover sets `data-powered` + box-shadow on exactly one component. Tap works on mobile; the left-edge light shows |
| Reduced motion | Badge `granted` on load, 0 running animations, trace offset 0px |
| Board flip | Reads as a physical board turning. Good |
| Mobile menu | All rows 340×56, footer links ≥44px tall, X sits where the hamburger was |
| Overflow at 375 | `scrollWidth` 375. Socket art is clipped by `#hero` as intended |
| Focus ring | Visible, copper, follows button radius |

The nav that looked displaced in some captures was `scroll-behavior: smooth` still animating when the screenshot fired, not a bug.

---

## Must-fix

### M1. Hero background seam: the board grid stops at the hero's bottom edge

Evidence: `review/01-hero-seam-1440.png`, `review/01-hero-seam-3840.png`.

**Problem.** Above the first section boundary the page is flat `--bg`. Below it, grid + texture + margin traces begin, giving a hard horizontal edge across the full width. At 3840 the left 40% of the hero is an empty slab next to a textured right half. The cause: `.hero-copy::before` (the scrim, `inset: … -100vw`) is opaque `--bg` and covers `.board-layer` (z −1).

**Fix**, in `src/components/Hero.astro`:
1. Add `<div class="hero-board" aria-hidden="true"></div>` as the first child of `section.hero`.
2. Style it `position:absolute; inset:0; z-index:1; pointer-events:none;` with exactly the `background-image`, `background-size`, `background-position` and `mask-image` of `.board-grid` in `BoardGrid.astro`. Move those four declarations into a shared global class `.board-grid-pattern` in `src/styles/global.css` and apply it to both elements, so they can't drift.
3. Set `.hero-grid { position: relative; z-index: 2; }`.

The grid then sits above the scrim but below the copy and badge. Keep the texture out of the hero.

**Check.** At 1440 and 3840, in both themes, grid lines run continuously from the nav to the footer.

### M2. Orphaned `/contact` via (rejects deviation 7)

Evidence: `review/02-contact-orphan-via.png`.

**Problem.** At ≥48rem every section label's via is on a lit trace except `/contact`. Its ring sits alone at the left while the trace drops down the middle of the same hairline. On a board an unconnected via reads as an error, and it is the last thing before the payoff.

**Fix**, in `src/scripts/trace.ts`:
1. Add a branch `data-branch="contact-label"` from the drop line to the via along the label's hairline: `M${drop.x} ${labelY} H${via.x}`, where `labelY` is the `/contact` `[data-trace-anchor="section"]` y and `via.x` is its x.
2. Draw a junction via (r 4) at `(drop.x, labelY)`.
3. Use the standard branch progress so it lights as the tip passes. The existing `contact` stub to J1 is unchanged.

Below 48rem nothing changes: the single line already passes through the via.

### M3. Landscape 844×390 hero: wrapped badge value and orphaned CTA

Evidence: `review/03-landscape-844.png`.

**Problem.** The badge's `stack` value breaks into `C#/.NET · Java ·` / `REST/SOAP`, and `Email` drops alone onto a second row.

**Fix:**
- `src/components/CredentialCard.astro`, inside the existing `@media (max-height: 30rem) and (orientation: landscape)`: make the row value element `white-space: nowrap`, and set the card's mono rows to `font-size: 0.75rem`.
- `src/components/CtaGroup.astro`, same media block: `.btn { min-height: 2.75rem; padding-inline: 0.875rem; font-size: 0.9375rem; }` and the group `gap: 0.5rem`.

All four buttons then fit in one row in the roughly 28rem copy column, and touch targets stay ≥44px.

### M4. Launch content (Kiran, not the engineer; tracked in PLAN T1 and T4)

- **Resume PDF is absent,** so the primary hero CTA is `Request resume` (a mailto). A recruiter's first click should open the resume. Drop `public/Kiran_Vadlapally_Resume.pdf` in (with the phone number removed, per T1). No code change needed.
- **Repo cards are name-only.** Six of eight project chips show just a name, language and date. It is the weakest moment of the 30-second scan for an engineer. Add one-line descriptions on GitHub or in `src/data/projects.ts` `overrides`. Do not have them written from guesses (D13).

---

## Should-fix

### S1. Experience cards are half empty at ≥64rem

Evidence: `review/05-experience-empty-right.png`.

At 1440 the bullets stop at 68ch, about 55% of the card, leaving a 500px dead band on the right of every IC. This is the most-read section.

In `src/components/BoardComponent.astro`, add a wide container layout:

```css
@container (min-width: 56rem) {
  /* on the component's root <article> */
  display: grid;
  grid-template-columns: minmax(14rem, 17rem) minmax(0, 1fr);
  column-gap: var(--s-7);
  align-items: start;

  .comp-head { grid-column: 1; grid-template-columns: 2.5rem minmax(0, 1fr); row-gap: var(--s-2); }
  .comp-meta { grid-column: 2; justify-items: start; text-align: start; }   /* dates + ACTIVE under the company */
  .bullets   { grid-column: 2; margin-top: 0; }
}
```

The left column then holds designator, role, company, dates and ACTIVE, and the right column holds the bullets. Keep the pins, notch and `pin` anchor where they are.

Below 56rem, keep the current stacked layout.

### S2. Texture reads as smoke, not patina, in dark mode

Evidence: `review/06-texture-smoke.png`.

At 8% the fractal noise reads as soft clouds across every section. That's my spec's fault, not the build's.
- `src/styles/tokens.css` dark: `--texture-opacity: 0.06`.
- Texture tile: change `baseFrequency=".008 .022"` to `".004 .03"`, giving longer horizontal streaks, closer to oxidised copper.

Light stays at 0.06.

### S3. Project chip footer wraps inconsistently

Evidence: `review/04-project-footer-wrap.png`.

On `robot_tracker` the `python` tag and `updated Apr 2025` stack onto two lines, while the other chips keep them on one, so the baselines don't align across the row.

In `src/components/ProjectCard.astro`:
- Move `<span class="silk updated">` out of `.chip-foot` into `.chip-top`, right-aligned in the slot freed by hiding the top-row language. This also resolves the duplicate-language concern behind deviation 4.
- `.chip-foot` then holds only tags (`flex-wrap: wrap`).
- Position `.die` absolutely at `right: var(--card-pad); bottom: var(--card-pad)` so it never takes inline space.

### S4. Trace start with `hero.png` present (rejects deviation 6)

The badge and its `data-trace-anchor="start"` pad render in both builds. Starting at the hero bottom leaves that pad orphaned (the same error as M2) and loses the "line leaves the credential" story. Keep the start at the badge pad in both states.

If the concern was the line running over the photo: below the badge the hero copy scrim doesn't reach, so give the trace's first segment `stroke: var(--accent)` at full opacity. It is one short 2px vertical segment and reads fine over a darkened photo.

### S5. Badge contact chip reads as a hamburger icon

Evidence: `review/07-badge-contact-chip.png`.

Three horizontal hairlines on a copper rectangle, next to a nav that has a hamburger, read as "menu". In `CredentialCard.astro` `.contact-chip`, redraw it as a smart-card contact: keep the 2.5rem × 1.875rem `--copper` body with `--r-1`, and draw a 2×3 cell grid in `--surface`. Use one vertical 1px line at 50% and two horizontal 1px lines at 33% and 67%, via two `linear-gradient`s or a tiny inline SVG.

---

## Polish

- **P1. Cursor glow is barely perceptible.** In `ProjectCard.astro`, raise the dark glow from 18% to 24% `--accent`; leave light at 12%. The border change currently carries the whole hover.
- **P2. Theme toggle affordance.** The icon is ambiguous to a first-time visitor. Add `title="Blueprint mode"` / `"Dark mode"` (matching `aria-label`) to the toggle button in `ThemeToggle.astro`.
- **P3. Copy: `Repository not yet public`.** Fine as is, but `Repository link pending` promises less if a repo never goes public. Kiran's call (PLAN T12).
- **P4. Socket proportions at desktop.** The footprint is about 1.6× the card's height, so pad rows sit about 6rem above and below the card but about 1rem to the sides. Acceptable, because it reads as a socket. If it bothers anyone later, compress the north and south pad rows in `src/lib/socket-art.ts` toward the card. Not needed for launch.

---

## Deviation verdicts

| # | Deviation | Verdict | Notes |
|---|---|---|---|
| 1 | LED halo pulse .1–.3 dark / .04–.12 light | **Accept** | The dot glyph keeps full `--status` contrast. Light halo is close to invisible, which is fine: on paper an LED shouldn't glow. Keep the steady dot |
| 2 | Light board grid centre strength 40% → 30% | **Accept** | Adds headroom for `#5A6670` over texture. The grid still reads as blueprint at the edges |
| 3 | Texture `sizes="100vw"` below 64rem | **Accept** | Correct, since phones must never pull the 3840 master. Also confirm `sizes` is not bare `100vw` at ≥64rem (AC 4.5 forbids the bare default) |
| 4 | Repo tags show language only; top-row language hidden | **Accept, with S3** | Honest given no topics. Move `updated` into the freed top-row slot per S3 |
| 5 | Focus ring without `border-radius: inherit` | **Accept** | Current Chrome, Safari and Firefox draw outlines along the border radius. Verified on buttons |
| 6 | With `hero.png`, trace starts at the hero bottom | **Reject** | See S4 |
| 7 | `/contact` label dot not connected on wide screens | **Reject** | See M2 |
| 8 | Engineer-written copy | **Accept** | See below |

**Copy (deviation 8):**
- **Headings:** "From Electrical Engineering to software", "Where I've worked", "Public repositories", "Current research", "Skills and tools". Plain, accurate, no overclaim. "Where I've worked" covers TP1, a TA role, which is reasonable.
- **About story:** three sentences, all facts from the brief, nothing added.
- **Meta description:** `Kiran Vadlapally, software engineer: C#/.NET and Java integrations, REST/SOAP APIs, identity and access systems. From copper traces to API connectors.` About 150 characters, factual.
- **Contact line** `Open to software engineering roles: on-site, remote, or relocation.` matches the brief.
- No invented metrics, employers or claims anywhere in `src/data`.

---

## Sign-off (final review, 2026-11-03)

**Method.** Rebuilt privately (`npx astro build --outDir dist-review`), served on :4401, then removed it. Read the 26 regenerated screenshots (timestamped 01:24). Ran live checks in Playwright on Chrome, in both themes, at 320, 375, 844×390, 1024, 1440 and 3840, with smooth scroll disabled so captures settle. No horizontal overflow at any of the 12 combinations.

| Item | Status | Evidence |
|---|---|---|
| M1 Hero seam | **Verified** | Grid runs continuously from nav to footer at 1440 and 3840, both themes. Left 40% of the 4K hero is no longer an empty slab. |
| M1 deviation: stacking order (photo −4, socket −3, scrim −2, grid −1, trace 0, copy/badge ≥1); hero grid starts at page top | **Accept** | It's the correct fix. `.hero-grid { z-index: 2 }` could not work against a pseudo-element scrim. Starting the layer at the page top keeps the 6rem major lines registered across the seam. |
| M2 `/contact` via connected | **Verified** | `data-branch="contact-label"` present at 1440 in both themes. Junction via sits where the drop crosses the hairline. |
| M2 deviation: `--bg` backing under the label text, trace runs beneath | **Accept** | Reads as a silkscreen label printed over a trace, which is how real boards look. No strike-through at 3× zoom. |
| M3 Landscape 844×390 | **Verified** | `stack` on one line; Resume / GitHub / LinkedIn / Email on one row in both themes. |
| M3 deviation: badge padding and key column tightened | **Accept** | Needed, as my values alone did not fit. Touch targets still ≥44px. |
| Item 10 (S4) Trace start with `hero.png` | **Verified (code)** | `route()` in `src/scripts/trace.ts` always starts at `[data-trace-anchor="start"]`, with no image-state branch. Not seen with a photo: fixture builds were not run, so the tester's `dist` stayed untouched. |
| S1 Experience two-column | **Verified** | Details column left, bullets right. Dead band gone at 1440 and 3840. 320 and 375 keep the stacked layout. |
| S2 Texture | **Verified** | Streaky, lower opacity. No longer reads as smoke. |
| S3 Project footer | **Verified** | `updated` in the top row, tags alone in the footer, die mark pinned. Baselines align across every row. |
| S5 Badge contact chip | **Verified** | Reads as a smart-card contact, not a menu icon. |
| P1 Cursor glow | **Verified** | Clearly visible on `pointer: fine`. |
| P2 Toggle tooltip | **Verified** | `title="Light mode (blueprint paper)"`. |
| New: ProjectCard container layouts (11rem, 22rem); ResearchCard (≥30rem) | **Accept** | ResearchCard puts the PAPER/REPO chips on the status row at ≥30rem. Tidier. |
| New: Research descriptions in sentence case | **Accept** | Matches the rest of the copy. |
| P3, P4 | Deferred to Kiran | As agreed. |

### Reopened (polish only, not blocking)

**R1. Doubled line along the `/contact` hairline.**

At 3× zoom, the 2px branch runs over the 1px hairline. Measured centres are 342.72 for the branch and 342.72 for the hairline (box 342.22 to 343.22). The line still reads as two tones beyond the label: the hairline's antialiased edge shows through.

Fix, in `src/components/SectionLabel.astro`:

```css
@media (min-width: 48rem) {
  .section-label[data-section="contact"] .hairline { background: transparent; }
}
```

The trace replaces the hairline there. Use the component's actual section attribute if it's named differently.

**R2. Sparse project chips feel tall on phones (content-dependent).**

At 320 and 375, single-column name-only chips keep `min-height: 13rem`, leaving about 8rem of empty card.

Fix, in `src/components/ProjectCard.astro`, inside the narrow container range (below the 22rem layout):

```css
.chip:not(:has(.description)) { min-height: 9rem; }
```

This becomes moot once Kiran adds descriptions.

### Overall verdict

**Ready to show recruiters once Kiran's content is in:**
- the resume PDF, with the phone number stripped (T1), which turns the primary CTA from "Request resume" into "Resume";
- one-line project descriptions (T4);
- optionally, the five photos, then a Lighthouse re-run (T17).

The page passes the 30-second test at every width, in both themes. It also holds up for an engineer who inspects it: a single continuous trace drawn from real DOM anchors, colour-space-aware oxidation, and full no-JS and reduced-motion end states.

The remaining design items, R1 and R2, are polish and do not block launch. Not covered here: Safari/iOS (PLAN T18) and the image-present build, which belongs to the tester's fixture run.
