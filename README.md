# Thinker's Journal — website

The public site for [Thinker's Journal](https://www.thinkersjournal.com), a non-profit in formation
that helps thinkers of every kind design, build, and ship the things they're thinking about.
*No thinker should have to build alone.*

It is a static [Astro](https://astro.build) site served by Cloudflare Pages, with a few small
Cloudflare Pages Functions for the parts that need a server.

## What's in it

- **Mission-first pages:** home, `/mission`, `/offerings`, `/community`, `/standards`,
  `/get-involved`, `/support`, `/privacy`, and a branded 404.
- **Dispatches:** the blog, written as Markdown files in `src/content/dispatches/`.
- **Donation avenues:** a card grid on `/support` (Open Collective, Ko-fi, Liberapay).
  Avenues without a working account stay hidden, so the site never shows a dead link.
- **Live donation total:** a small island on `/support` that shows the Open Collective total,
  but only once it passes a floor, so the page never shows "$0".
- **Newsletter signup:** a double-opt-in form on `/dispatches`, backed by Listmonk. It stays
  hidden until the backend is configured, and until then visitors see a plain email fallback.
- **Community cross-links:** "Sign in" and "Open the Community" links to
  `community.thinkersjournal.com`, switched off until the app launches.
- **Security headers,** including a Content-Security-Policy in report-only mode, plus an
  endpoint that receives its violation reports.
- **Accessibility checks:** the test suite runs axe against every page.

## Getting started

You need the Node version in `.nvmrc` (22.16.0).

```sh
npm ci
npm run dev        # dev server at http://localhost:4321
```

## Common tasks

### Build and preview what Cloudflare will serve

```sh
npm run build      # writes the static site to dist/
npm run preview    # serves dist/ at http://localhost:4321
```

The Pages Functions in `functions/` only run on Cloudflare (or under `wrangler pages dev`).
Under `npm run preview`, the `/api/*` routes return 404. Every island treats that as "no data"
and falls back gracefully.

### Run the tests

```sh
npm run build
npm run preview    # leave this running; it daemonizes under Astro 7
npm test           # in a second terminal
```

Playwright is set up to start its own server, but Astro 7's `preview` exits its foreground
process right away, so Playwright gives up with "Process from config.webServer exited early".
Starting `preview` yourself avoids that: Playwright reuses the running server.

`npm test` first runs `scripts/check-tree-freshness.mjs`, which refuses to continue if your
working tree is behind `origin/main` (on `main`, or on a branch that has already been merged).

> ⚠️ **CI does not run this suite yet.** Pull request checks cover the build (Cloudflare Pages)
> and static analysis, not the tests. Run `npm test` yourself before opening a PR.

### Type-check

```sh
npm run check      # astro check
```

This catches problems the tests miss. A green test run is not a clean type-check.

### Publish a dispatch

Add a Markdown file to `src/content/dispatches/`. Its filename becomes the URL slug:

```md
---
title: "What we shipped this month"
description: "One sentence for the index page and social previews."
date: 2026-10-01
draft: false        # optional; true keeps it off the site
---

The body is ordinary Markdown.
```

`src/content/dispatches/welcome.md` → `/dispatches/welcome/`.
The schema lives in `src/content.config.ts`.

### Turn on a donation avenue

Avenues are listed in `SUPPORT` in `src/consts.ts`. An entry without `live: true` stays off the
cards and is named under "More avenues on the way". Once the account exists and its URL works,
set the flag:

```ts
{ label: 'GitHub Sponsors', href: 'https://github.com/sponsors/thinkersjournal',
  note: 'For the devs among us', live: true },
```

The footer updates automatically, and so does the support-page test.

### Turn on the Community links

In `src/consts.ts`, set `APP.live` to `true`. That one change adds the nav "Sign in" link and
the "Open the Community" call to action. Only flip it once `community.thinkersjournal.com`
is ready for public signups.

## Further documentation

| Topic | Where |
|---|---|
| Setting up the newsletter backend (Listmonk, Neon, Postmark, the four env vars, and the redeploy they need) | [`docs/newsletter-provisioning.md`](docs/newsletter-provisioning.md) |
| The site's design: goals, sitemap, visual system, content | [`docs/superpowers/specs/2026-07-13-thinkers-journal-website-design.md`](docs/superpowers/specs/2026-07-13-thinkers-journal-website-design.md) |
| Design handoff to the Community app | [`docs/community-design-handoff.md`](docs/community-design-handoff.md) |
| Open Collective total endpoint | [`functions/api/oc-total.js`](functions/api/oc-total.js) |
| Newsletter subscribe endpoint | [`functions/api/subscribe.js`](functions/api/subscribe.js) |
| CSP violation-report endpoint, and what it deliberately does not record | [`functions/api/csp-report.js`](functions/api/csp-report.js) |
| Security headers and the report-only CSP | [`public/_headers`](public/_headers) |
| The working-tree freshness guard | [`scripts/check-tree-freshness.mjs`](scripts/check-tree-freshness.mjs) |
| Regenerating the logo and favicons | [`scripts/generate-logo.mjs`](scripts/generate-logo.mjs) |
| Regenerating the social-share image | [`scripts/generate-og.mjs`](scripts/generate-og.mjs) |
| Test suites, one per feature | [`tests/`](tests/) |

## Hosting

The site deploys as the Cloudflare **Pages** project `thinkersjournal-com`, which rebuilds on
every push to `main`. The account also has Workers named `thinkersjournal-web` and
`thinkersjournal-api`. Those belong to the Community app, not this site, so don't set this
site's environment variables on them.

## Licence

This repository holds code, prose, and brand material under different terms. In short, code is
`MIT OR Apache-2.0`, dispatches are CC BY 4.0, and site copy and brand assets are reserved.
[`LICENSE.md`](LICENSE.md) has the details, including how to tell which is which when a file
contains both.

## Contact

Open an issue on this repository, or email
[hello@thinkersjournal.com](mailto:hello@thinkersjournal.com).
