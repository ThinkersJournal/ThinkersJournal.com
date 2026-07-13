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
  { num: '05', title: 'The Community', desc: "Where your work comes alive — document what you're building with living, precise links others can act on.", soon: true },
];

// NOTE: replace href handles with the real accounts once created.
export const SUPPORT: { label: string; href: string; note: string }[] = [
  { label: 'Open Collective', href: 'https://opencollective.com/thinkersjournal', note: 'Transparent ledger · low fee' },
  { label: 'GitHub Sponsors', href: 'https://github.com/sponsors/thinkersjournal', note: 'For the devs among us' },
  { label: 'Ko-fi', href: 'https://ko-fi.com/thinkersjournal', note: 'One-time, no account needed' },
];
