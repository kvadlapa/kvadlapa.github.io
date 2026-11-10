Build me an exceptional, award-quality software engineer portfolio. I'm job hunting for SWE roles (on-site, remote, or relocation). It must impress recruiters in 30 seconds, delight engineers who inspect it, and be flawlessly responsive on every device from a 320px phone to a 4K monitor.

# 1. THEME: "Copper Circuit": Schematic × Copper Country × Access Granted
The story (use it in copy and visuals): I studied Electrical Engineering, where copper traces carry signals. Then I went to grad school at Michigan Tech in the Keweenaw ("Copper Country"), and now I build API connectors that carry data between identity and enterprise systems. Tagline: "From copper traces to API connectors."

Visual language:
- BASE = SCHEMATIC / PCB: the site is a circuit board. Sections are board regions; jobs are components (U1, U2…); skills are labeled parts; mono silkscreen-style labels.
- MATERIAL = COPPER: all traces, lines, accents, and highlights are copper. Copper subtly oxidizes to patina green as the user scrolls down the page (CSS variable interpolated by scroll progress).
- ACCENTS = ACCESS GRANTED (hero + contact only): hero includes an ID-badge / credential card; contact is framed as "Request access".

Palette (CSS variables; dark is the default; light = "blueprint paper" mode with a toggle + prefers-color-scheme):
- Dark: bg #0B1218 (Lake Superior night), surface #111C24, grid lines #1C2A35, text #E8ECEF, muted #8C99A4
- Light: bg #F4F1EA (paper), surface #FFFFFF, grid #DCD6C8, ink #13202A, muted #5A6670
- Copper #C47A4A → bright copper #E29A64 (hover) → patina #5FA39A (scroll end)
- Status green #3DDC97 (only for "ACTIVE"/"ACCESS GRANTED" indicators)
- Verify WCAG AA contrast for all text in both modes; darken accents in light mode if needed.

Typography (self-hosted via Fontsource, font-display: swap, subset):
- Display: Space Grotesk 600–700; Body: Inter 400/500; Labels/code: JetBrains Mono
- Fluid type with clamp(); hero name ~clamp(2.75rem, 8vw, 6.5rem); body max 68ch

# 2. ABOUT ME
- Name: Kiran Vadlapally, Houghton, MI (open to relocation)
- Email: vadlapallykiran@gmail.com | LinkedIn: https://linkedin.com/in/kvadlapa | GitHub: https://github.com/kvadlapa
- Resume: /public/Kiran_Vadlapally_Resume.pdf (I'll add it). Do NOT show my phone number.
- Headline: "Backend Software Engineer: reliable, fault-tolerant services in C#/.NET and Java"
- Summary: Backend software engineer with an M.S. in Computer Science and 3 years of experience in Java (Spring Boot) and C#/.NET. I design, build, and operate distributed services end to end, focused on reliability, fault tolerance, and scale.

Experience (render as components on the board, connected by one copper trace; most recent first):
U3 · Software Engineer, SoftwareIDM (Houghton, MI), Dec 2025–Present [status: ● ACTIVE]
 - Designed and own the ServiceNow connector end to end, from architecture through release and production support. Replaced hardcoded, per-table logic with a JSON configuration-driven architecture (tables, APIs, pagination, filters), so one codebase serves 3+ clients and onboarding a client takes configuration, not code
 - Build and maintain C#/.NET connectors that sync identity data several times a day for 6+ client companies across Microsoft Entra ID, Active Directory, Exchange Online, Intune, CyberArk, HashiCorp Vault, SuccessFactors, and Oracle HR, with OAuth 2.0 auth and identity lifecycle operations
 - Implemented incremental sync with high-watermark tracking, pagination, and filtering, so each run fetches only records changed since the last successful sync rather than all 50,000+, cutting API calls and run time
 - Made connectors fault-tolerant against unreliable third-party APIs with retries for transient failures, HTTP 429 rate-limit handling, and idempotent writes, so a rerun never creates duplicate records
 - Operate connectors in production: trace failures seen only with real client data (API errors, serialization mismatches, data-consistency gaps) to root cause, then ship, test, and document the fix
 - Write unit and integration tests for connector changes and release through Docker, Azure, and Bitbucket Pipelines CI/CD
 - Review teammates' pull requests and write Confluence runbooks and resolution guides used by engineers, consultants, and clients
 (Keep high-level: no code or internal details.)
U2 · Software Engineer, Antra, Inc. (Remote), May 2025–Nov 2025
 - Built C#/.NET REST and SOAP integrations for enterprise identity clients, including authentication and data transformation between source and target systems, and resolved client-reported integration failures
U1 · Associate Software Developer, Accenture (Hyderabad, India), Apr 2022–Aug 2023
 - Developed Spring Boot microservices with Hibernate (JPA) for a production insurance onboarding platform and documented their REST APIs in Swagger for the teams consuming them
 - Diagnosed slow SQL behind daily production reports using execution plans, then added indexes and removed N+1 query patterns, cutting report response times by about 33%
 - Contributed to Jenkins and AWS CI/CD pipelines that automated manual release steps
TP1 · Teaching Assistant & Grader, Michigan Technological University, Aug 2024–May 2025
 - Helped students debug Java, compiler errors, and environment setup
 - Ran labs/graded for Software Processes & Management, Team Software Project, Model-Driven Software Development

Education: M.S. Computer Science, Michigan Tech, 2025 · B.S. Electrical & Electronics Engineering, MLR Institute of Technology, Hyderabad
Certification: Microsoft Certified: Identity and Access Administrator Associate (SC-300), shown as a "verified credential" chip

Skills (as labeled parts, grouped; no progress bars or ratings):
- Languages: Java, C#, SQL, VB.NET (object-oriented design, design patterns)
- Backend: .NET Framework, ASP.NET, Spring Boot, Hibernate (JPA), REST, SOAP, Microservices
- Data: PostgreSQL, MySQL, SQL Server (query tuning, indexing, execution plans)
- Reliability & Practices: Incremental sync, Idempotency, Fault tolerance, Retries, Rate limiting, Unit & integration testing, Code reviews, CI/CD, Production operations
- Identity & Security: OAuth 2.0, OpenID Connect, Microsoft Entra ID, Active Directory
- Cloud & DevOps: AWS, Azure, Docker, Jenkins, Bitbucket Pipelines, Git, Linux

Research (status chip "● IN PROGRESS", with slots for paper/repo links):
1. LLM-Assisted SQL Query Optimization: using LLMs to detect and rewrite inefficient SQL, evaluated against execution plans
2. Security Misconfigurations in CI/CD Workflows: an empirical study of software supply-chain risks in pipeline configurations

Projects: fetch my public repos from GitHub API at build time (pinned/top by stars + recency), with a manual override list in src/data/projects.ts. Include 2 TODO placeholder cards for the research repos.

# 3. SECTIONS & SIGNATURE MOMENTS
Single page, sticky nav with blur; section labels like silkscreen: /about · /experience · /projects · /research · /skills · /contact
1. HERO (Access Granted): hero image background; name + tagline; on the right an ID-badge credential card that "authenticates" on load:
   scanning line → "VERIFYING…" → "● ACCESS GRANTED", then reveals role, stack, location, "open_to_work": true. CTA buttons: Resume / GitHub / LinkedIn / Email.
2. A single SVG copper trace starts in the hero and is drawn (stroke-dashoffset tied to scroll) down the whole page, branching into each section and ending at the contact form. It shifts copper → patina as it goes.
3. ABOUT: the EE→software story in 3–4 sentences, beside the Keweenaw image.
4. EXPERIENCE: components on the board; hovering/tapping a component "powers" it (copper glow + its trace lights up). Current role has a softly pulsing ACTIVE LED.
5. PROJECTS: cards as chips on the board, cursor-following copper glow (pointer:fine only), mono tech tags.
6. RESEARCH: two cards with AI cover images.
7. CONTACT (Access Granted): "Request access" panel; mailto + socials; small footer line "Built in Copper Country."
8. Light mode = blueprint paper with ink-blue lines; toggle animates like flipping a board over.

# 4. AI-GENERATED 4K IMAGES
Create src/assets/images/ with these named slots and use them as below. If I provide an image-generation API key in .env (OPENAI_API_KEY or similar), write scripts/generate-images.ts to generate them from these prompts at 3840px wide; otherwise, render tasteful CSS/SVG fallbacks so the site looks finished without them, and list in the README which files to drop in.

Images (no text, no logos, no people's faces in any image):
- hero.png (3840×2160): "Ultra-macro photograph of a dark printed circuit board, glowing copper traces and solder pads, shallow depth of field, cinematic low-key lighting, deep blue-black background, copper and teal tones, subtle bokeh, 8k detail, minimalist, lots of negative space on the left"
- keweenaw.png (3840×2160): "Moody aerial photograph of Lake Superior shoreline in Michigan's Keweenaw Peninsula at blue hour, dark rocky copper-colored cliffs, light snow, calm deep blue water, cinematic, muted palette with copper and teal accents, no buildings, no text"
- research-sql.png (2400×1600): "Abstract 3D render of glowing data tables and query paths flowing through a neural network, copper and teal light on deep navy, clean minimal composition, soft volumetric light"
- research-cicd.png (2400×1600): "Abstract 3D render of an interconnected software pipeline of glass cubes with one cracked, glowing node revealing a hidden flaw, copper and teal on deep navy, minimal, cinematic lighting"
- section-texture.png (3840×2160, used at 6–10% opacity): "Top-down macro of oxidized copper surface with patina streaks, seamless, dark, subtle texture"
- og-image: generate a 1200×630 Open Graph card at build time (Satori/astro-og) with my name, tagline, and a copper trace motif.

Image pipeline (critical for performance):
- Keep 4K masters only in source; ship via Astro <Picture> with AVIF + WebP, srcset widths 480/768/1280/1920/2560/3840 and accurate sizes attributes, so phones never download 4K
- Hero: fetchpriority="high", preloaded, blurred LQIP placeholder; all others lazy-loaded
- Overlay gradient on images to guarantee text contrast in both modes
- Art direction: crop hero to portrait on mobile via <picture> media sources

# 5. SUPER-RESPONSIVE REQUIREMENTS (non-negotiable)
- Mobile-first. Test and screenshot at 320, 375, 414, 768, 1024, 1280, 1440, 1920, and 2560/3840 widths, plus landscape phone (844×390)
- Use container queries for cards/components; fluid spacing/type via clamp(); no fixed pixel widths
- On large/4K screens: cap content at ~1280px but let the board grid, trace, and imagery extend edge-to-edge so it never looks empty
- Mobile: hamburger → accessible full-screen menu (focus trap, Esc, aria-expanded); trace simplifies to a single vertical line; hover effects become tap states
- Touch targets ≥ 44px; no horizontal scroll at any width; safe-area insets for notched phones; respect dynamic viewport units (dvh)
- Use Playwright to take screenshots at every width above and fix any overflow or layout bugs before finishing

# 6. TECH & QUALITY
- Astro + TypeScript + Tailwind CSS v4, static output; minimal JS (islands only where needed); GSAP or plain IntersectionObserver for scroll effects
- Content in typed data files: src/data/{profile,experience,skills,research,projects}.ts
- Lighthouse ≥ 95 in all categories on mobile; LCP < 2.0s; CLS < 0.05
- Accessibility: semantic HTML, skip link, visible copper focus rings, keyboard-navigable, ARIA where needed, alt text on all images (decorative ones alt="")
- All motion disabled under prefers-reduced-motion (show final states instantly)
- SEO: meta tags, JSON-LD Person schema, sitemap, robots.txt, favicon set (copper chip icon), canonical URL
- No lorem ipsum; mark items I must verify with TODO

# 7. DELIVERABLES
- Working project + README: local dev, editing content, adding/regenerating images, deploying to GitHub Pages and Vercel
- GitHub Actions workflow deploying to GitHub Pages on push to main (repo: kvadlapa.github.io)

Process: first propose the folder structure, component list, and a short design rationale, then build. Finish by running a production build, a Lighthouse check, and the Playwright responsive screenshots, then fix everything they reveal.
