# Copper Circuit: Design Spec

Source of truth: `BRIEF.md`. Scope and acceptance: `docs/PLAN.md`. This document owns how it looks and moves. Names used by PLAN's tests are used here verbatim (`--oxidation`, `[data-branch]`, `[data-badge-state]`, `data-powered`, `data-status`, `--glow-x/y`, `data-slot`, `data-trace-anchor`).

All sizes are in rem because AC 5.4 bans px widths above 2. Px values in brackets are explanations at the default root size. SVG art uses user units, which are not CSS widths.

All contrast figures were computed with the WCAG 2.x formula. All fallback and OG geometry below was prototyped and rendered in headless Chrome before being written down, in both themes where the art is themed. The hero, with its final scrim logic, was checked at 375, 768, 1024, 1280, 1920 and 3840.

---

## 1. Design rationale

**The 30-second read.** A recruiter gets name, tagline, role, stack, availability and four ways to act in the first paint, in plain language, with nothing to wait for. The theme is carried by the structure around the facts and never replaces a fact. If every effect failed, the page would still read as a clean, credible resume.

**What makes it distinctive** (a dark background with mono labels is not it):

1. **The metaphor does information-architecture work.** Reference designators are real labels: U3 is the current job, TP1 is a test point, DNP ("do not populate", a real PCB term) marks research links that do not exist yet. Empty states are in-world and honest, with no "coming soon".
2. **One continuous copper line.** A single trace leaves the credential, runs the whole page, and terminates in a connector on the contact panel. That arrival is what flips the panel to ACCESS GRANTED. The page has a beginning and an end.
3. **The credential sits in a socket.** The ID badge is mounted in a chip footprint, and the hero's traces fan out from it. The art is positioned from the badge, so the two stay registered at every width.
4. **Colour as time.** Copper ages through brass and sage into patina as you scroll, which is the Copper Country story without a word of copy.
5. **The Keweenaw routed as a PCB.** The About image is the real peninsula's outline with every edge snapped to 0°/45°/90°, the way a CAD tool routes copper. Nobody else's portfolio has this. It is better than a stock landscape, which is why the fallback does not read as a fallback.
6. **Restraint in motion.** Exactly one thing is scroll-driven. Text never fades in.

**Hierarchy of attention.** Name, then tagline, then CTAs, then badge, then trace. Copper is rationed: if everything glows, nothing is powered. At rest, the page is ink, silkscreen and a thin line.

**Avoid:**
- Neon cyan, purple gradients, gradient text, glassmorphism cards, particle fields.
- Matrix rain, typewriter effects, fake terminals, fake IDE chrome, "hacker" tone. This is an electrical engineer's board, not a movie's idea of hacking.
- Scroll-triggered fade-ins, parallax, scroll-jacking, preloaders, custom cursors.
- Skill bars, ratings, percentages, logo walls.
- Gating anything behind the auth sequence. It is a flourish over content already there.
- Green anywhere except the two status indicators, including checkmarks, success toasts and the SC-300 chip.
- Glow as a default state. Glow means powered, and it appears only on interaction.
- Silkscreen jokes in body copy. Labels carry theme; sentences stay professional.

---

## 2. Tokens

### 2.1 Final values

Put these in `src/styles/tokens.css`. `D` applies at `:root, [data-theme="dark"]`, `L` at `[data-theme="light"]`.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#0B1218` | `#F4F1EA` | Page |
| `--surface` | `#111C24` | `#FFFFFF` | Cards, badge, panels (always opaque) |
| `--surface-2` | `#16242E` | `#EAE5D9` | Raised (dark) or sunken (light): mono tag wells, hover |
| `--grid` | `#1C2A35` | `#DCD6C8` | Card hairlines, dividers. Brief values, AC 1.8 |
| `--board-line` | `#1C2A35` | `#CED3D4` | **New.** Board grid, schematic lines. Light value is ink-blue `#1F4A6E` at 18% on paper, solid, which delivers the brief's "ink-blue lines" |
| `--board-line-minor` | `#141F28` | `#DFE0DE` | **New.** Minor grid dots (ink-blue at 10%) |
| `--line-strong` | `#647480` | `#76818B` | **New.** Control borders, DNP dashes. ≥3:1 on bg and surface |
| `--text` | `#E8ECEF` | `#13202A` | Body, headings |
| `--silk` | `#C4CDD4` | `#1F4A6E` | **New.** Silkscreen labels, hero headline. Ink-blue in light |
| `--muted` | `#8C99A4` | `#5A6670` | Secondary text. Unchanged from the brief. See restrictions in 2.4 |
| `--copper` | `#C47A4A` | `#8E4E26` | **Light corrected** from `#C47A4A` |
| `--patina` | `#5FA39A` | `#1E6670` | **Light corrected** from `#5FA39A` |
| `--copper-hover` | `#E29A64` | `#74401D` | Hover. Brighter in dark, darker in light |
| `--patina-hover` | `#8CCFC4` | `#154C54` | **New.** Hover endpoint at full oxidation |
| `--on-accent` | `#0B1218` | `#FFFFFF` | Text on an accent fill |
| `--status` | `#3DDC97` | `#087443` | **Light corrected** from `#3DDC97`. Only `[data-status="active"]`, `[data-status="granted"]` |

Derived, interpolated tokens. Dark and light use **different colour spaces on purpose** (2.3):

```css
@property --oxidation { syntax: "<number>"; inherits: true; initial-value: 0; }

:root, [data-theme="dark"] {
  --accent:       color-mix(in oklch, var(--copper), var(--patina) calc(var(--oxidation) * 100%));
  --accent-hover: color-mix(in oklch, var(--copper-hover), var(--patina-hover) calc(var(--oxidation) * 100%));
}
[data-theme="light"] {
  --accent:       color-mix(in oklab, var(--copper), var(--patina) calc(var(--oxidation) * 100%));
  --accent-hover: color-mix(in oklab, var(--copper-hover), var(--patina-hover) calc(var(--oxidation) * 100%));
}
@supports not (color: color-mix(in oklch, red, blue)) {
  :root { --accent: var(--copper); --accent-hover: var(--copper-hover); }
}
```

Set `color-scheme: dark` / `light` per theme. `<meta name="theme-color">` is `#0B1218` / `#F4F1EA`, updated on toggle.

### 2.2 Contrast matrix (AA text needs ≥4.5)

"bg+texture" is bg with the patina texture at a worst-case 10% (dark) or 8% (light) flat. "bg+grid" is a grid line at its masked 40% strength (section 3.4). "nav" is the worst case under the blurred nav: `--bg` at 92% over a solid text-coloured pixel.

**Dark**

| Text | Value | bg | surface | surface-2 | bg+texture | bg+grid | nav |
|---|---|---|---|---|---|---|---|
| text | `#E8ECEF` | 15.87 | 14.54 | 13.33 | 14.02 | 14.52 | 13.34 |
| silk | `#C4CDD4` | 11.70 | 10.72 | 9.83 | 10.33 | 10.70 | 9.84 |
| muted | `#8C99A4` | 6.47 | 5.93 | 5.44 | 5.72 | 5.92 | 5.44 |
| copper | `#C47A4A` | 5.59 | 5.13 | 4.70 | 4.94 | 5.12 | 4.70 |
| patina | `#5FA39A` | 6.46 | 5.92 | 5.42 | 5.70 | 5.91 | 5.43 |
| copper-hover | `#E29A64` | 8.12 | 7.44 | 6.82 | 7.17 | 7.43 | 6.82 |
| patina-hover | `#8CCFC4` | 10.63 | 9.74 | 8.93 | 9.39 | 9.72 | 8.94 |
| status | `#3DDC97` | 10.67 | 9.78 | 8.96 | 9.42 | 9.76 | not used |

**Light**

| Text | Value | bg | surface | surface-2 | bg+texture | bg+grid | nav |
|---|---|---|---|---|---|---|---|
| ink | `#13202A` | 14.69 | 16.57 | 13.18 | 13.14 | 13.12 | 12.56 |
| silk | `#1F4A6E` | 8.23 | 9.28 | 7.38 | 7.36 | 7.35 | 7.03 |
| muted | `#5A6670` | 5.22 | 5.88 | 4.68 | 4.67 | 4.66 | **4.46, banned** |
| copper | `#8E4E26` | 5.70 | 6.43 | 5.11 | 5.10 | 5.09 | 4.87 |
| patina | `#1E6670` | 5.84 | 6.58 | 5.24 | 5.22 | 5.21 | 4.99 |
| copper-hover | `#74401D` | 7.47 | 8.42 | 6.70 | 6.68 | 6.67 | 6.38 |
| patina-hover | `#154C54` | 8.49 | 9.57 | 7.62 | 7.60 | 7.58 | 7.26 |
| status | `#087443` | 5.19 | 5.85 | 4.65 | 4.64 | 4.63 | not used |

**Brief values that failed, and the fix (all on paper / white):**

| Colour | Brief | Ratio | Corrected | Ratio |
|---|---|---|---|---|
| Copper as text | `#C47A4A` | 2.99 / 3.37 | `#8E4E26` | 5.70 / 6.43 |
| Bright copper hover | `#E29A64` | 2.06 / 2.32 | `#74401D` (hover goes darker on paper) | 7.47 / 8.42 |
| Patina as text | `#5FA39A` | 2.59 / 2.92 | `#1E6670` | 5.84 / 6.58 |
| Status green | `#3DDC97` | 1.57 / 1.77 | `#087443` | 5.19 / 5.85 |

**Checked and unchanged:** all dark values pass. Light muted `#5A6670` passes at 5.22 / 5.88 and stays, but it has only 0.16 of headroom on composites, so see 2.4.

**Non-text (≥3:1):** `--line-strong` is 3.91 / 3.58 dark, 3.52 / 3.97 light. `--accent` focus ring: ≥5.13 dark, ≥6.43 light on surface. `--grid` and `--board-line` are about 1.3:1 and purely decorative. No control may rely on them.

**Fills:** primary button text on `--accent` is `--on-accent`: ≥5.59 dark, ≥6.43 light. On `--accent-hover`: ≥8.12 dark, ≥8.42 light.

### 2.3 Why the copper-to-patina sweep always passes

The AA guarantee comes from choosing endpoints of nearly equal lightness, so the path cannot dip. Interpolating in a perceptual space keeps lightness linear between them. Verified by sampling 1,001 points along each path:

| Path | Space | bg | surface | surface-2 | bg+texture | bg+grid | nav |
|---|---|---|---|---|---|---|---|
| Dark accent | OKLCH | 5.59–6.46 | 5.13–5.92 | 4.70–5.42 | 4.94–5.70 | 5.12–5.91 | 4.70–5.43 |
| Dark hover | OKLCH | 8.12–10.63 | 7.44–9.74 | 6.82–8.93 | 7.17–9.39 | 7.43–9.72 | 6.82–8.94 |
| Light accent | OKLab | 5.70–5.84 | 6.43–6.58 | 5.11–5.24 | 5.10–5.22 | 5.09–5.21 | 4.87–4.99 |
| Light hover | OKLab | 7.47–8.49 | 8.42–9.57 | 6.70–7.62 | 6.68–7.60 | 6.67–7.58 | 6.38–7.26 |

The minimum sits at oxidation 0 in every row, so copper is the worst case and 4.70 is the floor for the entire site.

**Why two colour spaces.** Both were tested.
- Dark in OKLab goes through a dead khaki (`#9B9175`, chroma 0.04), and the page sits near that midpoint for a long stretch. OKLCH keeps chroma and passes through aged brass and sage: `#C47A4A → #AC8B40 → #8C9A57 → #6DA27A → #5FA39A`. It reads as metal ageing.
- Light in OKLCH goes through `#396A43`, only 0.039 OKLab distance from status green `#087443`. That would break the "green only for status" rule mid-page. OKLab goes through neutral inks instead (`#8E4E26 → #7A573E → #645E50 → #496261 → #1E6670`), minimum distance 0.093, and greyed ink suits blueprint paper. Dark OKLCH stays 0.158 from `#3DDC97`.

**Test note for AC 1.6.** Browsers serialise `color-mix()` as `oklch(...)` or `oklab(...)`. Convert to sRGB and compare within ±1 per channel, or sample a painted pixel.

**Trace gradient stops.** SVG gradients interpolate in sRGB, so use 5 explicit stops at 0/25/50/75/100% or the trace won't match `--accent`:
- Dark: `#C47A4A #AC8B40 #8C9A57 #6DA27A #5FA39A`
- Light: `#8E4E26 #7A573E #645E50 #496261 #1E6670`

### 2.4 Colour usage rules

- `--accent` as text: designators, section labels, links, mono tags. Allowed on any row above.
- Raw `--copper`/`--patina` are for fixed art only. All UI uses `--accent`.
- **Light `--muted` is banned in the nav and over hero art.** Nav links use `--text`, and the hero headline uses `--silk`.
- **Status colour** appears only on: U3's `● ACTIVE`, the badge's `● ACCESS GRANTED`, the contact panel's `● ACCESS GRANTED`. These are not status: `● IN PROGRESS` (`--accent`), `"open_to_work": true` (`true` in `--accent`), the SC-300 chip (`--accent`), any checkmark.
- Over art or an image, text may only sit in these scrim zones (5.2). In the 90% zone: `--text`, `--silk`, `--accent`. In the 80% zone: `--text`, `--silk` only. Accent fails there (4.35–4.42). Worst case with art or a `#808080` test image (AC 1.11):

| Scrim | Under | Dark text / silk / copper | Light ink / silk / copper |
|---|---|---|---|
| 90% | copper art (α≤.10) | 14.27 / 10.52 / 5.03 | 12.81 / 7.18 / 4.97 |
| 90% | `#808080` image | 14.31 / 10.55 / 5.04 | 13.26 / 7.43 / 5.15 |
| 80% | copper art (α≤.19) | 12.48 / 9.20 / 4.40 ✗ | 11.22 / 6.29 / 4.35 ✗ |
| 80% | `#808080` image | 12.54 / 9.25 / 4.42 ✗ | 11.88 / 6.66 / 4.61 |

---

## 3. Type, spacing, grid, silkscreen

### 3.1 Type

Fonts: Bricolage Grotesque 600/700 (variable, opsz), Instrument Sans 400/500, DM Mono 400/500, latin subsets, `font-display: swap`. Preload Bricolage Grotesque only: it paints the h1. Give each family a metric-matched fallback (`size-adjust` plus ascent and descent overrides computed from the font files with capsize or fontaine) so the swap cannot move layout.

| Token | Value | Line-height | Family, weight | Tracking |
|---|---|---|---|---|
| `--fs-name` | `clamp(2.75rem, 8vw, 6.5rem)` | 1.0 | Bricolage Grotesque 700 | -0.03em |
| `--fs-h2` | `clamp(1.75rem, 1.4rem + 1.75vw, 2.75rem)` | 1.1 | Bricolage Grotesque 600 | -0.015em |
| `--fs-h3` | `clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem)` | 1.2 | Bricolage Grotesque 600 | -0.01em |
| `--fs-lead` | `clamp(1.125rem, 1.05rem + 0.4vw, 1.375rem)` | 1.4 | Instrument Sans 500 | 0 |
| `--fs-body` | `clamp(1rem, 0.96rem + 0.2vw, 1.0625rem)` | 1.6 | Instrument Sans 400 | 0 |
| `--fs-small` | `0.875rem` | 1.5 | Instrument Sans 400 | 0 |
| `--fs-mono` | `0.8125rem` | 1.5 | DM Mono 400 | 0 |
| `--fs-label` | `0.75rem` | 1.3 | DM Mono 500 | 0.08em |

Rules: body measure `max-width: 68ch`. Nothing under 0.75rem. `text-wrap: balance` on h2, h3. `text-wrap: pretty` on paragraphs. Tabular numerals on dates (`font-variant-numeric: tabular-nums`).

Short landscape override: `@media (max-height: 30rem) and (orientation: landscape) { --fs-name: 2.75rem }`. AC 1.13 is unaffected.

### 3.2 Spacing

Base 0.25rem. Tokens: `--s-1 .25`, `--s-2 .5`, `--s-3 .75`, `--s-4 1`, `--s-5 1.5`, `--s-6 2`, `--s-7 3`, `--s-8 4`, `--s-9 6` (rem).

| Fluid token | Value | Meaning |
|---|---|---|
| `--gutter` | `clamp(1rem, 0.4rem + 3vw, 4rem)` | 16px at 320, 64px at 1920 |
| `--section-y` | `clamp(4.5rem, 3rem + 7vw, 10rem)` | Padding between sections. The trace crosses in this gap |
| `--card-pad` | `clamp(1.25rem, 1rem + 1vw, 2rem)` | Inner card padding |

Radii: `--r-1 .125rem` (tags, pads), `--r-2 .375rem` (cards, buttons), `--r-3 .75rem` (badge, contact panel). Boards are not bubbly: nothing larger, no pills, except circular vias and LEDs.

### 3.3 Containers

`[data-content]`: `width: min(100% - 2 * var(--gutter), 80rem); margin-inline: auto;`. Wrap the gutter with `max(var(--gutter), env(safe-area-inset-left))` and the right equivalent. Twelve columns, gap `clamp(1rem, 2vw, 2rem)`, only at ≥64rem.

### 3.4 Board grid

`BoardGrid.astro`: one `position: absolute; inset: 0; z-index: -1; overflow: hidden` layer on the page, viewport-wide always. Two children:

1. **Grid.** Pitch `--pitch: 1.5rem` (0.1" metaphor), major every 4 pitches (6rem).
   - Major: two `linear-gradient`s of `--board-line`, 1px, `background-size: 6rem 6rem`.
   - Minor: `radial-gradient(circle, var(--board-line-minor) 1px, transparent 1.5px)`, `background-size: 1.5rem 1.5rem`.
   - `background-position: 50% 0` on all layers, so the grid is symmetric at every width.
   - Strength mask: `mask-image: linear-gradient(90deg, #000 0, rgb(0 0 0 / .4) calc(50% - 40rem), rgb(0 0 0 / .4) calc(50% + 40rem), #000 100%)`. Below 1280 the whole grid sits at about 40%, so no text fights it. On large screens it strengthens toward the edges, which fills the space.
2. **Texture.** The single `section-texture` layer, `opacity: 0.08` dark, `0.06` light (AC 4.10). Cards are opaque, so it is only ever under `--bg`.

### 3.5 Silkscreen label

The section label is the site's most repeated detail. `SectionLabel.astro`:

```
● /experience ─────────────────────────────── 02
```

- Via: 0.625rem circle, 0.125rem ring in `--accent`, hollow center. Sits on the trace branch endpoint.
- Text: `--fs-label`, `--accent`, lowercase, exact strings from AC 3.1. A real `<h2>` follows beneath it. The label is a `<p>`, and the h2 carries the section's human title.
- Hairline: flex-grow 1px `--grid`.
- Index: `02`, `--fs-label`, `--muted`, tabular.

Other silkscreen uses:
- Designators (`U3`, `TP1`, `J1`): `--fs-label`, `--accent`, uppercase.
- Group labels (`BANK A · LANGUAGES`): `--fs-label`, `--silk`, uppercase.
- Image captions: `--fs-label`, `--muted`.
- Corner ticks on image frames: 0.75rem L-shaped ticks, 1px `--line-strong`, outside the corners.

---

## 4. Layout per breakpoint

Mobile first. Use `em`/`rem` media queries. Cards use container queries (AC 5.3) and do not read these breakpoints.

| Range | Name | Nav | Hero | Trace | Projects | Research | Skills |
|---|---|---|---|---|---|---|---|
| 20–29.9rem (320–479) | xs | Hamburger | Stack; CTA 2×2 | Single line | 1 | 1 | 1 |
| 30–47.9rem (480–767) | sm | Hamburger | Stack; CTA row | Single line | 2 | 1 | 2 |
| 48–55.9rem (768–895) | md | Inline | Stack; badge left, art to right | Routed | 2 | 2 | 2 |
| 56–63.9rem (896–1023) | md+ | Inline | 2-col | Routed | 2 | 2 | 2 |
| 64–89.9rem (1024–1439) | lg | Inline | 2-col | Routed | 2 at <72rem, then 4 | 2 | 3 |
| 90–119.9rem (1440–1919) | xl | Inline | 2-col | Routed | 4 | 2 | 3 |
| 120rem+ (1920–3840) | 2xl+ | Inline | 2-col; hero height caps | Routed + margins | 4 | 2 | 3 |

Projects deliberately skip 3 columns. PLAN caps the grid at 8 cards, which divides evenly by 1, 2 and 4 and leaves a hole at 3.

**320 (xs).** Gutter 1rem, content 288px. Rail at x = 0.5rem. "Vadlapally" at 44px fits. AC 5.10 budget at 568 tall: nav 56, pad 24, name 88, tagline 50, headline 88, location 20, CTA grid 104, gaps 42 = 472. The badge starts below the fold, with its top edge peeking where height allows.

**Landscape 844×390** (`max-height: 30rem and orientation: landscape`):
- Nav 3rem tall, inline links.
- Hero `min-height: auto`, padding-block `--s-5`, always 2-col: copy `1fr`, badge `18.75rem`, gap `--s-5`.
- Name on one line (remove the `<br>` with `display: none`) at 2.75rem. Tagline and headline `--fs-small`. CTA row wraps.
- Name and Resume are above the fold (AC 5.10). Badge rows use `--s-1` gaps and may run past the fold.
- Honour `env(safe-area-inset-left/right)`. The notch can be 47px, which `--gutter`'s `max()` handles.
- Landscape phones narrower than 48rem keep the hamburger, and the menu list goes to 2 columns.

**Large screens (1920 to 3840): full-bleed world, capped content.**
- `[data-content]` caps at 80rem and centers (AC 5.5).
- Edge to edge: BoardGrid, trace SVG, hero socket art (east fan runs to x=3400, enough for 3840), section margins below.
- Hero height: `min-height: clamp(36rem, 100dvh, 67.5rem)` at ≥64rem, so at 2160-tall displays the next section is visible and the name isn't marooned. Below 64rem use `svh`, so mobile toolbar collapse cannot resize the hero or trigger trace rebuilds. Menu uses `100dvh`.
- **Margin traces** at ≥100rem: two absolute strips filling the space outside the content (`width: calc(50% - 40rem - var(--gutter))`, left and right, right mirrored with `scaleX(-1)`), `background-repeat: repeat-y`, faded toward content with `mask-image: linear-gradient(90deg, #000 40%, transparent)`. Tile in 6.7.
- No type scale past 6.5rem and no rem scaling, per the brief's cap.

**No horizontal scroll:** `overflow-x: clip` on `.board`, `overflow: hidden` on `#hero`, because socket art is intentionally oversized.

---

## 5. Sections and components

### 5.1 Nav

- Sticky, `top: 0`, height 3.5rem plus `env(safe-area-inset-top)`, `z-index: 50`.
- Background `color-mix(in srgb, var(--bg) 92%, transparent)`, `backdrop-filter: blur(0.75rem) saturate(140%)`, 1px bottom border `--grid`. With no backdrop-filter support, solid `--bg`.
- Left: mini chip mark (favicon geometry, 1.5rem) + `kiran.v` in `--fs-label`, `--text`. Links to `#hero`.
- Right: six `--fs-label` lowercase links in `--text`, then toggle. Below 48rem the bar shows only toggle and hamburger, so there is one toggle at every width. Each link has `min-height: 2.75rem`, padding-inline `--s-2`. Current section: 0.125rem underline in `--accent`, set by IntersectionObserver with `aria-current="true"`. Colour is not the indicator.
- All sections: `scroll-margin-top: calc(3.5rem + var(--s-5))`.

**Full-screen menu (<48rem).** Hamburger: 2.75rem square button, two 0.125rem lines morphing to an X (lines, not three, for a schematic look), `aria-expanded`, `aria-controls`.
- `<dialog>` opened with `showModal()`, plus an explicit Tab wrap handler so Tab never leaves it (AC 5.6). Size `100vw × 100dvh`, solid `--bg` with the board grid. Padding includes all safe-area insets.
- Top row: brand left, close button right, in the same position as the hamburger so the X doesn't move.
- List: six rows, each `01  /about`. Index `--fs-label` `--muted`, label Bricolage Grotesque 600 `clamp(1.75rem, 8vw, 2.25rem)` `--text`. Row `min-height: 3.5rem`, 1px `--grid` divider. A 2px `--accent` vertical line runs at x = rail position, connecting vias at each row.
- Footer row: GitHub, LinkedIn, Email, each 2.75rem.
- Body scroll locked. On link click: close, then scroll. On close: focus returns to hamburger.

### 5.2 Hero

```
lg:   [ eyebrow / name / tagline / headline / CTAs ]      [ socket + badge ]
sm:   eyebrow / name / tagline / headline / CTAs / socket + badge
```

- `display: flex; align-items: center`. Copy column `minmax(0, 1fr)`, badge column `--badge-w: clamp(20rem, 30vw, 23.75rem)`, gap `--s-7`.
- Eyebrow: `/whoami`, silkscreen, `--accent`. Must stay in the 90% scrim zone.
- Name: `<h1>` Kiran / Vadlapally on two lines, `--text`. The LCP element in the fallback build.
- Tagline: `--fs-lead`, `--text`, margin-top `--s-5`.
- Headline: `--fs-body`, `--silk`, `max-width: min(34rem, 100% - 8rem)`, margin-top `--s-3`. This guarantees it stays in the 80% zone. On stacked layouts, `max-width: 34rem`.
- Location line directly under headline: `Houghton, MI · open to relocation`, `--fs-mono`, `--silk`.
- CTAs: margin-top `--s-6`. Resume is primary (fill), others secondary (`--surface` fill, opaque, 1px `--line-strong`, `--text`). Height 3rem, padding-inline `--s-5`, `--r-2`, Instrument Sans 500. <30rem: 2×2 grid. Secondary buttons that leave the site (GitHub, LinkedIn) carry a small 45° arrow icon.

**No element in hero copy has an entrance animation. Everything paints on the first frame.**

**Scrim** (`.hero-copy::before`, `z-index: -1`, behind copy, above art):
- ≥56rem: `inset: -100vh -3rem -100vh -100vw`; `background: linear-gradient(90deg, var(--bg) calc(100% - 29rem), <bg 90%> calc(100% - 19rem), <bg 80%> calc(100% - 11rem), transparent 100%)`, where `<bg N%>` is `color-mix(in srgb, var(--bg) N%, transparent)`.
- <56rem: `inset: -100vh -100vw -3rem`; `background: linear-gradient(180deg, var(--bg) calc(100% - 4rem), transparent 100%)`. The top must extend past the copy. The prototype at 768 showed art bleeding above it otherwise.
- Stops are anchored to the copy column and not to the viewport, so at 3840 the art around the badge is not dimmed.

**When `hero.png` exists:** it renders full-bleed in `HeroImage.astro` behind everything, and the socket art is not rendered. The scrim above is the overlay (AC 4.9). In light mode add `.hero-media { opacity: .28 }` so a dark photograph becomes a paper tint rather than a black band.

### 5.3 ID badge and authentication

**Structure** (`CredentialCard.astro`). A `.badge-slot` (`position: relative; width: var(--badge-w)`, 100% with `max-width: 23.75rem` when stacked) contains the socket art and the card.

Card: `--surface`, 1px `--line-strong`, `--r-3`, `--card-pad`, `overflow: hidden`, `position: relative; z-index: 1`. Fixed structure, top to bottom:

1. Lanyard slot: 2.75rem × 0.5rem, `--r-1`, `--bg` fill with 1px `--line-strong`, centered.
2. Header row: `CREDENTIAL` silkscreen left, contact chip right (2.5rem × 1.875rem, `--r-1`, `--copper` fill, 3 horizontal hairlines in `--surface`).
3. Monogram + name: `KV` in a 3rem square with 1px `--line-strong` (no photo; brief bans faces), then `Kiran Vadlapally` Bricolage Grotesque 600 1.125rem.
4. Status row (`min-height: 1.5rem`, all three strings stacked in one grid cell, only one visible).
5. 1px `--grid` divider.
6. Four rows in `--fs-mono`, key in `--muted`, value in `--text`:
   - `role` `Software Engineer`
   - `stack` `C#/.NET · Java · REST/SOAP`
   - `location` `Houghton, MI`
   - `"open_to_work": true`, literal JSON, `true` in `--accent`
7. A bottom-edge trace pad: 0.75rem × 0.375rem `--accent`, centered on the bottom border, `data-trace-anchor="start"`.

Every row's text is in the served HTML. Nothing changes size between states, so CLS is 0 by construction.

**Mechanism.** The badge's default HTML is `data-badge-state="granted"`, which is correct for no-JS and reduced motion. A small `is:inline` script immediately after the card:
- exits if `prefers-reduced-motion: reduce`;
- sets `data-badge-state="scanning"` synchronously, before first paint of that element;
- waits for the card to be ≥15% in view (IntersectionObserver), then runs the timers below.

Timers live in that inline script (no module, nothing to fail to load), so a stuck pending state isn't possible once it starts. `animation-play-state: paused` applies until in view.

**Sequence** (t = 0 when in view; on desktop that's the first frame):

| t (ms) | `data-badge-state` | What is seen |
|---|---|---|
| 0 | `scanning` | Status: `SCANNING…` `--muted`. Value text masked by bars (below). Scan line starts |
| 0–560 | `scanning` | Scan line: full-width, 0.125rem `--accent`, plus a 3rem tall trailing gradient (accent 18% to transparent). `transform: translateY` top to bottom of card, 560ms `cubic-bezier(.4,0,.6,1)` |
| 560 | `verifying` | Line fades over 120ms. Status swaps to `VERIFYING…` in `--muted`, dots step in via `steps(3)` over 420ms |
| 980 | `granted` | Status swaps to `● ACCESS GRANTED`, `--status`, `data-status="granted"`. LED scale 0.6 to 1, 200ms `--ease-out`. One-shot 1px ring on the card border in `--status` at 40% fading out over 400ms |
| 980–1500 | `granted` | Mask bars wipe off, staggered 60ms: role, stack, location, open_to_work. Each: `transform: scaleX(1 → 0)`, origin right, 240ms `--ease-out` |
| 1500 | `granted` | Done. No idle animation |

Total 1.5s, inside AC 3.3's 2s. The state strings are the `data-badge-state` values.

Mask bars: `::after` on each value, `background: var(--surface-2)`, `--r-1`, inset to the text's box. No opacity or visibility change on text, so nothing is hidden from AT, and the rows are selectable throughout. `aria-hidden` on the transient status strings; a visually hidden `Access granted` is permanently present. No `aria-live`.

**Separation from LCP.** Name, tagline and CTAs have no dependency on any of this. Badge text blocks are far smaller than the h1. CTAs are clickable from first paint (AC 3.5).

On phones the sequence starts on first scroll into view, so it isn't spent off-screen. AC 3.3 should therefore run at ≥1024 (see Report notes at the end).

### 5.4 Scroll-drawn trace

One `svg[data-trace]` inside `<main>` (`position: relative`). SVG is `position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: hidden; z-index: 0`, no viewBox, so 1 unit = 1 CSS px. Content sits at `z-index: 1`. It's `aria-hidden`.

**Before JS, or without it:** a CSS 0.125rem line at the rail x, `--accent` gradient, on `main::before`. `.trace-ready` hides it. Absolutely positioned, so swapping it causes no shift.

**Anchors, never hard-coded positions.** `data-trace-anchor` values:

| Value | Element | Purpose |
|---|---|---|
| `start` | Badge bottom pad | Origin |
| `rail-l`, `rail-r` | Zero-size elements in `[data-content]` at `left: calc(var(--gutter) / -2)` and mirror | Rail x. Survives safe-area and gutter changes. On mobile only `rail-l` is used |
| `gap` | Zero-height markers at section boundaries: after hero, after projects, after skills | y of crossings |
| `section` | Each `SectionLabel` via | Branch endpoints |
| `pin` | West pin of each experience component | Component stubs |
| `end` | Contact panel top pad (J1) | Terminus |

**Rebuild triggers:** `ResizeObserver` on `<main>` (coalesced to one rAF), `document.fonts.ready`, and a change across the 48rem query. Never on scroll. Rebuild measures all anchors with `getBoundingClientRect` + scroll offset relative to `main`, writes `d`, recomputes the lookup. The SVG is absolute, so a rebuild cannot change `main`'s size and cannot loop. Section height changes, image swaps and font loads all flow through automatically.

**Route at ≥48rem.** Turns are always 45° chamfers with `c = 1.5rem`. Polyline, `stroke-linejoin: round`.

1. `start` straight down to `gap[after-hero].y - c`.
2. Chamfer, then run west along the gap to `rail-l.x + c`, then chamfer and go down `rail-l`.
3. Down `rail-l` through about, experience, projects.
4. At `gap[after-projects]`: chamfer, run east across the board, chamfer, down `rail-r`. The crossing sits in `--section-y` padding, so it never crosses content.
5. Down `rail-r` through research, skills.
6. At `gap[after-skills]`: chamfer, run west to `end.x + c`, chamfer, straight down into `end`.

**Branches** (`[data-branch]`, separate `path`s, ≥6):
- about, experience, projects: horizontal from `rail-l` to the section's via. Label sits at content left, so the stub is short.
- research, skills: from `rail-r` west to the section's index end. On the right rail, `data-trace-anchor="section"` is on the hairline's right end, not the left via.
- contact: the terminal drop itself gets `data-branch="contact"`, a short final segment to J1.
- Each experience component: from `rail-l` to its `pin`, `data-branch="component-U3"` etc.

Each junction on the rail gets a 0.25rem-radius via, filled `--accent` once the tip passes.

**Route at <48rem.** `M rail-l.x start.y V end.y`, x constant to within 1px. `start` on mobile is the y-center of the badge. No `[data-branch]` nodes exist in the DOM (AC 5.7). Section vias stay as plain circles on the line, radius 0.1875rem. At 320 the rail is at x = 8px in the 16px gutter.

**Layers:**
| Layer | Stroke | Notes |
|---|---|---|
| `.trace-bed` | `--board-line`, 2px | Same `d`. Etched channel, always fully visible |
| `.trace-live` | `url(#trace-grad)`, 2px, `stroke-linecap: round` | Dash-drawn. `userSpaceOnUse`, y 0 to full height, 5 stops (2.3) |
| Branches | Bed as above; live with own dash | Unpowered component stubs stay bed-coloured |
| `.trace-tip` | Circle r 4 `--accent-hover`, halo r 10 at 25% | Moved by `transform`. No filters, no `drop-shadow` on any trace |

**Scroll mapping** (`scroll.ts`, a single rAF loop on passive scroll):

```
p        = clamp(scrollY / (docHeight - vh), 0, 1)
--oxidation = round(p * 50) / 50       // write only if changed
tipY     = scrollY + vh * (0.62 + 0.38 * p ** 4)
L        = lookup(tipY)                // piecewise-linear table built at rebuild
dashoffset = totalLength - L
```

Lookup: at rebuild, walk the polyline recording `[y, cumulativeLength]` at each vertex. A horizontal leg at height y spans no y, so give it two table entries, `[y - 1rem, lengthAtLegStart]` and `[y + 1rem, lengthAtLegEnd]`, and the crossing draws over 2rem of scroll instead of snapping. `p⁴` guarantees the tip reaches `end` at max scroll whatever the page height, so `dashoffset` reaches 0 (AC 3.7). `tipY` rises monotonically with scroll, so `dashoffset` never increases as you scroll down.

Branch progress: `clamp((tipY - branch.y) / 10rem, 0, 1)`, applied to its dash. Tip position: `getPointAtLength(L)` once per frame. `pathLength` is not used, to keep lookup and dash in the same units.

**Budget:** under 4ms script per frame. No `will-change` on the SVG (a 3840 × 8000 layer is too expensive); repaints are limited to the path's bounds.

**Contact trigger:** when `p ≥ 0.985` or `L ≥ total - 2`, set the contact status to granted (5.10). One way only; scrolling back does not revoke it.

### 5.5 About

≥64rem: two columns, text 6 cols, image 6 cols, `align-items: start`. Below: text first, image second.

Order per PLAN D8: Summary (`--fs-lead`), story (3–4 sentences, `[data-story]`, `--fs-body`), then a two-row "parts" list:

```
EDU   M.S. Computer Science, Michigan Tech, 2025
EDU   B.S. Electrical Engineering, MLR Institute of Technology, Hyderabad
```

Designator `--fs-label` `--accent`, text `--fs-small` `--text`, rows separated by 1px `--grid`.

SC-300 chip: inline-flex, 1px `--accent` border, `--r-1`, `--s-2 --s-3` padding, an inline SVG shield-check (stroke `--accent`, never green), `Microsoft Certified: Identity and Access Administrator Associate (SC-300)` in `--fs-small`, then `verified credential` in `--fs-label` `--accent`. It wraps to two lines below 30rem. Link only if a URL exists (AC 2.7); then min-height 2.75rem.

Keweenaw frame: aspect-ratio 16 / 10, `--r-2`, 1px `--grid`, corner ticks outside. Caption beneath: `47.12°N 88.57°W · Houghton, in the Keweenaw`. Container `overflow: hidden`.

### 5.6 Experience: components

`BoardComponent.astro`, order U3, U2, TP1, U1 (PLAN D2), single column, gap `--s-5`. `container-type: inline-size`.

**IC variant (U-n):**
- `<article tabindex="0" aria-labelledby=…>`, `--surface`, 1px `--grid`, `--r-2`, padding `--card-pad`, `position: relative`.
- **Notch:** a 2rem × 0.75rem semi-ellipse in `--bg` at top-center, 1px `--grid` stroke. Real IC orientation mark. Inline SVG, absolutely positioned on the top border.
- **Pins:** 0.375rem wide strip outside both side edges, `repeating-linear-gradient(180deg, <pin> 0 .5rem, transparent .5rem 1.25rem)`, height matches card, `<pin>` is `--line-strong`. West strip is `data-trace-anchor="pin"` at the header row y. Hidden <30rem (no gutter space); there the left border is used.
- **Header**, `@container (min-width: 36rem)` one row, otherwise stacked:
  - `U3` designator
  - Role `--fs-h3` `--text`
  - Company, location `--fs-small` `--text`
  - Dates `--fs-mono` `--muted`, pushed right
  - Status: U3 only: `● ACTIVE`, `--fs-label` `--status`, `[data-status="active"]`
- **Bullets:** `--fs-body`, `--text`, marker is a 0.25rem square in `--accent` (a pad, not a dot). `max-width: 68ch`.

**ACTIVE LED:** 0.5rem circle `--status`. Halo `::after` same colour, scale 2.2, `opacity` loop .15 to .45, 2.4s `ease-in-out` infinite. Only opacity animates. It is the sole infinite animation on the page. Reduced motion: halo at fixed .3.

**TP variant (`data-variant="test-point"`):**
- Indented `margin-inline-start: clamp(0rem, 4vw, 3rem)`, slightly smaller: `--fs-small` bullets, no notch, no pins.
- A 1rem round test-pad ring replaces the IC body cue: circle, 0.125rem `--accent` border, sits on the west edge. The stub ends in this ring.
- Dashed 1px `--grid` border. `TP1` designator. It reads as a probe point on the same line: academic, not employment.

**Powered state** (`data-powered`):
- Triggers: `(hover: hover)` mouseenter; `:focus-visible`/focus; tap toggles and moves it. One at a time. Mouseleave and blur clear it, unless set by tap.
- Border `--accent`.
- `box-shadow: 0 0 0 1px var(--accent), 0 0 2rem -0.5rem color-mix(in srgb, var(--accent) 45%, transparent)`. Light theme uses `0 0 0 1px var(--accent), 0 0.5rem 1.5rem -0.75rem color-mix(in srgb, var(--accent) 40%, transparent)`. Paper doesn't glow.
- Pins change to `--accent`.
- Its `[data-branch]` stroke goes to `--accent`, 3px. A short dash runs from rail to pin: `stroke-dashoffset` 240ms `--ease-out`.
- Designator to `--accent-hover`.
- Content never changes and nothing moves, so no layout risk.

At <48rem there are no branches, so the card's 0.1875rem left edge lights up in `--accent` instead (`::before`, `scaleY(0→1)` from the top, 240ms). AC 3.9's `[data-branch]` clause applies ≥48rem only (Report notes).

### 5.7 Projects: chips

`ProjectCard.astro`, `container-type: inline-size`. Grid per section 4, gap `--s-5`, `align-items: stretch`.

- Body: `--surface`, 1px `--grid`, `--r-2`, `--card-pad`, `position: relative; overflow: hidden`, `min-height: 13rem`, flex column.
- Chip marks: pin-1 dot (0.375rem circle `--line-strong`) top-left. Beveled top-left corner: a 1rem absolute inline SVG, triangle in `--bg` with a 1px `--grid` diagonal. Do not use `clip-path` on the card, since it would clip the focus ring and border highlight.
- Top row: `Q1`…`Q8` designator; right: language in `--fs-label` `--muted`.
- Title: repo name, DM Mono 500 1rem, `--text`, `overflow-wrap: anywhere`. Is an `<a>`, `display: inline-flex; min-height: 2.75rem; align-items: center`, with `::after { position: absolute; inset: 0 }` covering the card.
- Description: `--fs-small`, `--muted`, 3-line clamp.
- Footer pinned to the bottom (`margin-top: auto`): mono tags. Each `--fs-label` lowercase, `--accent`, `--surface-2` fill, `--r-1`, padding `.125rem .375rem`. `updated Mon YYYY` in `--fs-label` `--muted`.
- **Sparse card (no description, per D13):** omit the paragraph and let the top row, title and footer distribute. Add the die mark: a 2.5rem square outline, 1px `--grid`, at bottom-right, so the card is intentional at `min-height`. Show `updated` date.

**Cursor glow.** `@media (hover: hover) and (pointer: fine)`. `::before`, `inset: 0`, `background: radial-gradient(15rem circle at var(--glow-x) var(--glow-y), color-mix(in srgb, var(--accent) 18%, transparent), transparent 70%)`, `opacity: 0` → 1 on hover, 200ms. `pointermove` writes px values in one rAF, for the hovered card only. Light uses 12%. On touch: tap gets border `--accent` as `:active`.

Below the grid: `All repositories on GitHub` secondary link.

### 5.8 Research

`ResearchCard.astro`, two cards, `container-type: inline-size`. `--surface`, 1px `--grid`, `--r-2`, overflow hidden.

- Cover: aspect-ratio 3 / 2, `[data-slot]`, no text over it, so no overlay is needed. 1px bottom `--grid`.
- Body, `--card-pad`:
  - `● IN PROGRESS` chip: `--fs-label`, `--accent`, 1px `--accent` border, `--r-1`. Not green.
  - Title `--fs-h3`, description `--fs-body` `--muted`.
  - Link slots row, one per paper/repo (5 below in 8).

### 5.9 Skills: parts

Six banks, `PartGroup.astro`, `container-type: inline-size`, `border-top: 1px solid var(--grid)`, padding-top `--s-4`.

- Header `BANK A · LANGUAGES`, A–F in brief order.
- Parts: flex-wrap, gap `--s-2`.
- Databases: note `query tuning, indexing, execution plans` in `--fs-small` `--muted` beneath its parts.

Part `[data-part]`: an SMD resistor. `inline-flex`, `min-height: 2rem`, `--fs-mono`, `--text`, `--surface` body, 1px `--grid`, `--r-1`, padding-inline `--s-3`. End caps: `::before`/`::after`, each 0.375rem wide full height, `--accent` at 70%, flush at the ends. `@container (min-width: 28rem)` raises part height to 2.25rem.

Non-interactive: not focusable, no pointer cursor. Hover (`hover: hover`) only strengthens end caps to 100% in 120ms. No ratings, no ordering by "strength".

### 5.10 Contact: Request access

Panel: `--surface`, 1px `--line-strong`, `--r-3`, `--card-pad × 1.5`, max-width 56rem, centered, `position: relative`. Top border center: J1 connector: 3rem × 0.75rem `--accent` outline with 4 pads, `data-trace-anchor="end"`.

≥48rem, 2 columns:
- Left: `J1 · REQUEST ACCESS` designator. `<h2>Request access</h2>`. Line: "Open to software engineering roles: on-site, remote, or relocation." Status row.
- Right: credential-style rows, same mono form as the badge, each row a link ≥2.75rem tall:
  - `email` vadlapallykiran@gmail.com
  - `linkedin` /in/kvadlapa
  - `github` /kvadlapa
- Below both, full width at <48rem: primary button `Request access` (mailto, subject "Access request"). Copy-email secondary icon button beside it, JS-only, inserted by `copy-email.ts`. Label swaps to `Copied` for 1.6s, polite live region. Not green.

**Status row, the page's payoff.** Default HTML: `● ACCESS GRANTED`, `[data-status="granted"]`. With JS and no reduced motion, `scroll.ts` sets `data-status="pending"` at init: `○ LINK PENDING`, `--muted`, and flips to granted when the trace lands: same LED pop as the badge, plus J1 pads fill `--accent` in 200ms. Both strings stacked in one grid cell, so no shift.

Footer: `Built in Copper Country.` `--fs-label`, `--muted`, centered, padding-bottom includes `env(safe-area-inset-bottom)`.

### 5.11 Theme toggle: board flip

Button 2.75rem square, `aria-label="Light mode"`, `aria-pressed` reflects light on. Icon: 1.5rem × 1rem board, front face copper trace on `--surface`, back face ink lines on paper, both inline SVG with `backface-visibility: hidden`. `rotateY(180deg)` on toggle, 560ms.

**Page flip.** If `document.startViewTransition` exists and motion is allowed:

```css
::view-transition { background: #05090D; }
::view-transition-group(root) { animation: none; }
::view-transition-image-pair(root) { perspective: 100rem; isolation: auto; }
::view-transition-old(root) { animation: flip-out 260ms cubic-bezier(.55,0,.8,.3) both; mix-blend-mode: normal; backface-visibility: hidden; }
::view-transition-new(root) { animation: flip-in 300ms cubic-bezier(.2,.7,.2,1) 260ms both; mix-blend-mode: normal; backface-visibility: hidden; }
@keyframes flip-out { to { transform: rotateY(-90deg); } }
@keyframes flip-in  { from { transform: rotateY(90deg); } }
```

Total 560ms, inside AC 3.14's 800ms. `#05090D` is the board edge seen mid-flip in both directions. Pivot is the viewport center. Scroll position is unchanged. The badge sequence doesn't replay, since no DOM is rebuilt.

No View Transitions or reduced motion: instant swap, and only the icon rotates (when motion is allowed). Do not add a global colour transition; it would run on every element and cost INP.

---

## 6. Fallback art specs

These ship. All are inline SVG through `SlotFallback.astro`, except texture, and are `aria-hidden` (AC 6.8).

**Rules for all:**
- `data-slot="<name>" data-slot-state="fallback"`.
- **Every `id` is prefixed with the slot name.** Duplicate gradient or pattern IDs resolve to the first in the document and silently take the wrong theme's colours (reproduced in prototyping).
- Colours through these art variables, so art follows the theme:

| Var | Dark | Light |
|---|---|---|
| `--a` | `var(--copper)` | `var(--copper)` |
| `--a2` | `var(--copper-hover)` | `var(--copper-hover)` |
| `--b` | `var(--patina)` | `var(--patina)` |
| `--art-line` | `#1C2A35` | `#CED3D4` |
| `--art-bg` | `var(--bg)` | `var(--bg)` |
| `--art-land` | `#111C24` | `#FFFFFF` |

- No `<filter>` except the texture tile. Blur effects are faked with radial gradients. No `<text>`.
- Fixed `--a`, not `--accent`: art does not oxidize, so it doesn't repaint on scroll.

### 6.1 `hero`: the socket

**Placement is the key decision.** A full-bleed `slice` background only lines up with the badge at one viewport. Instead the SVG is a child of `.badge-slot`, centered on the badge, sized from it, overflowing to the edges of `#hero`. It stays seated at every width, stacked or not.

```css
.socket-art { position: absolute; left: 50%; top: 50%; width: 112%; transform: translate(-50%, -50%); overflow: visible; z-index: 0; }
```

`viewBox="1040 230 340 440"`: the viewBox is just the footprint, and everything else is overflow. `#hero { overflow: hidden }` clips it. Geometry (user units, `stroke-width: 5`, `stroke-linejoin: round`, `fill: none`, stroke `--a`):

```
West fan, i = 0..14:  off = i - 7;  y0 = 258 + 28i;  y1 = 450 + 16off
  x1 = 1000 - 6|off|;  x2 = x1 - |y0 - y1|
  xend = [860,640,760,520,700,590,430,360,470,610,540,720,660,800,880][i]
  path: M1040 y0 H x1 L x2 y1 H xend
  via at (xend, y1)
  |off| ≤ 4 → front group; otherwise mid group

East fan, i = 0..14:  off = i - 7;  y0 = 258 + 28i;  y1 = 450 + 76off
  x1 = 1400 + 4|off|;  x2 = x1 + |y0 - y1|
  path: M1380 y0 H x1 L x2 y1 H3400        (mid group)

North fan, i = 0..10: off = i - 5;  a = |off|;  x0 = 1070 + 28i
  y1 = 200 - 4a;  y2 = y1 - 30a
  path: M x0 230 V y1 L (x0 + 30off) y2 V-420   (mid group)

South fan, same i:    y1 = 700 + 4a;  y2 = y1 + 30a
  path: M x0 670 V y1 L (x0 + 30off) y2 V1320   (mid group)

Pads, fill --a2, opacity .8, rx 2:
  West: rect x=1038 y=y0-6 w=28 h=12;  East: rect x=1354 y=y0-6 w=28 h=12   (for each y0)
  North: rect x=x0-6 y=228 w=12 h=28;  South: rect x=x0-6 y=644 w=12 h=28   (for each x0)
```

Paint order:
1. Glow rect `x=500 y=-300 w=1500 h=1500`: radial `cx=1210 cy=450 r=620 userSpaceOnUse`, stops `--a` at .24 / .07 (55%) / 0.
2. Patina glow rect `x=1100 y=-400 w=1000 h=900`: radial `cx=1560 cy=60 r=360`, `--b` .16 to 0.
3. Traces group, masked: mid group `opacity .42`, front group `opacity .95`. One `<path>` per group with all subpaths concatenated, to keep the DOM small.
4. Vias, same mask: circle r 6 `--a` opacity .85, inner circle r 2.5 `--art-bg`.
5. Pads, unmasked.
6. Bokeh, three circles with a radial fill (`--a`: .22 at 78%, .12 at 94%, 0 at 100%): `(1530,760) r96`, `(1400,830) r58`, `(1600,600) r44` at opacity .7. These fake the depth of field the brief's photo prompt asks for.

Mask: `maskUnits="userSpaceOnUse" x=-400 y=-500 width=4000 height=1900`, a rect of a horizontal gradient `x1=620 x2=1000`, white 0 to 1. West traces dissolve before reaching the text.

Result about 7KB, about 2KB gzipped. The h1 stays the LCP element, since inline vector paths aren't LCP candidates and there's no image request. At 112% of badge width, the pads and pad row show about 1rem beyond the card on each side.

### 6.2 `keweenaw`: the peninsula, routed

`viewBox="0 0 1600 900"`, `preserveAspectRatio="xMidYMid slice"`, in a 16/10 frame.

The outline is the real coastline, projected (x = (lon + 89.7) × 612, y = (47.6 − lat) × 900), snapped to a 10-unit grid, each edge routed as a 45° leg plus a straight leg. Land path, literal:

```
M-120 900 0 780 0 760 100 660 240 660 300 600 340 600 400 540 440 540 530 450 540 450 580 410 650 340 730 260 750 260 840 170 860 170 900 130 940 130 950 120 1040 120 1110 120 1120 130 1160 130 1190 160 1220 160 1190 190 1190 210 1180 200 1070 200 1010 260 1010 270 950 330 940 330 890 380 890 400 830 460 830 470 780 520 780 540 760 560 760 630 750 640 750 740 770 720 780 720 810 690 810 660 890 580 940 580 920 600 920 650 910 660 910 700 980 630 1040 630 1090 680 1190 680 1280 770 1350 770 1430 850 1430 920 1590 1080 1650 1080 1650 1170 -120 1170Z
```

Portage Canal, literal:

```
M650 340 660 350 660 390 690 420 690 430 700 440 720 440 760 480 760 490 780 510 790 510
```

Paint order:
1. Rect `--art-bg`.
2. Lake dots: pattern 40×40, circle at (20,20) r 1.4 `--art-line`.
3. Depth contours. The land path stroked with `stroke-linejoin: bevel`, in pairs (line, then erase):
   - `--b` opacity .20 width 184, then `--art-bg` width 180
   - `--b` opacity .30 width 124, then `--art-bg` width 120
   - `--b` opacity .45 width 64, then `--art-bg` width 60
4. Land: fill hatch pattern (12×12, `patternTransform="rotate(45)"`, `--art-land` rect, `M0 0H12` stroke `--a` opacity .5 width 2), stroke `--a` width 4, `linejoin round`. It's a PCB hatched copper pour.
5. Canal: stroke `--art-bg` width 12, round joins.
6. Vias (fill `--art-bg`, stroke `--a` width 4, r 9): Copper Harbor `(1110,120)`, Calumet `(760,320)`.
7. Houghton pad at `(690,430)`: ring r 30 `--a2` width 2 opacity .5; r 14 `--art-bg` fill with `--a2` stroke width 6; r 4 `--a2` dot.

### 6.3 `research-sql`: the rewritten query path

`viewBox="0 0 1200 800"`, `xMidYMid slice`. Story: an inefficient path through a table versus the short rewritten one.

1. Rect `--art-bg`. Radial `cx=1000 cy=400 r=520` `--b` .22 to 0. Radial `cx=240 cy=400 r=420` `--a` .16 to 0.
2. Table: for r 0..7, c 0..3: rect `x=110+66c y=190+54r w=58 h=44 rx=4`, stroke `--art-line` 1.5, fill `--a` at opacity .08. Lit cells at opacity .75: (r,c) = `(1,2) (2,2) (3,2) (4,2) (6,1)`.
3. Network: three layers. x=520 n=4, x=660 n=6, x=800 n=4. Node i y = 400 + (i − (n−1)/2) × 92. All-to-all edges between adjacent layers, one concatenated path, stroke `--art-line` 1.5.
4. Nodes: r 17, fill `--art-bg`, stroke `--art-line` 2.5.
5. Slow path (dashed, `--a` 3, dasharray 10 9): `(374,298) (460,298) → L1[0] → L2[4] → L3[1] → (1000,400)`.
6. Rewritten path (solid, `--b` 6, round joins): `(374,460) (460,460) → L1[2] → L2[2] → L3[2] → (1000,400)`.
7. Slow nodes highlight: r 17, `--art-bg`, stroke `--a` 4. Rewritten nodes: r 17, `--art-bg`, stroke `--b` 5, plus r 6 `--b` dot.
8. Result doc: rect `x=1000 y=340 w=96 h=120 rx=8`, `--art-bg` fill, stroke `--b` 5. Lines `M1020 372H1076 M1020 400H1076 M1020 428H1056`, `--b` 6.

### 6.4 `research-cicd`: the cracked stage

`viewBox="0 0 1200 800"`, `xMidYMid slice`.

1. Rect `--art-bg`. Radial `cx=750 cy=380 r=330`: `--a2` .42, `--a` .12 at 40%, `--b` 0.
2. Bus: `M-10 660H1210`, `--art-line` width 4. Stubs: `M180 606V660 M370 526V660 M560 606V660 M980 586V660`.
3. Broken stub for the cracked stage: `M750 466V530 M750 590V660`. The 60-unit gap is the point.
4. Bus vias r 7: (180,660) (370,660) (560,660) (980,660) `--a`; (750,660) `--a2`.
5. Cubes, isometric, a = 86, dx = a × cos30° ≈ 74.5, dy = 43. For center (cx, cy):
   - top: `(cx,cy-a) (cx+dx,cy-a+dy) (cx,cy) (cx-dx,cy-a+dy)`, `--a` fill .20
   - left: `(cx-dx,cy-a+dy) (cx,cy) (cx,cy+a) (cx-dx,cy+dy)`, fill .08
   - right: `(cx,cy) (cx+dx,cy-a+dy) (cx+dx,cy+dy) (cx,cy+a)`, fill .13
   - stroke 3, round joins. Centers: (180,520) (370,440) (560,520) (750,380) (980,500). Stroke `--a`, except the 4th is `--b`.
6. Crack, `--a2`, width 5, round joins: `M750 300 L738 338 L762 362 L742 398 L768 430 L750 466`. Branches width 3: `M762 362 L792 352 M742 398 L712 408 L700 396 M768 430 L796 442`.
7. Shards, stroke `--a2` 2.5: polygons `818,296 836,284 842,306` and `664,300 676,286 688,304`.

### 6.5 `section-texture`

SVG tile as a data URI on the texture layer, `background-size: 32rem 32rem`, `repeat`. Once rasterized, the tile is cached by the browser, so filter cost is paid once.

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <filter id="section-texture-p" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".008 .022" numOctaves="4" seed="7" stitchTiles="stitch"/>
    <feColorMatrix values="0 0 0 0 R  0 0 0 0 G  0 0 0 0 B  1.8 1.2 0 0 -1.05"/>
  </filter>
  <rect width="512" height="512" filter="url(#section-texture-p)"/>
</svg>
```

R G B: dark `.373 .639 .604`, light `.118 .4 .439`. Two URIs, switched by `[data-theme]`. Streaks run horizontally because of the anisotropic frequency.

### 6.6 Favicon set

`public/favicon.svg`, also rasterized by `generate-favicons.ts`. `viewBox="0 0 32 32"`:

- `rect 0 0 32 32 rx 6`, `#0B1218`.
- Pins, `#C47A4A`, 3 per side. Top: `x = 9, 14.5, 20`, `y=2 w=3 h=5`. Bottom: same x, `y=25`. Left: `y = 9, 14.5, 20`, `x=2 w=5 h=3`. Right: same y, `x=25`.
- Body: `rect 7 7 18 18 rx 2`, `#C47A4A`.
- Die: `path M11 11H21V21H11Z`, `#0B1218`.
- Pin-1: circle `(14,14) r1.6`, `#E29A64`.

Works on light and dark tab bars, because it carries its own background. `apple-touch-icon.png` 180 and `icon-192/512.png` are this art, with `rx 0` on the 180 (iOS masks it). `site.webmanifest` `theme_color` and `background_color` `#0B1218`. `.ico` contains 16, 32, 48.

### 6.7 Margin trace tile

`viewBox="0 0 480 960"` tile, `background-size: 30rem 60rem`. Two data URIs. Stroke `#1C2A35` dark, `#CED3D4` light, width 1.5, fill none. For k = 0..5, x = 40 + 80k, a = 100 + 70k, b = a + 280:

```
M x 0 V a L (x+40) (a+40) V b L x (b+40) V 960
via: circle at (x+40, a+160), r 4, same colour, on even k
```

### 6.8 OG card

`src/pages/og-image.png.ts`. 1200×630. Satori for layout, resvg for raster. Satori has flexbox only and doesn't read WOFF2: load `.woff` from the Fontsource package (`files/bricolage-grotesque-latin-700-normal.woff`, Instrument Sans 500, DM Mono 400/500).

- Background: `#0B1218`, full bleed.
- Art: the 6.1 geometry unchanged, as an `<img>` data-URI SVG with **literal hexes** (no `var()`, no CSS), `viewBox="0 30 1600 840"` at 1200×630. The viewBox crops the long traces. The socket center stays empty, with only the warm glow showing.
- Scrim: absolute, `linear-gradient(90deg, #0B1218 0%, rgba(11,18,24,.92) 46%, rgba(11,18,24,0) 76%)`.
- Text column: `position: absolute; left: 72; top: 72; bottom: 72; width: 700`, flex column, `justify-content: space-between`.
  - Top: `SOFTWARE ENGINEER`, DM Mono 500 22px, letter-spacing .08em, `#C47A4A`.
  - Middle: `Kiran` / `Vadlapally`, Bricolage Grotesque 700 96px, line-height 1, letter-spacing -.02em, `#E8ECEF`. Then `From copper traces to API connectors.`, Instrument Sans 500 34px, margin-top 28, `#E8ECEF`.
  - Bottom: `C#/.NET · Java · REST/SOAP · Identity & access`, DM Mono 400 22px, `#8C99A4`.

The px values here are renderer input, not CSS, so AC 5.4 doesn't apply.

---

## 7. Motion

Tokens: `--dur-1 120ms`, `--dur-2 200ms`, `--dur-3 320ms`. `--ease-out: cubic-bezier(.2,.7,.2,1)`. `--ease-in-out: cubic-bezier(.65,0,.35,1)`.

Rules:
- Animate only `transform`, `opacity`, `stroke-dashoffset`, and short colour or shadow on one element.
- Nothing animates width, height, margin, top or left. Every state is the same box as the rest state.
- No element that could be LCP has any animation, delay, opacity start or pending class: h1, tagline, headline. When `hero.png` ships, the LQIP-to-image swap is an instant replace, no fade.
- `scroll-behavior: smooth` only inside `prefers-reduced-motion: no-preference`.
- JS writes to `transform`, `--oxidation`, and dashoffset only, in one rAF loop.

| Animation | Trigger | Duration, easing | Properties | Reduced-motion final state |
|---|---|---|---|---|
| Badge scan line | In view | 560ms, `cubic-bezier(.4,0,.6,1)` | transform | Not shown |
| Badge state changes | Timers 560, 980 | Swap 120ms | opacity | `granted` in HTML; inline script exits early |
| Value mask wipe | `granted` | 240ms, stagger 60ms, `--ease-out` | transform | Masks absent |
| LED pop, card ring | `granted` | 200ms, 400ms | transform, opacity | Static LED, no ring |
| ACTIVE LED pulse | Always | 2.4s `ease-in-out` infinite | opacity | Halo fixed at .3 |
| Oxidation | Scroll | None, scrubbed in 0.02 steps | `--oxidation` | **Stays scroll-linked** (PLAN D17). It's a colour change, not movement |
| Trace draw | Scroll | None, scrubbed | stroke-dashoffset | `dashoffset: 0`, all branches drawn, no scroll work for trace |
| Trace tip | Scroll | None | transform | Removed |
| Rail vias fill | Tip passes | 120ms | fill | All filled |
| Component power | Hover, focus, tap | 200ms `--ease-out` border/shadow; stub 240ms | border, box-shadow, stroke | Instant, state still applies |
| Project glow | Pointer | Fade 200ms; position unsmoothed | opacity, gradient vars | Disabled; hover shows `--accent` border only |
| Contact status | Trace lands | 200ms | opacity, transform | `granted` on load |
| Theme flip | Click | 560ms (260 + 300) | transform via View Transitions | Instant swap |
| Toggle icon | Click | 560ms `--ease-in-out` | transform | Instant |
| Menu open/close | Click | 200ms / 120ms | opacity, 0.5rem translate on list | Instant |
| Hamburger to X | Click | 200ms | transform | Instant |
| Button, link hover | Hover | 120ms | color, background | Instant |

Reduced-motion reset:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition-duration: 0ms !important;
    scroll-behavior: auto !important;
  }
}
```

`animation: none` (rather than a tiny duration) satisfies AC 6.9's "0 running animations".

**CLS guards:** status rows use stacked grid cells. Inline SVGs have `aspect-ratio` or fixed container ratios. Images have dimensions. Copy-email is inserted into a reserved 2.75rem slot. Font fallback metrics are overridden (3.1).

---

## 8. States

`focus-visible` for all: `outline: 2px solid var(--accent); outline-offset: 3px; border-radius: inherit`. Never `outline: none` without this. On a filled button the offset puts the ring on the background.

| Element | Rest | Hover (`hover: hover`) | Tap / `:active` | Focus-visible | Current / on |
|---|---|---|---|---|---|
| Primary button | `--accent` fill, `--on-accent` | `--accent-hover` fill | `scale(.98)`, 120ms | Ring | n/a |
| Secondary button | `--surface`, `--line-strong`, `--text` | Border `--accent`, text `--accent` | `--surface-2` fill | Ring | n/a |
| Nav link | `--text` | 0.125rem underline `--accent` grows from left, 120ms | Same | Ring | Persistent underline, `aria-current` |
| Text link | `--accent`, underline 1px | `--accent-hover` | `--accent-hover` | Ring | n/a |
| Icon button (toggle, hamburger, close) | `--text`, no fill | `--surface-2` fill | `--surface-2` fill | Ring | `aria-pressed` / `aria-expanded` |
| Experience component | `--grid` border | Powered | Powered, toggles; tapping another moves it | Ring and powered | `data-powered` |
| Project chip | `--grid` border | Glow, `--accent` border | `--accent` border | Ring on the title link (AC 6.8), and the card border goes `--accent` via `:has(a:focus-visible)` | n/a |
| Research link | 1px `--line-strong` chip | `--accent` border and text | `--surface-2` | Ring | n/a |
| Contact row | `--text` value | Value `--accent` | `--surface-2` row | Ring | n/a |
| Skill part | End caps 70% | End caps 100% | None (non-interactive) | Not focusable | n/a |
| Copy email | Secondary | Secondary hover | `--surface-2` | Ring | `Copied` for 1.6s |

Touch: all hover rules live inside `@media (hover: hover)`, so nothing sticks after a tap. Set `-webkit-tap-highlight-color: transparent`, since `:active` states replace it. Any `a`, `button`, or `[tabindex="0"]` is ≥2.75rem tall and wide (AC 5.8); inline-looking links use `display: inline-flex; min-height: 2.75rem`.

**Empty and absent states.** DNP ("do not populate") is the design language for anything not there yet. It always reads as deliberate. Public text never says TODO (AC 6.14).

| Case | Treatment |
|---|---|
| Research paper or repo URL missing | Non-link `<span>` chip: 1px **dashed** `--line-strong`, `--fs-label` `--muted`, text `PAPER · DNP` / `REPO · DNP`, with `title` and visually hidden "not yet published". No `aria-disabled`, no pointer, no hover. If a URL exists: solid chip, link, `PAPER →` |
| Research placeholder project cards | `ProjectCard` with dashed 1px `--line-strong` border, `--bg` fill (empty footprint), no glow. Footprint icon: 4 corner pads in `--line-strong`. Designator `DNP`. Title is the research title, `● IN PROGRESS` chip, line `Repository not yet public`. Not a link. Not focusable |
| Repo without description | Sparse variant (5.7) |
| Fewer than 6 repos | Grid shows what exists; placeholders still fill. No filler cards |
| No SC-300 URL | Chip without link, no arrow |
| Resume PDF absent | Button reads `Request resume`, same primary style (D3) |
| No JS | CSS trace line, final badge, granted contact, no copy button, hamburger hidden and nav links shown in a wrapped row |
| Forced colours | `@media (forced-colors: active)`: remove background art, trace `stroke: CanvasText`, cards keep 1px borders, LED `Highlight` |
| Print | White background, hide trace, art, nav, toggle. Black text, link URLs shown |

---

## Report notes for PM and engineer

Design conflicts with PLAN, resolved in PLAN's favour unless noted:

1. **AC 3.3 viewport.** The badge starts when scrolled into view, so run this AC at ≥1024. Below that, the badge may be off-screen at load.
2. **AC 3.9 and 5.7 disagree at mobile.** 3.9 wants `[data-branch]` to change on tap, 5.7 wants 0 branches under 768. Design: below 768 assert `data-powered`, box-shadow, and the card edge light; `[data-branch]` clause applies ≥768.
3. **`SlotFallback` hero placement.** Hero fallback renders inside `CredentialCard`'s `.badge-slot`, not in `HeroImage`. `data-slot="hero"` goes on the SVG.
4. **AC 5.9 dvh on hero.** Applied ≥64rem only, with `svh` below, so mobile toolbars can't resize the hero and rebuild the trace.
