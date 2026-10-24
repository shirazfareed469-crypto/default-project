# Sohail & Shiraz — Digital Marketing Studio

A single-page marketing site for a fictional two-partner digital marketing
studio. Hand-written HTML, CSS and JavaScript — no framework, no build step, no
package manager, nothing to install.

The page is designed to feel alive: a slow animated background canvas behind
every section, scroll-triggered reveals, word-by-word headline animation,
tilt-on-hover cards and a dark wine palette.

---

## Quick start

Only one step: open `index.html` in a browser.

A local server is still worth using for realistic testing — browsers treat
`file://` inconsistently — but the page has no server dependency.

If you have Python installed:

```bash
python -m http.server 8000
```

…then visit `http://localhost:8000`. Any static file server works equally well.

> **No build, no watch mode.** Edit a file, save it, refresh the browser. If a
> stylesheet change doesn't appear, hard-reload with `Ctrl+F5` — the browser
> caches `styles.css` aggressively.

---

## Project structure

```
Default Project/
├── index.html            Markup, head metadata and all JSON-LD structured data
├── styles.css            All styling: tokens, palette, layout, components
├── script.js             Navigation, reveals, counters, form, motion
├── background.js         Animated canvas layer behind the page
├── favicon.svg           Browser tab icon (self-contained)
├── logo.svg              Standalone logo mark (self-contained)
├── logo-512.png          Raster logo for schema.org + apple-touch-icon
├── og-image.jpg          1200×630 social preview card
├── sohail.jpg            Founder portrait (492×640)
├── shiraz.jpg            Founder portrait (428×640)
├── robots.txt            Crawl rules, including explicit AI-crawler allowances
├── sitemap.xml           Single-URL sitemap
├── llms.txt              Plain-text brief aimed at LLM crawlers
├── background-mesh.html  Standalone demo of the canvas effect (superseded)
├── assests/
│   └── Screenshot 2026-10-17 113901.png   Palette reference (not used by the build)
└── README.md             This file
```

`background-mesh.html` is an isolated playground for the animated background and
is not linked from the site. It can be deleted without affecting anything.

---

## Page sections

| Section   | Anchor      | Contents |
|-----------|-------------|----------|
| Hero      | `#top`      | Eyebrow, two-line headline, lede, two CTAs, animated stat counters, glass panel with floating service pills |
| Services  | `#services` | Six service cards in a responsive grid |
| About     | `#about`    | Founders' portraits, studio story, three principles, signature, CTA |
| Contact   | `#contact`  | Contact details panel and a validated enquiry form |
| FAQ       | `#faq`      | Five expandable questions, mirrored in `FAQPage` structured data |
| Footer    | —           | Logo, footer navigation, copyright |

The header is fixed and includes a reading-progress bar, a mobile menu toggle and
a persistent "Get a free audit" CTA.

---

## Palette

One palette ships: **Wine** — a deep wine page, cream type and neon pink/orange
accents. There is no switcher; the colours are fixed.

| Role | Token | Value |
|---|---|---|
| Page | `--bg-base` | `#3A0A1E → #2A0716 → #1E0510` |
| Body text | `--ink` | `#FFF1E6` |
| Muted text | `--ink-soft` | `#EFCBD5` |
| Primary accent | `--pink` | `#FF6FA5` |
| Links / hover | `--deep-pink` | `#FFC2D6` |
| Accent gradient | `--g-warm` | `#C21F58 → #A61E5C → #7A1440` |
| Warm highlights | `--amber` / `--yellow` | `#FFC94D` / `#FFE28A` |

`color-scheme: dark` is declared on `:root`, so native form controls, scrollbars
and the browser's own chrome follow the dark palette.

### Changing the palette

Every colour is a custom property declared once in `:root` at the top of
`styles.css`. Change the values there and the whole page follows — components only
ever read tokens, never raw colours. The one exception is the `--bgm-*` triplets
read by JavaScript (see *Design tokens*).

To reintroduce switchable themes, add `[data-theme="…"]` blocks that re-declare
the same tokens and set the attribute on `<html>`. No component rules need
duplicating.

---

## Design tokens

Every colour on the site is a CSS custom property, so the palette is just a list
of values. The important groups:

| Group | Tokens | Purpose |
|-------|--------|---------|
| Brand ramp | `--pink` `--deep-pink` `--magenta` `--orange` `--amber` `--yellow` `--lemon` | Accents, links, badges, card glows |
| Ink | `--ink` `--ink-soft` `--line` `--line-soft` | Body text and rules |
| Gradients | `--g-warm` `--g-warm-rev` `--g-warm-v` `--g-sunset` `--g-panel` `--g-text` `--g-soft` | Buttons, band, contact card, gradient headings |
| Canvas | `--bg-base` `--bg-glow-a/b/c` | Page background |
| Atmosphere | `--hero-glow-a/b/c` `--orb-a/b/c` | Hero lighting and floating orbs |
| Surfaces | `--section-alt` `--card-bg` `--form-bg` `--about-bg` `--header-bg` `--panel-bg` `--field-*` | Section and card fills |
| Text on colour | `--on-1/2/3` `--on-deco` `--on-line` `--on-warm` | Anything sitting on a coloured panel |
| Ambient layer | `--bgm-*` | Read by `background.js` |
| Depth | `--shadow-*` `--ring` `--glass-*` | Shadows, focus rings, glassmorphism |

Two rules worth remembering when editing:

- **`--on-warm` must contrast with `--g-warm`.** Anything filled with `--g-warm`
  (primary buttons, nav pills, the eyebrow) writes its text in `--on-warm`. If
  you change one, check the other.
- **`--bgm-*` values are literal `"r, g, b"` triplets**, not colours — they are
  parsed by JavaScript, where `var()` cannot be resolved. Keep them in that form.

---

## Motion and animation

Three independent layers, each able to degrade on its own:

| Layer | Where | What it does |
|-------|-------|--------------|
| CSS + `IntersectionObserver` | `styles.css`, `script.js` | Baseline reveals, hover states, gradient pans. Works with the CDN blocked. |
| GSAP + ScrollTrigger | CDN, used by `script.js` | Word-by-word headline reveal, clip-path wipes on headings, parallax, stat counters |
| Motion (Framer Motion) | CDN, used by `script.js` | Pointer-driven card tilt and button "magnet" pull |

`script.js` feature-detects the libraries at runtime. If a CDN is unavailable or
blocked, the site keeps working with the CSS layer instead of breaking — start
states for GSAP are applied by JavaScript, not baked into the CSS, precisely so a
failed load cannot leave invisible text behind.

HTML hooks that drive this:

| Attribute / class | Effect |
|---|---|
| `data-split="words"` | Splits the element into per-word spans for staggered reveal |
| `data-wipe` | Clip-path reveal on scroll |
| `data-parallax="0.24"` | Moves the element at a fraction of scroll speed |
| `data-tilt` | Pointer tilt (Motion) |
| `class="magnet"` | Pointer attraction (Motion) |
| `data-to` / `data-decimals` / `data-suffix` | Counting animation target, precision and trailing symbol |

---

## Ambient background

`background.js` paints one full-viewport `<canvas id="bgMesh">` fixed behind the
page (`z-index: -1`, `pointer-events: none`). It draws three things:

1. **Fluid gradient mesh** — three very large, very slow colour clouds.
2. **Drifting lights** — bright glowing orbs wandering the page.
3. **Constellation** — particles with distance-faded links; the cursor threads
   itself into the web.

It is built to stay cheap: sprite blits instead of per-frame gradients, links
batched into alpha buckets, no allocation in the steady state, a capped device
pixel ratio, a static single frame under `prefers-reduced-motion`, and a pause
whenever the tab is hidden.

Because the canvas is transparent and `position: fixed`, it shows through every
section. It reads its palette from the `--bgm-*` tokens on start-up, and
`window.__bgMesh.refresh()` re-reads them if you change the palette at runtime.

A sibling `.bg-scrim` div sits between the canvas and the content to keep text
readable over the brightest parts.

---

## Accessibility

- Skip link to `#main` as the first focusable element.
- Visible `:focus-visible` rings driven by `--focus` and `--ring`.
- Mobile menu traps nothing, closes on `Escape`, on outside click, and on
  resize to desktop, and reports state through `aria-expanded`.
- Form errors are announced through `role="status"` / `aria-live="polite"`.
- Sections are labelled, decorative artwork is `aria-hidden`, and the logo link
  has an accessible name.
- `prefers-reduced-motion: reduce` stops the canvas animation and shortens the
  CSS transitions.
- A `<noscript>` block forces reveal-on-scroll content visible when JavaScript is
  off; the `<html class="js">` flag lets CSS tell JS-on from JS-off.

---

## Responsive behaviour

Fluid type and spacing are driven by `clamp()`, so text scales continuously
instead of snapping at fixed widths. The structural breakpoints are:

| Query | What changes |
|---|---|
| `min-width: 1400px` | Wider content column (`--wrap: 1240px`), roomier sections |
| `max-width: 900px` | About and contact grids go single-column; hero stage and scroll cue hidden; primary nav becomes the toggle menu; form fields jump to 16px (stops iOS auto-zoom); nav CTA goes full width |
| `max-width: 560px` | Tighter section padding; stats stay three-across; footer stacks |
| `max-width: 460px` | Smaller logo, tagline hidden, full-width hero buttons |
| `hover: none` | Hover-only effects neutralised so they don't stick after a tap |

---

## SEO, structured data and AI discoverability

All of it lives in the `<head>` of `index.html`. No plugin, no build step.

### What is declared

A single `<script type="application/ld+json">` holds one `@graph` of 15 nodes,
cross-linked by `@id`:

| Node | Purpose |
|---|---|
| `ProfessionalService` (`#business`) | The studio: address, phone, hours, price range, founders, services, expertise |
| `WebSite` (`#website`) | Site identity and language |
| `WebPage` (`#webpage`) | This page, its canonical URL and primary image |
| `Person` ×2 | Sohail and Shiraz, each linked back to the business |
| `Service` ×6 | One per service card, each linking to the business as provider |
| `ImageObject` ×2 | Logo (512×512) and social card (1200×630) |
| `FAQPage` (`#faq`) | The five visible FAQ answers |
| `ContactPage` (`#contactpage`) | Contact details |

### The rules that matter more than the markup

- **Nothing in the schema may be invisible on the page.** Google ignores
  structured data describing content a visitor cannot see. The `FAQPage`
  questions are the visible `<summary>` text in `#faq` — edit one, edit both.
- **No self-serving reviews.** There is deliberately *no* `aggregateRating` on
  the business. Rating markup an organisation publishes about itself is against
  Google's policy and can trigger a manual action instead of a rich result.
- **No invented location data.** `areaServed` is `Worldwide`; the previous markup
  claimed a `GeoCircle` centred on latitude/longitude `0,0`.
- **Raster logo.** Google does not use SVG for the `logo` property, so
  `logo-512.png` exists purely for schema and `apple-touch-icon`.
- **One canonical host.** `rel=canonical`, `og:url`, every `@id`, `sitemap.xml`
  and `robots.txt` all point at `https://sohailandshiraz.com/`. Change them
  together or the canonical signal will contradict the sitemap.

### AI readability

- `llms.txt` is a plain-text brief: who the studio is, its six services, its track
  record, contact details, and a note that the contact info is still placeholder.
- `robots.txt` explicitly allows `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`,
  `ClaudeBot`, `Claude-SearchBot`, `Claude-User`, `PerplexityBot`,
  `Google-Extended`, `Applebot-Extended` and `CCBot`.
- `knowsAbout` on the business and on each founder tells retrieval systems what
  the studio covers without them having to infer it from prose.
- Real landmarks (`header`, `main`, `section[id]`, `footer`), one `<h1>` and an
  unbroken `h2`/`h3` outline mean extraction does not depend on class names.

### Honest caveat about FAQ rich results

Since 2023 Google shows FAQ rich results only for authoritative government and
health sites. This markup is unlikely to produce a rich snippet. It is here to
make the Q&A machine-readable for AI crawlers and other engines — not to decorate
the results page.

---

## Performance

| Change | Effect |
|---|---|
| Portraits resized to their 2× display size, re-encoded at quality 82 | **744 KB → 65 KB** — by far the largest win on the page |
| `og-image.jpg` created | Fixes a social card that previously 404'd. Zero runtime cost: browsers never download it |
| Portraits keep `loading="lazy"`, `decoding="async"` and explicit `width`/`height` | Below-fold bytes deferred, no layout shift |
| JSON-LD consolidated from 9 blocks into 1 | ~10 KB smaller head, one parse |
| Duplicate `robots` meta and unused `keywords` meta removed | No measurable win; less head noise |

Deliberately **not** done, and why:

- **`content-visibility: auto` on sections.** It lets off-screen sections skip
  layout, which changes document height as ScrollTrigger measures it. The
  parallax and wipe animations would visibly jump. Rejected on purpose.
- **Self-hosting or subsetting the four Google Fonts families.** This is the
  biggest remaining lever — roughly 3–4 third-party requests and ~120 KB of woff2
  on a cold cache. Not done because it needs the font files vendored and changes
  the delivery model. The `<link>` already uses `display=swap` and there are two
  `preconnect`s. Easy to do on request.
- **Removing GSAP or Motion.** Kept by requirement; `script.js` already
  feature-detects both and degrades to the CSS layer.
- **More `will-change`.** The transform layers already declare it; adding more
  costs GPU memory on mobile for no gain.

---

## Before you launch — placeholders to replace

The site ships with clearly-marked demo content. Search for these and swap them:

| Item | Current value | Where |
|---|---|---|
| Email | `hello@example.com` | `index.html` (contact panel) |
| Phone | `+1 (555) 010-0199` | `index.html` (contact panel, `tel:` link) |
| Address | `123 Placeholder Street, Suite 400` | `index.html` (contact panel) |
| Canonical domain | `https://sohailandshiraz.com/` | `<head>`, every `@id`, `sitemap.xml`, `robots.txt`, `llms.txt` |
| Success/error copy | — | `script.js` (contact form handler) |
| Statistics | `240+`, `4.8×`, `98%` | `index.html` (`data-to` values) |
| Founders' portraits | `sohail.jpg`, `shiraz.jpg` | replace the files, keep the names |
| FAQ answers | 5 questions | `#faq` in `index.html` **and** the `FAQPage` node — keep in sync |
| Social profiles | placeholder LinkedIn / X / Instagram / Facebook | `sameAs` in the JSON-LD |
| Social preview | `og-image.jpg` | regenerate at 1200×630 if the branding changes |
| Page title / description | — | `<head>` of `index.html` |

---

## Known limitations

- **The contact form has no backend.** It validates on the client and shows a
  success message, but nothing is sent or stored. Wire it to a form endpoint
  (Formspree, Netlify Forms, your own API) before relying on it.
- **Animation libraries load from a CDN** (GSAP 3.13, ScrollTrigger, Motion 12).
  Self-host them if you need the site to work fully offline or under a strict
  content-security policy.
- **Two decorative elements sit below the 4.5:1 contrast ratio**: the `•`
  separators in the stats band (~2.5:1) and the small italic ampersand in the
  footer (~3.7:1). Both are ornamental and legible by design intent, but raise
  `--on-2` / `--on-3` in `:root` if you want strict AA everywhere.

---

## Browser support

Modern evergreen browsers — Chrome, Edge, Firefox and Safari. The page relies on
CSS custom properties, `clamp()`, `backdrop-filter`, `color-mix()`,
`IntersectionObserver` and `<canvas>`. No polyfills, no transpilation, no IE
support.
