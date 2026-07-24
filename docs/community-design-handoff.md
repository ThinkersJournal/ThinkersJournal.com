# Design-System Handoff → Community Platform (project ②)

**From:** the ThinkersJournal.com marketing website (project ①), repo `ThinkersJournal.com`
**To:** the Community platform `web` app, repo `ThinkersJournal-Community`
**Why this file exists:** a self-contained snapshot of the marketing site's design system, so the Community app can adopt it without reading across repos. **All source paths below are relative to the root of the `ThinkersJournal.com` repo** unless stated otherwise.

---

## 0. Confirmed decisions (these are locked)

- **App host:** the Community app lives on **`community.thinkersjournal.com`** (Eric confirmed, 2026-07-20; chosen over `app.`).
  - Its **canonical origin, host-scoped cookies, and sitemap** must target `community.thinkersjournal.com` — **NOT** `thinkersjournal.com` / `www`. Those two hostnames ARE the static marketing site (Cloudflare Pages); the app cannot claim them as canonical.
  - **Cookies:** host-scoped to `community.thinkersjournal.com`, `Secure` + `HttpOnly` + `SameSite=Lax`. Only domain-scope to `.thinkersjournal.com` if you deliberately need auth shared with the apex — not needed today, and it widens attack surface.
  - **Back-link:** the app's wordmark should link to `https://thinkersjournal.com/` (apex, trailing slash — the marketing site issues 308 canonical `/page` → `/page/` redirects, so always use the trailing-slash form on cross-links).
- **No Tailwind, no CSS framework, no build-time theme magic.** The entire system is plain CSS custom properties + small Astro components. Since your `web` is also Astro, you can copy these files in wholesale.
- **Dark-ONLY.** There is no light theme and no toggle. Grand-piano black background, fluorescent-green mono-accent. Do not add `prefers-color-scheme` branching.

---

## 1. Design tokens — copy verbatim

Source of truth: `src/styles/tokens.css` (one `:root` block):

```css
:root{
  --ink:#060608;
  --ink2:#0a0a0d;
  --green:#3dff95;
  --green-bright:#7dffbc;
  --green-glow:rgba(61,255,149,.5);
  --text:#f3f3f5;
  --muted:#a8a8b3;
  --dim:#7a7a85;
  --head:#fafafc;
  --emph:#e9e9ee;
  --on-green:#03130a;
  --line:rgba(255,255,255,.08);
  --serif:'Fraunces Variable',Georgia,'Times New Roman',serif;
  --sans:'Inter Variable',-apple-system,'Segoe UI',system-ui,sans-serif;
  --wrap:1120px;
}
```

## 2. Global base — copy verbatim

Source of truth: `src/styles/global.css`:

```css
@import './tokens.css';

*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
@media (prefers-reduced-motion: reduce){html{scroll-behavior:auto}
  *{animation-duration:.001ms !important;transition-duration:.001ms !important}}
body{background:var(--ink);color:var(--text);font-family:var(--sans);
  -webkit-font-smoothing:antialiased;overflow-x:hidden;line-height:1.6}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
:focus-visible{outline:2px solid var(--green);outline-offset:3px;border-radius:3px}

.wrap{max-width:var(--wrap);margin:0 auto;padding:0 clamp(20px,5vw,48px)}
.serif{font-family:var(--serif)}
.label{font-family:var(--sans);font-size:12px;font-weight:600;letter-spacing:.24em;
  text-transform:uppercase;color:var(--green);opacity:.95}
em{font-family:var(--serif);font-style:italic;color:var(--green-bright)}

.btn{display:inline-block;font-family:var(--sans);font-size:15px;font-weight:600;
  padding:13px 26px;border-radius:999px;transition:transform .15s ease}
.btn:hover{transform:translateY(-2px)}
.btn-primary{background:var(--green);color:var(--on-green);box-shadow:0 8px 30px -6px var(--green-glow)}
.btn-ghost{background:transparent;color:var(--text);border:1px solid rgba(255,255,255,.22)}
.link{color:var(--green);font-weight:600;font-size:15px}
.link:hover{text-decoration:underline}

h1,h2,h3{font-family:var(--serif);font-weight:500;letter-spacing:-.01em;color:var(--head)}
```

## 3. Fonts — self-hosted via Fontsource (no CDN)

```
npm i @fontsource-variable/fraunces @fontsource-variable/inter
```

Import ONCE in your head component (mirrors `src/components/BaseHead.astro`):

```js
import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter';
```

- **Fraunces** = headings + wordmark (weight 500, `letter-spacing:-.01em`, color `--head`).
- **Inter** = UI + body (`line-height:1.6`, color `--text`).

## 4. Type scale & spacing

- **Type scale is fluid `clamp()`, not fixed steps.** In use: page `h1 = clamp(32px,5.2vw,54px)/1.06`; intro `clamp(16px,2vw,19px)`; body 15–17px; label 12px uppercase tracking `.24em`. Headings inherit serif + `--head` from the `h1,h2,h3` rule above.
- **No numeric spacing-token scale.** Two primitives do the work: (a) the **`.wrap`** container — `max-width:1120px` + side padding `clamp(20px,5vw,48px)`, centered; reuse it for every content column and widths match automatically. (b) fluid section padding via `clamp()`.

---

## 5. Chrome / layout — mirror the shell, NOT the link set

Read these directly:

| File (under `src/` in the `ThinkersJournal.com` repo) | What it is |
|---|---|
| `layouts/BaseLayout.astro` | App shell: `<html><head BaseHead/><body>` Nav + `<main><slot/></main>` + Footer |
| `layouts/PageLayout.astro` | Wraps BaseLayout, adds a "band" header (eyebrow + h1 + intro) with a soft green radial glow. Good for marketing-ish pages; your authed `/feed` probably wants just the BaseLayout shell |
| `components/Nav.astro` | Sticky bar, backdrop-blur `rgba(6,6,8,.72)`, 1px `--line` bottom border, 66px tall; wordmark left, links right, glowing-green "Support" pill; zero-JS mobile disclosure (checkbox + label, burger→X) |
| `components/Footer.astro` | 4-col grid (brand + Explore/Get-involved/Support) → 2-col under 760px, on `#040405` |
| `components/BaseHead.astro` | `<head>`: Fontsource imports, `<title>`, description, canonical, favicon, OG/Twitter meta, `theme-color #060608` |

**IMPORTANT:** do **not** copy the marketing Nav's *link set* (Mission / Offerings / Standards / Dispatches / Support) into the app. The app needs its own nav (Feed, Authors, profile, notifications, sign-out). Preserve the **chrome** — sticky blurred bar, wordmark left, `--line` border, green-pill primary action, same Footer treatment — and swap in your app's links.

### Small shared components (verbatim)

**Wordmark** (`src/components/Wordmark.astro`) — the brand is a typographic wordmark, NOT a logo. No icon logo exists; don't invent one.

```astro
---
interface Props { size?: string }
const { size = '21px' } = Astro.props;
---
<span class="wm" style={`font-size:${size}`}>Thinker's Journal<span class="dot">.</span></span>
<style>
  .wm{font-family:var(--serif);font-weight:500;color:var(--head)}
  .dot{color:var(--green);text-shadow:0 0 14px var(--green-glow)}
</style>
```

**Button** (`src/components/Button.astro`) — styled by the `.btn` rules in `global.css`:

```astro
---
interface Props { href: string; variant?: 'primary' | 'ghost' }
const { href, variant = 'primary' } = Astro.props;
---
<a href={href} class={`btn btn-${variant}`}><slot /></a>
```

**SectionLabel** (`src/components/SectionLabel.astro`) — styled by `.label` in `global.css`:

```astro
---
---
<p class="label"><slot /></p>
```

## 6. Favicon — reuse as-is

Copy `public/favicon.svg` to your web root and link
`<link rel="icon" href="/favicon.svg" type="image/svg+xml">`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#060608"/>
  <text x="15" y="45" font-family="Georgia, serif" font-size="38" fill="#f3f3f5">T</text>
  <circle cx="46" cy="42" r="4.5" fill="#3dff95"/>
</svg>
```

## 7. Accessibility conventions to match

- `:focus-visible` = 2px green outline, offset 3px (in `global.css`).
- `prefers-reduced-motion` kills animations/transitions.
- The marketing mobile nav is zero-JS. Your app is more interactive, but keep the focus-ring + reduced-motion habits.

## 8. Voice / tone

Warm, human, mission-first, plain-spoken — **NOT** developer-jargon. North star: *welcoming to every kind of thinker, not just coders* (Eric explicitly steered the brand away from a dev/terminal feel). Tagline: **"No thinker should have to build alone."** Signature typographic touch: `<em>` renders as italic serif in `--green-bright` — use it for a single emphasized word, sparingly. Read the live copy on `/mission` and `/community` for the register.

---

## 9. Open cross-link loop (needs one thing from you)

When the app has a stable entry URL (e.g. `/feed` for signed-in users, `/choose-username` or `/signup` for new ones), tell the website side and it will wire an **"Open the app / Sign in"** link into the marketing nav + relevant CTAs, pointing at `https://community.thinkersjournal.com`. Today those CTAs ("Help build it", the join buttons) point at the internal `/get-involved` page.

---

*Questions the source doesn't answer → reach the website side directly on the `claude-peers` channel (or route through Eric, who can talk to both sessions).*
