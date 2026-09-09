export const SITE = {
  title: "Thinker's Journal",
  description:
    "A non-profit helping thinkers of every kind design, build, and ship the things they're thinking about. No thinker should have to build alone.",
  // WWW is canonical (see astro.config.mjs for why); canonical/og derive from Astro.site,
  // so this is the display/reference form only.
  url: 'https://www.thinkersjournal.com',
};

// The Community platform (project ②) lives at community.thinkersjournal.com.
// It's pre-launch, so `live: false` keeps its links OFF this site (no dead links) —
// the same discipline as SUPPORT below. Flip to `true` once the app is deployed and
// resolving; that single change lights up the nav "Sign in" link and the /community CTA.
// The entry URLs derive from one origin constant so a host change can't leave them out of sync.
const APP_ORIGIN = 'https://community.thinkersjournal.com';
export const APP = {
  live: false,
  url: APP_ORIGIN,
  login: `${APP_ORIGIN}/login`,
  signup: `${APP_ORIGIN}/signup`,
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
  { num: '05', title: 'The Community', desc: "Where your work comes alive — document what you're building with living, precise links others can act on.", soon: true },
];

// `live: true` = the account exists and the link resolves. Pending avenues are
// hidden from the site (no dead links); flip `live: true` once each is set up.
export const SUPPORT: { label: string; href: string; note: string; live?: boolean }[] = [
  { label: 'Open Collective', href: 'https://opencollective.com/thinkersjournal', note: 'Transparent ledger · low fee', live: true },
  { label: 'GitHub Sponsors', href: 'https://github.com/sponsors/thinkersjournal', note: 'For the devs among us' },
  { label: 'Ko-fi', href: 'https://ko-fi.com/thinkersjournal', note: 'One-time, no account needed', live: true },
  // Liberapay takes NO commission (verified 2026-09-08 at liberapay.com/about/faq); only the
  // processor's fee applies (~3% Stripe, ~5% PayPal). It's recurring-first, which is the one
  // giving shape the other three don't cover.
  //
  // The handle is `ThinkersJournal.com` — WITH the .com, which is part of the path, not a
  // typo and not a domain. Links to /donate (the giving flow) rather than the profile, which
  // is what the card's "Give →" promises.
  //
  // Liberapay also offers a button.js widget; we deliberately DON'T use it. Inspected
  // 2026-09-08: it is a static yellow (#f6c915) Helvetica button emitted via document.write()
  // — it shows no donation total, so it adds nothing this card doesn't, while costing a
  // parser-blocking third-party script, a clash with the brand palette, and a permanent
  // `script-src https://liberapay.com` widening of a CSP we intend to promote to enforcing.
  // Their own <noscript> fallback is a plain link to this same URL.
  { label: 'Liberapay', href: 'https://liberapay.com/ThinkersJournal.com/donate', note: 'Recurring gifts · no platform cut', live: true },
];
