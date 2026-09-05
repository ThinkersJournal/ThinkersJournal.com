# Thinker's Journal Website — Implementation Plan

> # ⚠ EXECUTED — HISTORICAL RECORD, NOT A WORK QUEUE
>
> **This plan was carried out in full and the site it describes is live on Cloudflare Pages.**
> **Do not implement it.** Its steps name **42** files; every one of the 42 exists in the
> tree, and the work shipped through PRs #1–#10.
>
> ⚠ **DISCHARGED 2026-09-05.** Until today this document opened with *“REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to
> implement this plan task-by-task”* — and all **83** of its step checkboxes were unticked,
> with `- [x]` appearing **zero** times. **An agent handed this plan read a complete, unstarted
> work queue, and would have begun by creating `package.json` against a live site.**
>
> **The boxes below are now ticked rather than left for the header to explain away.** A header
> does not protect a reader who lands mid-document, and a plan whose every box reads `- [ ]`
> is a work queue no matter what precedes it.
>
> The task-by-task detail is kept deliberately: it is the record of how the site was built and
> what each decision was for. `tests/docs-artifacts.spec.ts` fails if a plan's named artifacts
> all exist while unticked boxes remain.

**Goal:** Build the static Thinker's Journal marketing/mission website — an emotional, mission-first site that makes visitors understand and believe, with gentle join/support asks — and deploy it on Cloudflare Pages.

**Architecture:** Astro static site (zero-JS by default), a small CSS-custom-property design system, reusable `.astro` components, Markdown content collection for the blog ("Dispatches"). Code lives in GitHub (`ThinkersJournal/ThinkersJournal.com`); Cloudflare Pages builds on push via Git integration.

**Tech Stack:** Astro 5, TypeScript (strict), self-hosted Fontsource fonts (Fraunces + Inter), `@astrojs/sitemap`, Playwright + `@axe-core/playwright` for tests.

## Global Constraints

- **Astro:** 5.x. **Node:** ≥ 20. TypeScript `strict`.
- **Rendering:** static output; zero client JS unless a component genuinely needs it (none do in v1).
- **Site URL:** `https://thinkersjournal.com` (set as `site` in `astro.config.mjs`; needed for sitemap/canonical).
- **Color tokens (exact):** `--ink:#060608` `--ink2:#0a0a0d` `--green:#3dff95` `--green-bright:#7dffbc` `--green-glow:rgba(61,255,149,.5)` `--text:#f3f3f5` `--muted:#a8a8b3` `--dim:#7a7a85` `--line:rgba(255,255,255,.08)`.
- **Mono-accent rule:** fluorescent green is the ONLY accent color. Never use pink/purple/orange as backgrounds or washes.
- **Type:** `--serif:'Fraunces Variable',Georgia,'Times New Roman',serif` (wordmark + headlines); `--sans:'Inter Variable',-apple-system,'Segoe UI',system-ui,sans-serif` (UI + body). (Fuller fallback stacks matching the approved mockup + Task 2 code; earlier abbreviated form was shorthand.)
- **Readability:** body copy is `--text`/`--muted` on `--ink`; green is reserved for headings-accents, links, and CTAs — never body text.
- **Wordmark:** the literal string `Thinker's Journal` in `--serif` followed by a green period (`.`).
- **Tagline:** `No thinker should have to build alone.`
- **Naming:** flagship section is **The Community** at `/community`; blog is **Dispatches** at `/dispatches`.
- **Support links (launch set, expandable):** Open Collective, GitHub Sponsors, Ko-fi. Avoid high-fee platforms.
- **Accessibility:** target WCAG AA; honor `prefers-reduced-motion`; semantic landmarks; visible focus; alt text.
- **Canonical visual reference:** `docs/superpowers/specs/assets/2026-07-13-homepage-mockup.html` (approved). Port its CSS/markup; don't reinvent.

---

## File Structure

```
astro.config.mjs            # site URL + sitemap integration
package.json                # scripts + deps
tsconfig.json               # extends astro/tsconfigs/strict
playwright.config.ts        # webServer -> `npm run dev`, chromium
public/
  robots.txt                # (generated in Task 11 or static)
  favicon.svg
src/
  consts.ts                 # site meta, nav items, offerings[], support links[]
  styles/
    tokens.css              # design tokens (CSS custom properties)
    global.css              # reset, base type, body, .btn, .label, utilities
  components/
    BaseHead.astro          # <head>: meta, OG, canonical, font imports
    Nav.astro               # sticky top nav + Support button
    Footer.astro            # footer columns + non-profit line
    Button.astro            # <a> styled as primary/ghost button
    SectionLabel.astro      # green uppercase eyebrow label
    Wordmark.astro          # "Thinker's Journal." with green dot
    home/
      Hero.astro
      Gap.astro
      Offerings.astro
      KissProof.astro
      CommunityTeaser.astro
      Founder.astro
      JoinSupport.astro
  layouts/
    BaseLayout.astro        # <html> shell: head + nav + <slot/> + footer
    PageLayout.astro        # inner-page wrapper: hero band + <slot/>
  content.config.ts         # dispatches collection (glob loader)
  content/
    dispatches/
      welcome.md            # seed post
  pages/
    index.astro             # home
    mission.astro
    offerings.astro
    community.astro
    standards.astro
    get-involved.astro
    support.astro
    dispatches/
      index.astro
      [...slug].astro
    404.astro
tests/
  smoke.spec.ts
  home.spec.ts
  chrome.spec.ts            # nav + footer
  pages.spec.ts             # inner pages
  dispatches.spec.ts
  a11y.spec.ts              # axe sweep across all routes
```

---

### Task 1: Project scaffold + Playwright harness

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `playwright.config.ts`
- Create: `src/pages/index.astro` (temporary placeholder)
- Test: `tests/smoke.spec.ts`

**Interfaces:**
- Produces: npm scripts `dev` (`astro dev`), `build` (`astro build`), `preview`, `check` (`astro check`), `test` (`playwright test`). Dev server on `http://localhost:4321`.

- [x] **Step 1: Create `package.json`**

```json
{
  "name": "thinkersjournal-website",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "playwright test"
  },
  "dependencies": {
    "astro": "^5.0.0",
    "@astrojs/sitemap": "^3.2.0",
    "@fontsource-variable/fraunces": "^5.1.0",
    "@fontsource-variable/inter": "^5.1.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.0",
    "typescript": "^5.6.0",
    "@playwright/test": "^1.48.0",
    "@axe-core/playwright": "^4.10.0"
  }
}
```

- [x] **Step 2: Create `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://thinkersjournal.com',
  integrations: [sitemap()],
});
```

- [x] **Step 3: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [x] **Step 4: Create `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4321' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [x] **Step 5: Create temporary `src/pages/index.astro`**

```astro
---
---
<html lang="en">
  <head><meta charset="utf-8" /><title>Thinker's Journal</title></head>
  <body><h1 data-testid="placeholder">Thinker's Journal</h1></body>
</html>
```

- [x] **Step 6: Write the failing smoke test `tests/smoke.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('home responds and renders the brand name', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('placeholder')).toHaveText("Thinker's Journal");
});
```

- [x] **Step 7: Install dependencies and the browser**

Run: `npm install && npx playwright install chromium`
Expected: installs complete without error.

- [x] **Step 8: Run the smoke test (verify it passes)**

Run: `npm test`
Expected: 1 passed. (If Astro's dev server boots and serves the placeholder, the test is green.)

- [x] **Step 9: Verify a production build succeeds**

Run: `npm run build`
Expected: `astro build` completes, `dist/index.html` produced.

- [x] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Astro project + Playwright harness"
```

---

### Task 2: Design tokens, global styles, fonts

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`
- Modify: `src/pages/index.astro` (import global.css + fonts, add a token probe)
- Test: `tests/smoke.spec.ts` (extend with a computed-style assertion)

**Interfaces:**
- Produces: global classes `.wrap`, `.label`, `.btn`/`.btn-primary`/`.btn-ghost`, `.link`, `.serif`; CSS vars from Global Constraints on `:root`. `--serif` uses `'Fraunces Variable'`, `--sans` uses `'Inter Variable'`.

- [x] **Step 1: Create `src/styles/tokens.css`**

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
  --line:rgba(255,255,255,.08);
  --serif:'Fraunces Variable',Georgia,'Times New Roman',serif;
  --sans:'Inter Variable',-apple-system,'Segoe UI',system-ui,sans-serif;
  --wrap:1120px;
}
```

- [x] **Step 2: Create `src/styles/global.css`** (ported from the approved mockup)

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
.btn-primary{background:var(--green);color:#03130a;box-shadow:0 8px 30px -6px var(--green-glow)}
.btn-ghost{background:transparent;color:var(--text);border:1px solid rgba(255,255,255,.22)}
.link{color:var(--green);font-weight:600;font-size:15px}
.link:hover{text-decoration:underline}

h1,h2,h3{font-family:var(--serif);font-weight:500;letter-spacing:-.01em;color:#fafafc}
```

- [x] **Step 3: Update `src/pages/index.astro` to import fonts + global CSS**

```astro
---
import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter';
import '../styles/global.css';
---
<html lang="en">
  <head><meta charset="utf-8" /><title>Thinker's Journal</title></head>
  <body><h1 data-testid="placeholder" class="serif">Thinker's Journal</h1></body>
</html>
```

- [x] **Step 4: Add a failing token assertion to `tests/smoke.spec.ts`**

```ts
test('body uses the piano-black background token', async ({ page }) => {
  await page.goto('/');
  const bg = await page.evaluate(() =>
    getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(6, 6, 8)'); // #060608
});
```

- [x] **Step 5: Run tests (verify the new one passes)**

Run: `npm test`
Expected: 2 passed. (The background resolves to the token value.)

- [x] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add design tokens, global styles, self-hosted fonts"
```

---

### Task 3: Site constants + Wordmark, Button, SectionLabel atoms

**Files:**
- Create: `src/consts.ts`, `src/components/Wordmark.astro`, `src/components/Button.astro`, `src/components/SectionLabel.astro`
- Test: `tests/chrome.spec.ts`

**Interfaces:**
- Produces:
  - `SITE = { title:string; description:string; url:string }`
  - `NAV: { label:string; href:string }[]`
  - `OFFERINGS: { num:string; title:string; desc:string; soon?:boolean }[]`
  - `SUPPORT: { label:string; href:string; note:string }[]`
  - `<Wordmark />` renders `Thinker's Journal` + green `.` (dot has `data-testid="wm-dot"`).
  - `<Button href variant="primary"|"ghost">slot</Button>`
  - `<SectionLabel>slot</SectionLabel>` → `<p class="label">`.

- [x] **Step 1: Create `src/consts.ts`**

```ts
export const SITE = {
  title: "Thinker's Journal",
  description:
    "A non-profit helping thinkers of every kind design, build, and ship the things they're thinking about. No thinker should have to build alone.",
  url: 'https://thinkersjournal.com',
};

export const NAV: { label: string; href: string }[] = [
  { label: 'Mission', href: '/mission' },
  { label: 'What We Offer', href: '/offerings' },
  { label: 'Standards', href: '/standards' },
  { label: 'Dispatches', href: '/dispatches' },
];

export const OFFERINGS: { num: string; title: string; desc: string; soon?: boolean }[] = [
  { num: '01', title: 'Mentorship', desc: "A hand that's been there — an experienced guide to think through the hard parts with you." },
  { num: '02', title: 'Pairing', desc: "A partner who gets it — matched to your niche, so you're never stuck building alone." },
  { num: '03', title: 'Standards, held in trust', desc: "We steward open standards like KISS so individual thinkers don't have to carry them alone." },
  { num: '04', title: 'Tooling & infrastructure', desc: 'The workshop — hosting for code, docs, and running services so your idea can actually ship.' },
  { num: '05', title: 'The Community', desc: 'Where your work comes alive — document what you’re building with living, precise links others can act on.', soon: true },
];

// NOTE: replace href handles with the real accounts once created.
export const SUPPORT: { label: string; href: string; note: string }[] = [
  { label: 'Open Collective', href: 'https://opencollective.com/thinkersjournal', note: 'Transparent ledger · low fee' },
  { label: 'GitHub Sponsors', href: 'https://github.com/sponsors/thinkersjournal', note: 'For the devs among us' },
  { label: 'Ko-fi', href: 'https://ko-fi.com/thinkersjournal', note: 'One-time, no account needed' },
];
```

- [x] **Step 2: Create `src/components/Wordmark.astro`**

```astro
---
interface Props { size?: string }
const { size = '21px' } = Astro.props;
---
<span class="wm" style={`font-size:${size}`}>Thinker's Journal<span class="dot" data-testid="wm-dot">.</span></span>
<style>
  .wm{font-family:var(--serif);font-weight:500;color:#fafafc}
  .dot{color:var(--green);text-shadow:0 0 14px var(--green-glow)}
</style>
```

- [x] **Step 3: Create `src/components/Button.astro`**

```astro
---
interface Props { href: string; variant?: 'primary' | 'ghost' }
const { href, variant = 'primary' } = Astro.props;
---
<a href={href} class={`btn btn-${variant}`}><slot /></a>
```

- [x] **Step 4: Create `src/components/SectionLabel.astro`**

```astro
---
---
<p class="label"><slot /></p>
```

- [x] **Step 5: Write the failing test `tests/chrome.spec.ts`** (Wordmark portion)

```ts
import { test, expect } from '@playwright/test';

test('wordmark shows the brand name with a green dot', async ({ page }) => {
  await page.goto('/');
  const dot = page.getByTestId('wm-dot').first();
  await expect(dot).toHaveText('.');
  const color = await dot.evaluate((el) => getComputedStyle(el).color);
  expect(color).toBe('rgb(61, 255, 149)'); // #3dff95
});
```

- [x] **Step 6: Render `<Wordmark />` on the placeholder home so the test has something to hit**

In `src/pages/index.astro`, import and use it inside `<body>`:

```astro
---
import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter';
import '../styles/global.css';
import Wordmark from '../components/Wordmark.astro';
---
<html lang="en">
  <head><meta charset="utf-8" /><title>Thinker's Journal</title></head>
  <body><h1 data-testid="placeholder"><Wordmark /></h1></body>
</html>
```

- [x] **Step 7: Run the test (verify it passes)**

Run: `npx playwright test tests/chrome.spec.ts`
Expected: 1 passed.

- [x] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add site constants and Wordmark/Button/SectionLabel atoms"
```

---

### Task 4: Site chrome — BaseHead, Nav, Footer, BaseLayout

**Files:**
- Create: `src/components/BaseHead.astro`, `src/components/Nav.astro`, `src/components/Footer.astro`, `src/layouts/BaseLayout.astro`
- Modify: `src/pages/index.astro` (use `BaseLayout`)
- Test: `tests/chrome.spec.ts` (extend)

**Interfaces:**
- Consumes: `SITE`, `NAV`, `SUPPORT` from `consts.ts`; `<Wordmark />`.
- Produces: `<BaseLayout title?:string description?:string>slot</BaseLayout>` renders `<html lang="en">` with head, a `<header>` nav (role banner), `<main>`, and `<footer>` (role contentinfo).

- [x] **Step 1: Create `src/components/BaseHead.astro`**

```astro
---
import '@fontsource-variable/fraunces';
import '@fontsource-variable/inter';
import '../styles/global.css';
import { SITE } from '../consts';
interface Props { title?: string; description?: string }
const { title, description = SITE.description } = Astro.props;
const fullTitle = title ? `${title} · ${SITE.title}` : `${SITE.title} — No thinker should have to build alone.`;
const canonical = new URL(Astro.url.pathname, Astro.site).href;
---
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{fullTitle}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonical} />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<meta property="og:type" content="website" />
<meta property="og:title" content={fullTitle} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonical} />
<meta name="theme-color" content="#060608" />
```

- [x] **Step 2: Create `src/components/Nav.astro`**

```astro
---
import { NAV } from '../consts';
import Wordmark from './Wordmark.astro';
---
<header class="nav">
  <div class="wrap bar">
    <a href="/" aria-label="Thinker's Journal home"><Wordmark /></a>
    <nav class="links" aria-label="Primary">
      {NAV.map((item) => <a href={item.href}>{item.label}</a>)}
      <a href="/support" class="support">Support</a>
    </nav>
  </div>
</header>
<style>
  .nav{position:sticky;top:0;z-index:40;background:rgba(6,6,8,.72);
    backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
  .bar{display:flex;align-items:center;justify-content:space-between;height:66px;gap:18px}
  .links{display:flex;gap:26px;align-items:center;font-size:14px;color:var(--muted)}
  .links a:hover{color:var(--text)}
  .support{font-size:13.5px;font-weight:600;color:#03130a !important;background:var(--green);
    padding:9px 17px;border-radius:999px;box-shadow:0 0 20px var(--green-glow)}
  @media(max-width:840px){.links a:not(.support){display:none}}
</style>
```

- [x] **Step 3: Create `src/components/Footer.astro`**

```astro
---
import { NAV, SUPPORT } from '../consts';
import Wordmark from './Wordmark.astro';
---
<footer class="ft">
  <div class="wrap grid">
    <div class="brand">
      <Wordmark size="20px" />
      <p>Helping thinkers of every kind design, build, and ship the things they're thinking about.</p>
    </div>
    <div class="col">
      <h4>Explore</h4>
      <a href="/mission">Mission</a>
      <a href="/offerings">What We Offer</a>
      <a href="/standards">Standards</a>
      <a href="/community">The Community</a>
      <a href="/dispatches">Dispatches</a>
    </div>
    <div class="col">
      <h4>Get involved</h4>
      <a href="/get-involved">Volunteer</a>
      <a href="/get-involved#mentor">Become a mentor</a>
      <a href="/standards">Contribute to KISS</a>
    </div>
    <div class="col">
      <h4>Support</h4>
      {SUPPORT.map((s) => <a href={s.href}>{s.label}</a>)}
      <a href="/support">More ways to give →</a>
    </div>
  </div>
  <div class="wrap note">
    <span>Thinker's Journal is a non-profit in formation. <span class="green">Free, at cost, or below market — always.</span></span>
    <span>github.com/thinkersjournal</span>
  </div>
</footer>
<style>
  .ft{background:#040405;border-top:1px solid var(--line);padding:64px 0 40px;margin-top:0}
  .grid{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:34px}
  @media(max-width:760px){.grid{grid-template-columns:1fr 1fr}}
  .brand p{color:var(--dim);font-size:14px;margin-top:12px;max-width:34ch}
  .col h4{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--dim);margin-bottom:14px}
  .col a{display:block;color:var(--muted);font-size:14.5px;padding:5px 0}
  .col a:hover{color:var(--text)}
  .note{margin-top:44px;padding-top:22px;border-top:1px solid var(--line);
    color:var(--dim);font-size:13px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px}
  .note .green{color:var(--green)}
</style>
```

- [x] **Step 4: Create `src/layouts/BaseLayout.astro`**

```astro
---
import BaseHead from '../components/BaseHead.astro';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
interface Props { title?: string; description?: string }
const { title, description } = Astro.props;
---
<html lang="en">
  <head><BaseHead title={title} description={description} /></head>
  <body>
    <Nav />
    <main>
      <slot />
    </main>
    <Footer />
  </body>
</html>
```

- [x] **Step 5: Rewrite `src/pages/index.astro` to use the layout**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout>
  <section class="wrap" style="padding:80px 0">
    <h1 data-testid="placeholder">Thinker's Journal</h1>
  </section>
</BaseLayout>
```

- [x] **Step 6: Extend `tests/chrome.spec.ts` with failing nav + footer assertions**

```ts
test('primary nav exposes the four sections plus Support', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Primary' });
  for (const label of ['Mission', 'What We Offer', 'Standards', 'Dispatches', 'Support']) {
    await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
  }
});

test('footer states the non-profit promise', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('contentinfo'))
    .toContainText('Free, at cost, or below market — always.');
});

test('page has exactly one banner, main, and contentinfo landmark', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('banner')).toHaveCount(1);
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.getByRole('contentinfo')).toHaveCount(1);
});
```

- [x] **Step 7: Run tests (verify they pass)**

Run: `npx playwright test tests/chrome.spec.ts`
Expected: 4 passed.

- [x] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add BaseHead, Nav, Footer, and BaseLayout site chrome"
```

---

### Task 5: Home sections part 1 — Hero, Gap, Offerings, KissProof

**Files:**
- Create: `src/components/home/Hero.astro`, `src/components/home/Gap.astro`, `src/components/home/Offerings.astro`, `src/components/home/KissProof.astro`
- Modify: `src/pages/index.astro`
- Test: `tests/home.spec.ts`

**Interfaces:**
- Consumes: `OFFERINGS` from `consts.ts`; `Button`, `SectionLabel`.
- Produces: four self-contained `<section>` components with no required props.

- [x] **Step 1: Create `src/components/home/Hero.astro`** (ported from the mockup)

```astro
---
import Button from '../Button.astro';
import SectionLabel from '../SectionLabel.astro';
---
<div class="hero">
  <div class="wrap inner">
    <SectionLabel>A home for thinkers</SectionLabel>
    <h1>No thinker should<br />have to build <em>alone.</em></h1>
    <p class="sub">Everyone has an idea worth building — and no way to build it alone. Thinker's Journal gives makers of every kind a mentor who's been there, a partner who gets it, and the tools to bring what's in their heads into the world. Freely, or as close to free as we can make it.</p>
    <div class="cta">
      <Button href="/mission">Explore the mission</Button>
      <Button href="/support" variant="ghost">Support the mission</Button>
    </div>
  </div>
</div>
<style>
  .hero{position:relative;overflow:hidden;text-align:center;
    background:linear-gradient(180deg,#141417 0%,#0a0a0c 42%,#060608 100%)}
  .hero::before{content:"";position:absolute;top:0;left:0;right:0;height:180px;
    background:linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,0));z-index:0}
  .hero::after{content:"";position:absolute;inset:-25% -10% 0;z-index:0;filter:blur(70px);opacity:.8;
    background:radial-gradient(42% 46% at 50% 26%,rgba(61,255,149,.20),transparent 70%),
      radial-gradient(28% 30% at 50% 74%,rgba(61,255,149,.09),transparent 72%)}
  .inner{position:relative;z-index:2;padding:clamp(64px,10vw,120px) 0 clamp(74px,9vw,104px)}
  h1{font-size:clamp(38px,7vw,74px);line-height:1.04;margin-top:24px}
  .sub{font-size:clamp(16px,2.1vw,19px);color:var(--muted);max-width:60ch;margin:26px auto 0}
  .cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:38px}
</style>
```

- [x] **Step 2: Create `src/components/home/Gap.astro`**

```astro
---
import SectionLabel from '../SectionLabel.astro';
---
<section class="gap"><div class="wrap">
  <SectionLabel>The gap</SectionLabel>
  <h2>Most ideas never get built.</h2>
  <p class="big">Not because they weren't good enough.</p>
  <p class="body">But because building alone is brutal. The mentor you couldn't find. The tool you couldn't afford. The bug that beat you at 2 a.m. with no one to ask. Somewhere, quietly, a better version of something just… stops. Thinker's Journal exists to close that gap — to stand beside thinkers so the idea makes it out into the world.</p>
</div></section>
<style>
  .gap{padding:clamp(72px,10vw,120px) 0;border-top:1px solid var(--line)}
  h2{font-size:clamp(28px,4.4vw,46px);line-height:1.1;margin-top:16px;max-width:18ch}
  .big{font-family:var(--serif);font-size:clamp(26px,3.6vw,38px);line-height:1.28;
    color:#e9e9ee;max-width:26ch;margin-top:8px;font-weight:400}
  .body{color:var(--muted);max-width:60ch;margin-top:24px;font-size:17px}
</style>
```

- [x] **Step 3: Create `src/components/home/Offerings.astro`**

```astro
---
import SectionLabel from '../SectionLabel.astro';
import { OFFERINGS } from '../../consts';
---
<section class="offer"><div class="wrap">
  <div class="head">
    <SectionLabel>What we offer</SectionLabel>
    <h2>Five ways we help you build.</h2>
  </div>
  <div class="grid">
    {OFFERINGS.map((o) => (
      <div class="row">
        <div class="num">{o.num}</div>
        <div>
          <h3>{o.title}</h3>
          <div class="desc">{o.desc}</div>
        </div>
        {o.soon && <div class="soon">Coming</div>}
      </div>
    ))}
  </div>
</div></section>
<style>
  .offer{padding:clamp(72px,10vw,120px) 0;border-top:1px solid var(--line)}
  .grid{margin-top:52px}
  .row{display:grid;grid-template-columns:64px 1fr auto;gap:26px;align-items:baseline;
    padding:26px 0;border-top:1px solid var(--line)}
  .row:last-child{border-bottom:1px solid var(--line)}
  .num{font-family:var(--serif);font-size:26px;color:var(--green);font-weight:500}
  h3{font-size:clamp(20px,2.6vw,26px)}
  .desc{color:var(--muted);margin-top:6px;font-size:15.5px;max-width:52ch}
  .soon{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--green);
    border:1px solid rgba(61,255,149,.4);border-radius:999px;padding:4px 10px;white-space:nowrap;align-self:center}
  @media(max-width:720px){.row{grid-template-columns:44px 1fr}.soon{grid-column:2;justify-self:start;margin-top:8px}}
</style>
```

- [x] **Step 4: Create `src/components/home/KissProof.astro`**

```astro
---
import SectionLabel from '../SectionLabel.astro';
---
<section class="proof"><div class="wrap inner">
  <div class="txt">
    <SectionLabel>Already in motion</SectionLabel>
    <h2>We don't just talk about standards. We steward them.</h2>
    <p><strong>KISS — the Kernel Interface Standards Suite</strong> — is the first set of standards we hold in trust: open, shared, and cared for so no single thinker has to carry them alone. It's proof the mission is already real.</p>
  </div>
  <a class="link" href="/standards">See the standards →</a>
</div></section>
<style>
  .proof{background:var(--ink2);padding:clamp(72px,10vw,120px) 0;border-top:1px solid var(--line)}
  .inner{display:flex;gap:40px;align-items:center;flex-wrap:wrap;justify-content:space-between}
  .txt{max-width:60ch}
  h2{font-size:clamp(26px,3.6vw,38px);margin-top:14px}
  p{color:var(--muted);margin-top:16px;font-size:17px}
  strong{color:#e9e9ee}
</style>
```

- [x] **Step 5: Update `src/pages/index.astro` to render these four**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Hero from '../components/home/Hero.astro';
import Gap from '../components/home/Gap.astro';
import Offerings from '../components/home/Offerings.astro';
import KissProof from '../components/home/KissProof.astro';
---
<BaseLayout>
  <Hero />
  <Gap />
  <Offerings />
  <KissProof />
</BaseLayout>
```

- [x] **Step 6: Write failing `tests/home.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('hero shows the tagline and both CTAs', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 }))
    .toContainText('No thinker should');
  await expect(page.getByRole('link', { name: 'Explore the mission' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Support the mission' })).toBeVisible();
});

test('the gap section lands the emotional line', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Most ideas never get built.')).toBeVisible();
});

test('all five offerings render, with The Community marked Coming', async ({ page }) => {
  await page.goto('/');
  for (const t of ['Mentorship', 'Pairing', 'Standards, held in trust', 'Tooling & infrastructure', 'The Community']) {
    await expect(page.getByRole('heading', { name: t })).toBeVisible();
  }
  await expect(page.getByText('Coming', { exact: true })).toBeVisible();
});

test('KISS proof links to the standards page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'See the standards →' }))
    .toHaveAttribute('href', '/standards');
});
```

- [x] **Step 7: Run tests (verify they pass)**

Run: `npx playwright test tests/home.spec.ts`
Expected: 4 passed.

- [x] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add home hero, gap, offerings, and KISS proof sections"
```

---

### Task 6: Home sections part 2 — Community teaser, Founder, Join/Support

**Files:**
- Create: `src/components/home/CommunityTeaser.astro`, `src/components/home/Founder.astro`, `src/components/home/JoinSupport.astro`
- Modify: `src/pages/index.astro`
- Test: `tests/home.spec.ts` (extend)

**Interfaces:**
- Consumes: `SectionLabel`, `Button`.
- Produces: three `<section>` components with no required props.

- [x] **Step 1: Create `src/components/home/CommunityTeaser.astro`** (includes the hover mock post, static)

```astro
---
import SectionLabel from '../SectionLabel.astro';
---
<section class="comm"><div class="wrap inner">
  <div>
    <SectionLabel>The Community</SectionLabel>
    <h2>Soon: a place where your work comes alive.</h2>
    <p>Post about a bug and link the <em>exact</em> file, the exact lines, and the exact error — so a mentor can hover to see it, and click to jump in and help. Not "help, it's broken." Help, it's broken <em>right here.</em></p>
    <p style="margin-top:22px"><a class="link" href="/community">See what we're building →</a></p>
  </div>
  <div class="post">
    <div class="who"><div class="av"></div><div><b>maya_builds</b><span>2 hours ago · stuck on a deploy</span></div></div>
    <div class="msg">Been fighting this for hours. The build passes locally but CI keeps failing on <span class="chip">📄 auth/session.rs : 42–58</span> — pretty sure it's this <span class="ref">@CI error</span>. Anyone free to take a look?</div>
    <div class="tip">▸ hovering <b>@CI&nbsp;error</b></div>
    <div class="tipcard"><span class="err">error[E0499]</span>: cannot borrow `session` as mutable more than once<br />→ auth/session.rs:51 · <span class="dim">CI run #218 · click to open</span></div>
  </div>
</div></section>
<style>
  .comm{padding:clamp(72px,10vw,120px) 0;border-top:1px solid var(--line)}
  .inner{display:grid;grid-template-columns:1.1fr .9fr;gap:54px;align-items:center}
  @media(max-width:860px){.inner{grid-template-columns:1fr;gap:34px}}
  h2{font-size:clamp(28px,4.2vw,44px);margin-top:14px}
  p{color:var(--muted);margin-top:18px;font-size:17px;max-width:52ch}
  .post{background:#0c0c10;border:1px solid var(--line);border-radius:16px;padding:22px;
    box-shadow:0 30px 70px -30px rgba(0,0,0,.8)}
  .who{display:flex;align-items:center;gap:11px}
  .av{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#2a2a30,#141418);border:1px solid var(--line)}
  .who b{font-size:14.5px;color:#f0f0f4;font-weight:600}
  .who span{font-size:12.5px;color:var(--dim);display:block;margin-top:1px}
  .msg{margin-top:16px;font-size:15px;color:#dcdce2;line-height:1.66}
  .ref{color:var(--green);border-bottom:1px dashed rgba(61,255,149,.5);font-weight:500}
  .chip{display:inline-flex;align-items:center;gap:6px;background:rgba(61,255,149,.1);
    border:1px solid rgba(61,255,149,.35);color:var(--green-bright);border-radius:7px;padding:1px 8px;font-size:13px;font-weight:500}
  .tip{margin-top:14px;border-top:1px dashed var(--line);padding-top:13px;font-size:11px;color:var(--dim)}
  .tip b{color:var(--green)}
  .tipcard{margin-top:10px;background:#08080b;border:1px solid var(--line);border-radius:9px;
    padding:11px 13px;font-family:ui-monospace,'SF Mono',Consolas,monospace;font-size:12px;color:#9fbcae}
  .tipcard .err{color:#ff9d9d}
  .tipcard .dim{color:var(--dim)}
</style>
```

- [x] **Step 2: Create `src/components/home/Founder.astro`**

```astro
---
import SectionLabel from '../SectionLabel.astro';
---
<section class="founder"><div class="wrap inner">
  <SectionLabel>Who's behind it</SectionLabel>
  <h2>One programmer, forty-four years in — and a mission too big to keep to himself.</h2>
  <p>Here's the honest truth: there's no funding yet, and no team yet. Just conviction — a belief, earned over a long career, that far too many good ideas die for lack of a little help. Thinker's Journal is being built in the open, one piece at a time.</p>
  <p>If any of this moves you, there's room for you here — as a mentor, a builder, a supporter, or simply someone who believes thinkers shouldn't have to go it alone.</p>
  <div class="sign">— the founder</div>
</div></section>
<style>
  .founder{padding:clamp(72px,10vw,120px) 0;border-top:1px solid var(--line)}
  .inner{max-width:64ch}
  h2{font-size:clamp(26px,3.8vw,40px);margin-top:14px;line-height:1.14}
  p{color:var(--muted);margin-top:20px;font-size:17px}
  .sign{font-family:var(--serif);font-style:italic;color:#d6d6dc;margin-top:22px;font-size:18px}
</style>
```

- [x] **Step 3: Create `src/components/home/JoinSupport.astro`**

```astro
---
import Button from '../Button.astro';
---
<section class="join"><div class="wrap">
  <h2>Be part of the reason<br />no thinker builds alone.</h2>
  <p>Thinker's Journal is built by people who believe in it. Join the mission, or help keep it alive — every bit of either moves us forward.</p>
  <div class="cta">
    <Button href="/get-involved">Join the mission</Button>
    <Button href="/support" variant="ghost">Support the mission</Button>
  </div>
</div></section>
<style>
  .join{padding:clamp(72px,10vw,120px) 0;border-top:1px solid var(--line);text-align:center;
    background:radial-gradient(60% 120% at 50% 0%,rgba(61,255,149,.08),transparent 60%),var(--ink)}
  h2{font-size:clamp(30px,5vw,52px);line-height:1.08}
  p{color:var(--muted);max-width:52ch;margin:20px auto 0;font-size:18px}
  .cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:36px}
</style>
```

- [x] **Step 4: Finalize `src/pages/index.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Hero from '../components/home/Hero.astro';
import Gap from '../components/home/Gap.astro';
import Offerings from '../components/home/Offerings.astro';
import KissProof from '../components/home/KissProof.astro';
import CommunityTeaser from '../components/home/CommunityTeaser.astro';
import Founder from '../components/home/Founder.astro';
import JoinSupport from '../components/home/JoinSupport.astro';
---
<BaseLayout>
  <Hero />
  <Gap />
  <Offerings />
  <KissProof />
  <CommunityTeaser />
  <Founder />
  <JoinSupport />
</BaseLayout>
```

- [x] **Step 5: Extend `tests/home.spec.ts`**

```ts
test('community teaser links to /community', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: "See what we're building →" }))
    .toHaveAttribute('href', '/community');
});

test('join/support band offers both paths', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Join the mission' })).toHaveAttribute('href', '/get-involved');
  await expect(page.getByRole('link', { name: 'Support the mission' })).toHaveAttribute('href', '/support');
});
```

- [x] **Step 6: Run the full home suite**

Run: `npx playwright test tests/home.spec.ts`
Expected: 6 passed.

- [x] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: complete home page (community teaser, founder, join/support)"
```

---

### Task 7: Inner-page layout + Mission and Offerings pages

**Files:**
- Create: `src/layouts/PageLayout.astro`, `src/pages/mission.astro`, `src/pages/offerings.astro`
- Test: `tests/pages.spec.ts`

**Interfaces:**
- Consumes: `BaseLayout`, `SectionLabel`, `OFFERINGS`.
- Produces: `<PageLayout title:string eyebrow:string heading:string intro?:string>slot</PageLayout>` — renders a compact hero band (`<h1>` = `heading`) then the slotted body inside `.wrap`.

- [x] **Step 1: Create `src/layouts/PageLayout.astro`**

```astro
---
import BaseLayout from './BaseLayout.astro';
import SectionLabel from '../components/SectionLabel.astro';
interface Props { title: string; eyebrow: string; heading: string; intro?: string }
const { title, eyebrow, heading, intro } = Astro.props;
---
<BaseLayout title={title}>
  <div class="band"><div class="wrap">
    <SectionLabel>{eyebrow}</SectionLabel>
    <h1>{heading}</h1>
    {intro && <p class="intro">{intro}</p>}
  </div></div>
  <div class="wrap body"><slot /></div>
</BaseLayout>
<style>
  .band{padding:clamp(56px,8vw,96px) 0 clamp(30px,4vw,44px);
    background:linear-gradient(180deg,#111114 0%,#060608 100%);
    border-bottom:1px solid var(--line);position:relative;overflow:hidden}
  .band::after{content:"";position:absolute;inset:-40% -10% 0;filter:blur(70px);opacity:.6;z-index:0;
    background:radial-gradient(36% 60% at 22% 20%,rgba(61,255,149,.14),transparent 70%)}
  .band .wrap{position:relative;z-index:2}
  h1{font-size:clamp(32px,5.2vw,54px);line-height:1.06;margin-top:16px}
  .intro{color:var(--muted);font-size:clamp(16px,2vw,19px);margin-top:20px;max-width:60ch}
  .body{padding:clamp(48px,7vw,88px) 0}
</style>
```

- [x] **Step 2: Create `src/pages/mission.astro`**

```astro
---
import PageLayout from '../layouts/PageLayout.astro';
---
<PageLayout
  title="Mission"
  eyebrow="Our mission"
  heading="No thinker should have to build alone."
  intro="Thinker's Journal is a non-profit that helps thinkers of every kind bring what's in their heads into the world — free, at cost, or below market.">
  <div class="prose">
    <p>Every day, someone has an idea worth building — and no way to build it alone. We exist for them: the programmers, the makers, the quietly relentless people who can't stop turning a better version of something over in their minds.</p>
    <p>We give them what they've been missing — a mentor who's been there, a partner who <em>gets it</em>, the tools to build, and a place to be taken seriously — offered freely, or as close to free as we can make it. Because a good idea should never die for lack of help.</p>
    <p>We started with programmers, because that's where our roots run forty-four years deep. But the mission is bigger than any one craft: <strong>no thinker should have to build alone.</strong></p>
    <h2>Why non-profit</h2>
    <p>Charging market rates would put us out of reach of the very people we exist to help. So we don't. Thinker's Journal is a non-profit in formation, funded by people who believe in the mission, run as leanly and transparently as we can manage.</p>
  </div>
</PageLayout>
<style>
  .prose{max-width:66ch}
  .prose p{color:var(--muted);font-size:17px;margin-bottom:20px}
  .prose strong{color:#e9e9ee}
  .prose h2{font-size:clamp(24px,3.4vw,32px);margin:40px 0 4px}
</style>
```

- [x] **Step 3: Create `src/pages/offerings.astro`**

```astro
---
import PageLayout from '../layouts/PageLayout.astro';
import { OFFERINGS } from '../consts';
---
<PageLayout
  title="What We Offer"
  eyebrow="What we offer"
  heading="Five ways we help you build."
  intro="Some of these are here today; others are on the way. All of them exist to close the gap between a thinker and a finished thing.">
  <div class="list">
    {OFFERINGS.map((o) => (
      <div class="row">
        <div class="num">{o.num}</div>
        <div>
          <h2>{o.title}{o.soon && <span class="soon">Coming</span>}</h2>
          <p>{o.desc}</p>
        </div>
      </div>
    ))}
  </div>
</PageLayout>
<style>
  .row{display:grid;grid-template-columns:64px 1fr;gap:26px;align-items:baseline;
    padding:28px 0;border-top:1px solid var(--line)}
  .row:last-child{border-bottom:1px solid var(--line)}
  .num{font-family:var(--serif);font-size:26px;color:var(--green)}
  h2{font-size:clamp(21px,2.8vw,28px)}
  .soon{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--green);
    border:1px solid rgba(61,255,149,.4);border-radius:999px;padding:3px 9px;margin-left:12px;vertical-align:middle}
  p{color:var(--muted);margin-top:8px;font-size:16px;max-width:58ch}
</style>
```

- [x] **Step 4: Write failing `tests/pages.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('mission page renders with the mission heading', async ({ page }) => {
  await page.goto('/mission');
  await expect(page.getByRole('heading', { level: 1 }))
    .toContainText('No thinker should have to build alone.');
  await expect(page).toHaveTitle(/Mission · Thinker's Journal/);
});

test('offerings page lists all five offerings', async ({ page }) => {
  await page.goto('/offerings');
  for (const t of ['Mentorship', 'Pairing', 'Standards, held in trust', 'Tooling & infrastructure', 'The Community']) {
    await expect(page.getByRole('heading', { name: new RegExp(t) })).toBeVisible();
  }
});
```

- [x] **Step 5: Run tests (verify they pass)**

Run: `npx playwright test tests/pages.spec.ts`
Expected: 2 passed.

- [x] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add PageLayout, Mission page, Offerings page"
```

---

### Task 8: Standards and Community pages

**Files:**
- Create: `src/pages/standards.astro`, `src/pages/community.astro`
- Test: `tests/pages.spec.ts` (extend)

**Interfaces:**
- Consumes: `PageLayout`.

- [x] **Step 1: Create `src/pages/standards.astro`**

```astro
---
import PageLayout from '../layouts/PageLayout.astro';
---
<PageLayout
  title="Standards"
  eyebrow="Standards, held in trust"
  heading="Standards no one should have to carry alone."
  intro="Good standards outlive any one project. We steward them in the open so individual thinkers don't have to shoulder that weight themselves.">
  <div class="prose">
    <h2>KISS — the Kernel Interface Standards Suite</h2>
    <p>KISS is the first suite of standards Thinker's Journal holds in trust. It lives in the open on GitHub, where anyone can read, use, and contribute to it.</p>
    <p><a class="link" href="https://github.com/thinkersjournal">Browse KISS on GitHub →</a></p>
    <h2>More to come</h2>
    <p>KISS is a beginning, not the whole story. As thinkers bring standards worth protecting, this is where they'll find a steward.</p>
  </div>
</PageLayout>
<style>
  .prose{max-width:66ch}
  .prose h2{font-size:clamp(23px,3.2vw,30px);margin:8px 0 4px}
  .prose h2 + p, .prose p{color:var(--muted);font-size:17px;margin:14px 0 30px}
</style>
```

- [x] **Step 2: Create `src/pages/community.astro`**

```astro
---
import PageLayout from '../layouts/PageLayout.astro';
import Button from '../components/Button.astro';
---
<PageLayout
  title="The Community"
  eyebrow="The Community · Coming"
  heading="Where your work comes alive."
  intro="The flagship we're building toward: a place for thinkers to document what they're making — with living, precise links others can actually act on.">
  <div class="prose">
    <p>Imagine posting about a problem the way you'd post anywhere — but able to point at the <em>exact</em> thing: this file, these lines, that specific error. A reader hovers to preview it, or clicks to open it in the right place and start helping.</p>
    <p>References reach beyond us, too — your code and running services here, your work on GitHub, GitLab, YouTube, and the open web — so your whole body of work can be seen, understood, and built on. The one rule: nothing linked is inherently harmful.</p>
    <p>It's a big build, and it's coming in stages. If it excites you, the best thing you can do is come help make it real.</p>
    <div class="cta"><Button href="/get-involved">Help build it</Button></div>
  </div>
</PageLayout>
<style>
  .prose{max-width:66ch}
  .prose p{color:var(--muted);font-size:17px;margin-bottom:20px}
  .cta{margin-top:32px}
</style>
```

- [x] **Step 3: Extend `tests/pages.spec.ts`**

```ts
test('standards page links to the GitHub org', async ({ page }) => {
  await page.goto('/standards');
  await expect(page.getByRole('link', { name: 'Browse KISS on GitHub →' }))
    .toHaveAttribute('href', 'https://github.com/thinkersjournal');
});

test('community page explains the flagship and links to get-involved', async ({ page }) => {
  await page.goto('/community');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Where your work comes alive.');
  await expect(page.getByRole('link', { name: 'Help build it' })).toHaveAttribute('href', '/get-involved');
});
```

- [x] **Step 4: Run tests (verify they pass)**

Run: `npx playwright test tests/pages.spec.ts`
Expected: 4 passed.

- [x] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Standards and Community pages"
```

---

### Task 9: Get Involved and Support pages

**Files:**
- Create: `src/pages/get-involved.astro`, `src/pages/support.astro`
- Test: `tests/pages.spec.ts` (extend)

**Interfaces:**
- Consumes: `PageLayout`, `SUPPORT` from `consts.ts`.

- [x] **Step 1: Create `src/pages/get-involved.astro`**

```astro
---
import PageLayout from '../layouts/PageLayout.astro';
const ROLES = [
  { id: 'mentor', title: 'Become a mentor', body: "Give a few hours to think through a hard problem with someone who's stuck. Experience is the gift here." },
  { id: 'build', title: 'Help build', body: 'Designers, engineers, writers — the website, the tooling, and the Community platform all need hands.' },
  { id: 'standards', title: 'Contribute to KISS', body: 'Shape the standards we steward. Read, critique, and propose in the open on GitHub.' },
  { id: 'spread', title: 'Spread the word', body: "Tell one thinker who needs to hear that they don't have to build alone. That's how this grows." },
];
---
<PageLayout
  title="Get Involved"
  eyebrow="Get involved"
  heading="There's room for you here."
  intro="Thinker's Journal is one person and a mission. It becomes a movement when others step in. Here's where you'd fit.">
  <div class="roles">
    {ROLES.map((r) => (
      <div class="role" id={r.id}>
        <h2>{r.title}</h2>
        <p>{r.body}</p>
      </div>
    ))}
  </div>
  <p class="contact">Ready, or just curious? Email <a class="link" href="mailto:hello@thinkersjournal.com">hello@thinkersjournal.com</a> or open an issue on <a class="link" href="https://github.com/thinkersjournal">GitHub</a>.</p>
</PageLayout>
<style>
  .roles{display:grid;grid-template-columns:1fr 1fr;gap:20px}
  @media(max-width:680px){.roles{grid-template-columns:1fr}}
  .role{border:1px solid var(--line);border-radius:14px;padding:24px;background:var(--ink2)}
  .role h2{font-size:clamp(19px,2.4vw,23px)}
  .role p{color:var(--muted);margin-top:10px;font-size:15.5px}
  .contact{color:var(--muted);margin-top:34px;font-size:16px}
</style>
```

- [x] **Step 2: Create `src/pages/support.astro`**

```astro
---
import PageLayout from '../layouts/PageLayout.astro';
import { SUPPORT } from '../consts';
---
<PageLayout
  title="Support"
  eyebrow="Support the mission"
  heading="Keep the door open for the next thinker."
  intro="Thinker's Journal has no funding yet. Every contribution — of any size, through whichever avenue suits you — goes straight toward keeping our help free or below market. We deliberately favor low-fee platforms so more of your gift arrives.">
  <div class="grid">
    {SUPPORT.map((s) => (
      <a class="card" href={s.href} target="_blank" rel="noopener">
        <div class="name">{s.label}</div>
        <div class="note">{s.note}</div>
        <div class="go">Give →</div>
      </a>
    ))}
  </div>
  <p class="foot">Prefer another way to give, or want to sponsor something specific? Reach out at <a class="link" href="mailto:hello@thinkersjournal.com">hello@thinkersjournal.com</a> — we'll add more avenues here over time.</p>
</PageLayout>
<style>
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px}
  .card{border:1px solid var(--line);border-radius:14px;padding:24px;background:var(--ink2);
    transition:transform .15s ease,border-color .2s ease}
  .card:hover{transform:translateY(-3px);border-color:rgba(61,255,149,.45)}
  .name{font-family:var(--serif);font-size:21px;color:#fafafc}
  .note{color:var(--muted);font-size:14px;margin-top:8px}
  .go{color:var(--green);font-weight:600;font-size:14px;margin-top:18px}
  .foot{color:var(--muted);margin-top:32px;font-size:16px;max-width:60ch}
</style>
```

- [x] **Step 3: Extend `tests/pages.spec.ts`**

```ts
test('get-involved offers a mentor role anchor', async ({ page }) => {
  await page.goto('/get-involved');
  await expect(page.locator('#mentor')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Become a mentor' })).toBeVisible();
});

test('support page shows all configured giving avenues', async ({ page }) => {
  await page.goto('/support');
  for (const name of ['Open Collective', 'GitHub Sponsors', 'Ko-fi']) {
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  }
});
```

- [x] **Step 4: Run tests (verify they pass)**

Run: `npx playwright test tests/pages.spec.ts`
Expected: 6 passed.

- [x] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Get Involved and Support pages"
```

---

### Task 10: Dispatches (blog) — collection, index, post route, seed post

**Files:**
- Create: `src/content.config.ts`, `src/content/dispatches/welcome.md`, `src/pages/dispatches/index.astro`, `src/pages/dispatches/[...slug].astro`
- Test: `tests/dispatches.spec.ts`

**Interfaces:**
- Consumes: `PageLayout`, `astro:content` (`getCollection`, `render`).
- Produces: collection `dispatches` with schema `{ title:string; description:string; date:Date; draft?:boolean }`. Post URLs are `/dispatches/<slug>`.

- [x] **Step 1: Create `src/content.config.ts`**

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const dispatches = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/dispatches' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { dispatches };
```

- [x] **Step 2: Create the seed post `src/content/dispatches/welcome.md`**

```markdown
---
title: "Why Thinker's Journal exists"
description: "The short version of a long conviction: no thinker should have to build alone."
date: 2026-07-13
---

Most ideas never get built — not because they weren't good enough, but because
building alone is brutal. Thinker's Journal is here to change that, one thinker
at a time.

More soon. If the mission moves you, [there's room for you here](/get-involved).
```

- [x] **Step 3: Create the list page `src/pages/dispatches/index.astro`**

```astro
---
import PageLayout from '../../layouts/PageLayout.astro';
import { getCollection } from 'astro:content';
const posts = (await getCollection('dispatches', ({ data }) => !data.draft))
  .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
const fmt = (d: Date) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
---
<PageLayout
  title="Dispatches"
  eyebrow="Dispatches"
  heading="Notes from the workshop."
  intro="Occasional writing on the mission, the build, and the thinkers we're here for.">
  <ul class="list">
    {posts.map((p) => (
      <li>
        <a href={`/dispatches/${p.id}`}>
          <span class="date">{fmt(p.data.date)}</span>
          <span class="title">{p.data.title}</span>
          <span class="desc">{p.data.description}</span>
        </a>
      </li>
    ))}
  </ul>
</PageLayout>
<style>
  .list{list-style:none;max-width:70ch}
  .list li{border-top:1px solid var(--line)}
  .list li:last-child{border-bottom:1px solid var(--line)}
  .list a{display:block;padding:24px 0}
  .list a:hover .title{color:var(--green)}
  .date{display:block;font-size:12.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--dim)}
  .title{display:block;font-family:var(--serif);font-size:22px;color:#fafafc;margin-top:6px;transition:color .15s}
  .desc{display:block;color:var(--muted);font-size:15.5px;margin-top:8px}
</style>
```

- [x] **Step 4: Create the post route `src/pages/dispatches/[...slug].astro`**

```astro
---
import PageLayout from '../../layouts/PageLayout.astro';
import { getCollection, render } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('dispatches', ({ data }) => !data.draft);
  return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
}

const { post } = Astro.props;
const { Content } = await render(post);
const fmt = (d: Date) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
---
<PageLayout
  title={post.data.title}
  eyebrow={fmt(post.data.date)}
  heading={post.data.title}
  intro={post.data.description}>
  <article class="prose"><Content /></article>
  <p class="back"><a class="link" href="/dispatches">← All dispatches</a></p>
</PageLayout>
<style>
  .prose{max-width:68ch}
  .prose :global(p){color:var(--muted);font-size:17px;margin-bottom:20px;line-height:1.7}
  .prose :global(a){color:var(--green);text-decoration:underline}
  .prose :global(h2){font-size:clamp(23px,3.2vw,30px);margin:36px 0 4px}
  .back{margin-top:40px}
</style>
```

- [x] **Step 5: Write failing `tests/dispatches.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('dispatches index lists the welcome post', async ({ page }) => {
  await page.goto('/dispatches');
  await expect(page.getByRole('link', { name: /Why Thinker's Journal exists/ })).toBeVisible();
});

test('a dispatch post renders its body and a back link', async ({ page }) => {
  await page.goto('/dispatches');
  await page.getByRole('link', { name: /Why Thinker's Journal exists/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText("Why Thinker's Journal exists");
  await expect(page.getByRole('link', { name: '← All dispatches' })).toBeVisible();
});
```

- [x] **Step 6: Run tests (verify they pass)**

Run: `npx playwright test tests/dispatches.spec.ts`
Expected: 2 passed.

- [x] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Dispatches blog (collection, index, post route, seed post)"
```

---

### Task 11: 404 page, favicon, robots.txt

**Files:**
- Create: `src/pages/404.astro`, `public/favicon.svg`, `public/robots.txt`
- Test: `tests/pages.spec.ts` (extend)

**Interfaces:**
- Consumes: `BaseLayout`, `Button`.

- [x] **Step 1: Create `src/pages/404.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Button from '../components/Button.astro';
---
<BaseLayout title="Not found">
  <section class="wrap nf">
    <p class="label">404</p>
    <h1>This path hasn't been built yet.</h1>
    <p class="sub">Fitting, maybe — but let's get you back to solid ground.</p>
    <div class="cta"><Button href="/">Back to the mission</Button></div>
  </section>
</BaseLayout>
<style>
  .nf{padding:clamp(90px,14vw,180px) 0;text-align:center}
  h1{font-size:clamp(30px,5vw,50px);margin-top:16px}
  .sub{color:var(--muted);margin-top:16px;font-size:18px}
  .cta{margin-top:32px}
</style>
```

- [x] **Step 2: Create `public/favicon.svg`** (piano-black tile with a green "T.")

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#060608"/>
  <text x="15" y="45" font-family="Georgia, serif" font-size="38" fill="#f3f3f5">T</text>
  <circle cx="46" cy="42" r="4.5" fill="#3dff95"/>
</svg>
```

- [x] **Step 3: Create `public/robots.txt`**

```text
User-agent: *
Allow: /

Sitemap: https://thinkersjournal.com/sitemap-index.xml
```

- [x] **Step 4: Extend `tests/pages.spec.ts` with a 404 assertion**

```ts
test('unknown routes render the branded 404', async ({ page }) => {
  const res = await page.goto('/no-such-page');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText("hasn't been built yet");
});
```

- [x] **Step 5: Run tests (verify they pass)**

Run: `npx playwright test tests/pages.spec.ts`
Expected: 7 passed. (Astro serves `404.astro` for unknown routes under `astro dev`.)

- [x] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add 404 page, favicon, robots.txt"
```

---

### Task 12: Full-site verification — a11y sweep, type check, production build

**Files:**
- Create: `tests/a11y.spec.ts`
- Test: all suites + `astro check` + `astro build`

**Interfaces:**
- Consumes: every route built in prior tasks.

- [x] **Step 1: Write `tests/a11y.spec.ts` (axe across all routes)**

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = ['/', '/mission', '/offerings', '/community', '/standards', '/get-involved', '/support', '/dispatches'];

for (const route of ROUTES) {
  test(`no serious accessibility violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
    expect(serious, JSON.stringify(serious.map((v) => v.id), null, 2)).toEqual([]);
  });
}
```

- [x] **Step 2: Run the a11y sweep**

Run: `npx playwright test tests/a11y.spec.ts`
Expected: all routes pass. If any fail, fix the offending markup (commonly: color contrast, missing landmark, or link-name) and re-run.

- [x] **Step 3: Run the full test suite**

Run: `npm test`
Expected: all specs green (smoke, chrome, home, pages, dispatches, a11y).

- [x] **Step 4: Type/diagnostics check**

Run: `npm run check`
Expected: `astro check` reports 0 errors.

- [x] **Step 5: Production build**

Run: `npm run build`
Expected: build succeeds; `dist/` contains `index.html`, each page, `dispatches/welcome/index.html`, and `sitemap-index.xml`.

- [x] **Step 6: Commit**

```bash
git add -A
git commit -m "test: full-site accessibility sweep; verify type check and build"
```

- [x] **Step 7: Push**

```bash
git push
```

---

## Deployment (manual, one-time — after Task 12)

Not a code task; do this in the Cloudflare dashboard once the repo is green:

1. **Workers & Pages → Create → Pages → Connect to Git** → select `ThinkersJournal/ThinkersJournal.com`.
2. Build settings — Framework preset: **Astro**; Build command: `npm run build`; Output dir: `dist`.
3. Deploy. Confirm the `*.pages.dev` preview looks right.
4. **Custom domains** → add `thinkersjournal.com` and `www.thinkersjournal.com` (Cloudflare DNS auto-configures since the zone is already on Cloudflare).
5. Verify every PR now gets a preview URL automatically.

---

## Self-Review

**1. Spec coverage** — every spec section maps to a task:
- Goals/voice/mission copy → Tasks 5–9 (home + mission).
- Sitemap (8 pages) → Tasks 5–11 (Home, Mission, Offerings, Community, Standards, Dispatches, Get Involved, Support; Contact folded into footer/Get Involved per spec).
- Homepage narrative (8 sections) → Tasks 5–6.
- Visual system (tokens, fonts, wordmark, mono-accent, a11y) → Tasks 2–3, verified in Task 12.
- Tech architecture (Astro, GitHub, Cloudflare Pages, sitemap, static) → Tasks 1, 11, and the Deployment section.
- Support strategy (low-fee, expandable) → Task 9 + `SUPPORT` in Task 3.
- Performance/SEO (semantic HTML, meta/OG, sitemap, robots) → Tasks 4, 11.
- Out-of-scope (platform, CMS, i18n, live donation total) → correctly absent.

**2. Placeholder scan** — no "TBD/TODO/handle edge cases" steps; every code step has complete code. The `SUPPORT` hrefs and `hello@thinkersjournal.com` are real starter values flagged in the spec's open questions (swap real handles when accounts exist) — not plan placeholders.

**3. Type consistency** — `PageLayout` props (`title`, `eyebrow`, `heading`, `intro`) are used consistently in Tasks 7–10; `OFFERINGS`/`SUPPORT`/`NAV` shapes defined in Task 3 match every consumer; content-collection field names (`title`, `description`, `date`, `draft`) match the seed post front-matter and the index/route usage; `render`/`getCollection` from `astro:content` and `post.id` usage align with Astro 5.

No gaps found.
