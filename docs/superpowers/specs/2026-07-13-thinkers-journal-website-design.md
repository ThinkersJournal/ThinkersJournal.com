# Thinker's Journal — Website Design Spec

- **Date:** 2026-07-13
- **Status:** Approved design, ready for implementation planning
- **Scope:** The public **marketing/mission website** only (project ① of 2). The **Community platform** (project ②) is a separate, later design cycle — see "Relationship to the platform" below.

---

## 1. Overview & context

Thinker's Journal is a non-profit (in formation) that helps thinkers of every kind — starting with programmers — design, build, and ship the things they're thinking about, offered free, at cost, or below market. It is currently a solo, unfunded effort by a founder with 44 years as a programmer.

The overall vision has **two distinct deliverables**:

| | ① **The Website** (this spec) | ② **The Community platform** (separate cycle) |
|---|---|---|
| Nature | Static marketing/mission site | Dynamic social publishing platform |
| Job | Explain the mission; recruit & support | Where members publish and interact |
| Build | Weeks | Many months → years |

This spec covers **only the website**. It is the public front door that explains the mission, earns trust, and turns visitors into supporters and collaborators — and, later, the launchpad that links into the platform.

## 2. Goals & success

- **Primary goal:** make a visitor *understand and believe* the mission — an emotional, mission-first experience that "gently tugs at the heart-strings."
- **Secondary (gentle, ever-present):** invite people to **join / get involved** and to **support / donate**.
- **Success looks like:** a first-time visitor immediately grasps what Thinker's Journal is, feels the mission, and knows how to help or be helped.

**Non-goals (v1):** it is *not* a services storefront (most services are still aspirational and stated honestly as such); it is *not* the platform; no user accounts or user-generated content.

## 3. Audience & voice

- **Audience:** thinkers/makers of every kind (programmers first), plus potential volunteers, mentors, and donors.
- **Brand principle (important):** the brand must **not feel tied to developers/coders**. The mission is bigger than any one craft — the site must feel welcoming to *all* thinkers. (This principle drove the visual direction; see §6.)
- **Voice:** warm, plainspoken, quietly confident, restrained. Never corporate, never salesy. Short sentences that breathe. Elegance through restraint.

## 4. Information architecture / sitemap

Multi-page, with room to grow, kept disciplined.

| Page | Path | Purpose |
|---|---|---|
| Home | `/` | The full narrative (see §5) |
| Mission | `/mission` | The deeper "why," values, the non-profit stance, founder's *About* |
| What We Offer | `/offerings` | The five offerings in depth |
| The Community | `/community` | The flagship platform's vision (the @-reference story) |
| Standards | `/standards` | KISS and future suites; links into the GitHub org |
| Dispatches | `/dispatches` | The blog (named "Dispatches" so "the Journal"/brand never collides with a blog) |
| Get Involved | `/get-involved` | Volunteer, mentor, co-found, contribute to standards |
| Support | `/support` | The expandable, low-fee giving grid + transparency |

**Naming decisions:**
- The flagship platform section is **"The Community"** (not "the Journal") — "community" is what turns a website into a movement.
- The blog is **"Dispatches"** to avoid colliding with the brand name / the platform.

**Primary nav (~5 items):** Mission · What We Offer · Standards · Dispatches · **Support** (a glowing green button, always visible). "What We Offer" can group Offerings / The Community. Contact folds into the footer and Get Involved.

## 5. Homepage narrative (approved)

One emotional arc — *problem → promise → proof → invitation.* The **approved full mockup** is preserved at `docs/superpowers/specs/assets/2026-07-13-homepage-mockup.html` (canonical visual reference; open in a browser).

1. **Hero** — the promise: *"No thinker should have to build alone."* + condensed mission + two CTAs (*Explore the mission* / *Support the mission*).
2. **The Gap** — the ache: *"Most ideas never get built… not because they weren't good enough,"* then the 2 a.m.-bug beat. The heart-strings moment.
3. **What We Offer** — the five, as a numbered list with green numerals; The Community tagged *Coming*.
4. **Already in Motion (KISS proof)** — *"We don't just talk about standards. We steward them,"* with "See the standards →" linking to GitHub.
5. **The Community** — flagship teaser told through the @-reference story, with a small **mock post** showing a hover-preview of a linked CI error.
6. **Who's Behind It** — the honest founder's note (44 years; no funding yet, no team yet; building in the open; "there's room for you here"). Signed "— the founder"; the full *About* lives on `/mission`, not the front page.
7. **Join / Support** — the gentle dual ask.
8. **Footer** — full nav, Get Involved, low-fee Support links + "More ways to give →", and the non-profit line: *"Free, at cost, or below market — always."*

## 6. Visual design system

**Direction:** high-gloss "grand-piano black" with a **single signature accent** — refined, editorial, warm-but-restrained. (Explored as "Editorial Aurora," then deliberately reduced to **green-only** after the multi-color background was rejected as a "rainbow" look to avoid. Mono-accent reads as more disciplined and high-end.)

**Color tokens (CSS custom properties):**
```
--ink:   #060608   /* piano black (page)      */
--ink2:  #0a0a0d   /* slightly raised panels  */
--green: #3dff95   /* signature accent        */
--green-bright: #7dffbc  /* italic/emphasis    */
--text:  #f3f3f5   /* primary text (near-white) */
--muted: #a8a8b3   /* secondary text          */
--dim:   #7a7a85   /* tertiary/labels         */
--line:  rgba(255,255,255,.08) /* hairlines   */
```
- **Mono-accent discipline:** fluorescent green is the *only* accent color. The other brights from the original brief (pink/purple/orange) are **not** used as backgrounds or washes; at most a rare, deliberate single-element accent if ever needed.
- **Gloss:** a subtle white sheen across the very top of the hero (lacquer), plus a single restrained green radial glow for depth.

**Typography (web fonts):**
- **Fraunces** (modern editorial serif) — wordmark + headlines. This is the biggest signal of "ideas & thinkers," not "code."
- **Inter** (humanist sans) — UI, nav, body.
- **Wordmark:** "Thinker's Journal" in Fraunces with a **green period**. Typographic for now; a custom logo can be swapped in later.

**Accessibility:** body copy is white/off-white on black (never green body text); green is reserved for headings, links, accents, and CTAs. Target **WCAG AA** contrast. Honor `prefers-reduced-motion` (motion is limited to subtle hover lifts). Semantic landmarks, visible focus states, alt text.

## 7. Technical architecture

- **Framework:** **Astro** — static-first, zero-JS by default, component-based, built-in content collections for Dispatches, full CSS control, and an islands model for future interactivity.
- **Code + deploy:** code in a **GitHub repo** in the `thinkersjournal` org; **Cloudflare Pages** connects via its **Git integration** and builds on every push, with automatic **PR/branch preview URLs**. (GitHub's code tooling + Cloudflare's CDN/previews. No GitHub Pages — it can't do SSR or previews.)
- **Domain / DNS:** apex + `www` on Cloudflare Pages; Cloudflare provides CDN, SSL, and DNS. The same DNS later routes feature subdomains to the OVH VPS or Cloudflare Workers.
- **Design tokens:** the palette lives in CSS custom properties (one file) so the look is easy to re-tune.
- **Progressive dynamic bits (Astro islands, later):** a live Open Collective donation total, a contact/newsletter handler, a KISS standards browser, and eventually an embedded Community demo — each an island calling a **Cloudflare Worker / Pages Function** backed by **KV / D1 / R2** (all free at this scale). **Static now, dynamic later, no rewrite.**

**Relationship to the platform:** the website and the Community platform are **separate Astro apps** sharing one **design system** (tokens, wordmark, components) so they feel like one brand. The platform (project ②) is decided as **Option B**: Cloudflare Workers for compute + Postgres via Hyperdrive + R2 + KV/Durable Objects (see project memory). Nothing in the platform is built in this cycle.

## 8. Support / donations

- **Maximize** low-fee giving avenues; **avoid** high-fee platforms.
- Launch set: **Open Collective**, **GitHub Sponsors**, **Ko-fi**. Rendered as an **expandable grid** so adding more (Liberapay, direct, etc.) is trivial. A "More ways to give →" affordance.
- Framing: non-profit transparency; "Free, at cost, or below market — always."

## 9. Performance & SEO

- Static + zero-JS default → fast loads (reinforces credibility).
- Semantic HTML, per-page `<title>`/meta/OpenGraph tags, `sitemap.xml`, `robots.txt`. (SEO for user-generated content is the platform's concern, not this site's.)

## 10. Out of scope / YAGNI (v1)

- The Community platform and anything dynamic that requires it (accounts, auth, posts, comments, feeds).
- A CMS — content lives in the repo as Markdown/MDX for now.
- Internationalization — English only in v1.
- A live donation total at launch (nice-to-have island; can follow).

## 11. Open questions / to confirm later

- Create the actual **Open Collective / GitHub Sponsors / Ko-fi** accounts and wire real links (placeholders until then).
- Founder's full **About** content for `/mission` (user to provide).
- Whether to ship the **live donation total** island at launch or after.
- Custom **logo** (typographic wordmark until then).

## 12. Next steps

1. User reviews this spec.
2. Invoke the **writing-plans** skill to produce a detailed implementation plan (scaffold Astro, tokens/design system, components, page-by-page build, Cloudflare Pages + DNS, content authoring).
3. Initialize git and push to the `thinkersjournal` GitHub org when the build begins.
