# Sohail & Shiraz — Digital Marketing Studio

A single-page marketing site for a fictional two-partner digital marketing
studio. Hand-written HTML, CSS and JavaScript — no framework, no build step, no
package manager, nothing to install.

The page is designed to feel alive: a slow animated background canvas behind
every section, scroll-triggered reveals, word-by-word headline animation,
tilt-on-hover cards and four fully switchable colour themes.

---

## Quick start

Only one step: open `index.html` in a browser.

A local server is recommended though, because the theme preference is stored in
`localStorage`, and some browsers restrict that on `file://` URLs.

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
├── index.html            Markup for the whole page, plus the theme bootstrap
├── styles.css            All styling: tokens, themes, layout, components
├── script.js             Navigation, reveals, counters, form, theme switching
├── background.js         Animated canvas layer behind the page
├── favicon.svg           Browser tab icon (self-contained)
├── logo.svg              Standalone logo mark (self-contained)
├── sohail.jpg            Founder portrait
├── shiraz.jpg            Founder portrait
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
| Footer    | —           | Logo, footer navigation, copyright |

The header is fixed and includes a reading-progress bar, a mobile menu toggle and
a persistent "Get a free audit" CTA.

---

## Colour themes

Four themes ship in the box. They are switched from the floating dock in the
bottom-right corner and the choice persists across reloads.

| Key        | Label   | Page tone      | Scheme | Primary accent |
|------------|---------|----------------|--------|----------------|
| `blush`    | Blush   | Warm cream     | light  | `#FF4D8D` pink |
| `reddish`  | Reddish | Rose cream     | light  | `#FF4D4D` red |
| `yellow`   | Yellow  | Butter         | light  | `#FFC107` amber |
| `wine`     | Wine    | Deep wine      | dark   | `#FF6FA5` pink |

### How switching works

The active theme is an attribute on the root element:

```html
<html data-theme="wine">
```

`blush` is the default and lives in `:root`, so it needs no attribute at all.
Every other theme is a `[data-theme="…"]` block that **only re-declares design
tokens** — no component rules are duplicated.

Two places know the theme list, and they must stay in sync:

1. The inline bootstrap script in the `<head>` of `index.html` — applies the
   saved theme *before first paint* so there is no colour flash.
2. `THEMES` / `DEFAULT_THEME` in `script.js` — handles the dock buttons.

Both validate the stored value (`localStorage` key `ss-theme`) against the known
list and silently fall back to the default, so an old or hand-edited value can
never leave the page unstyled.

### Adding a fifth theme

1. Copy any `[data-theme="…"]` block in `styles.css` and rename it.
2. Change the colour values inside it.
3. Add the key to `themes` in `index.html` and `THEMES` in `script.js`.
4. Add a matching `.theme-chip[data-theme-value="…"] .theme-chip-dot` swatch rule
   and a `<button class="theme-chip">` in the dock.

Nothing else needs touching.

---

## Design tokens

Every colour on the site is a CSS custom property, so a theme is just a list of
values. The important groups:

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
  (primary buttons, the pressed theme chip, nav pills, the eyebrow) writes its
  text in `--on-warm`. If you change one, check the other.
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
section. It reads its palette from the `--bgm-*` tokens and re-reads them on a
`MutationObserver` watching `data-theme`, so switching themes recolours the light
show automatically.

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
| `max-width: 900px` | About and contact grids go single-column; the decorative hero stage and scroll cue are hidden |
| `max-width: 780px` | Primary nav becomes the toggle menu; form fields jump to 16px (stops iOS auto-zoom on focus); nav CTA goes full width |
| `max-width: 560px` | Tighter section padding; stats stay three-across; footer stacks |
| `max-width: 460px` | Smaller logo, tagline hidden, full-width hero buttons, theme dock reduces to swatches only |
| `hover: none` | Hover-only effects neutralised so they don't stick after a tap |

The theme dock is deliberately small so it never competes with content: it sits
in the bottom-right corner as a pill of swatches, and the footer picks up extra
bottom padding on small screens so the dock never covers it.

---

## Before you launch — placeholders to replace

The site ships with clearly-marked demo content. Search for these and swap them:

| Item | Current value | Where |
|---|---|---|
| Email | `hello@example.com` | `index.html` (contact panel) |
| Phone | `+1 (555) 010-0199` | `index.html` (contact panel, `tel:` link) |
| Address | `123 Placeholder Street, Suite 400` | `index.html` (contact panel) |
| Success/error copy | — | `script.js` (contact form handler) |
| Statistics | `240+`, `4.8×`, `98%` | `index.html` (`data-to` values) |
| Founders' portraits | `sohail.jpg`, `shiraz.jpg` | replace the files, keep the names |
| Page title / description | — | `<head>` of `index.html` |

---

## Known limitations

- **The contact form has no backend.** It validates on the client and shows a
  success message, but nothing is sent or stored. Wire it to a form endpoint
  (Formspree, Netlify Forms, your own API) before relying on it.
- **Animation libraries load from a CDN** (GSAP 3.13, ScrollTrigger, Motion 12).
  Self-host them if you need the site to work fully offline or under a strict
  content-security policy.
- **Theme choice is per-browser.** It lives in `localStorage`, so it does not
  follow the visitor between devices, and it is not shared with server-rendered
  pages.
- **Two decorative elements sit below the 4.5:1 contrast ratio** in every theme:
  the `•` separators in the stats band (~2.5:1) and the small italic ampersand in
  the footer (~3.7:1). Both are ornamental and are legible by design intent, but
  raise `--on-2` / `--on-3` in the theme blocks if you want strict AA everywhere.

---

## Browser support

Modern evergreen browsers — Chrome, Edge, Firefox and Safari. The page relies on
CSS custom properties, `clamp()`, `backdrop-filter`, `color-mix()`,
`IntersectionObserver` and `<canvas>`. No polyfills, no transpilation, no IE
support.
