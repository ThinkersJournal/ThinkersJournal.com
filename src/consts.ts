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
];
