// Generates the Thinker's Journal mark: an open journal with a bookmark, drawn in
// piano black on the brand green — strictly two colours, no white fill.
//
// Emits, into public/:
//   favicon.svg          the mark as real SVG (crisp at any size, scales for print)
//   favicon-32.png       PNG fallback for clients that ignore SVG favicons
//   favicon-16.png
//   apple-touch-icon.png 180px, FULL BLEED and opaque — iOS applies its own mask,
//                        and it renders transparency as black, so this one is not rounded
//   logo-192.png         general use / avatars
//   logo-512.png
//
//   node scripts/generate-logo.mjs
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = 'public';
mkdirSync(OUT, { recursive: true });

const GREEN = '#3dff95'; // brand fluorescent green
const INK = '#060608';   // piano black

// The mark, in a 0-100 coordinate space. Two page shapes fanning from a centre
// spine, one tucked stack line per side (it merges into the page edge at small
// sizes, so the mark simplifies itself), and a contained bookmark.
const MARK = `
  <g fill="none" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round">
    <path d="M50 37 C40 30 27 26 14 27 L14 61 C27 60 40 64 50 71 Z"/>
    <path d="M50 37 C60 30 73 26 86 27 L86 61 C73 60 60 64 50 71 Z"/>
    <path d="M18.5 64.3 C29 63.7 39.5 66.7 48.6 72"/>
    <path d="M81.5 64.3 C71 63.7 60.5 66.7 51.4 72"/>
  </g>
  <path d="M62.5 33.6 L71 32.2 L71 58.6 L66.8 54.4 L62.5 58.9 Z" fill="${INK}"/>`;

// rx 22 = the rounded-tile form; rx 0 = full bleed (apple-touch).
const svgDoc = (rx) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Thinker's Journal">` +
  `<title>Thinker's Journal</title>` +
  `<rect width="100" height="100" rx="${rx}" fill="${GREEN}"/>` +
  `<g transform="translate(50 50) scale(.62) translate(-50 -50)">${MARK}</g>` +
  `</svg>\n`;

writeFileSync(`${OUT}/favicon.svg`, svgDoc(22));
console.log(`wrote ${OUT}/favicon.svg`);

const PNGS = [
  { name: 'logo-512.png',         px: 512, rx: 22, opaque: false },
  { name: 'logo-192.png',         px: 192, rx: 22, opaque: false },
  { name: 'apple-touch-icon.png', px: 180, rx: 0,  opaque: true  },
  { name: 'favicon-32.png',       px: 32,  rx: 22, opaque: false },
  { name: 'favicon-16.png',       px: 16,  rx: 22, opaque: false },
];

const pageFor = (px, rx) => `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0}html,body{width:${px}px;height:${px}px;background:transparent}
svg{width:${px}px;height:${px}px;display:block}
</style></head><body>${svgDoc(rx)}</body></html>`;

const browser = await chromium.launch();
try {
  for (const p of PNGS) {
    const page = await browser.newPage({
      viewport: { width: p.px, height: p.px },
      deviceScaleFactor: 1, // exact pixel dimensions
    });
    await page.setContent(pageFor(p.px, p.rx), { waitUntil: 'load' });
    await page.screenshot({ path: `${OUT}/${p.name}`, omitBackground: !p.opaque });
    await page.close();
    console.log(`wrote ${OUT}/${p.name} (${p.px}px${p.opaque ? ', opaque' : ''})`);
  }
} finally {
  await browser.close();
}
