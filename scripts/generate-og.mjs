// Generates public/og.png — the 1200x630 social-share card — by rendering a
// branded HTML card (real Fraunces + Inter fonts, embedded) with headless
// Chromium and screenshotting it. Re-run with: node scripts/generate-og.mjs
import { chromium } from 'playwright-core';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';

const FRAUNCES = 'node_modules/@fontsource-variable/fraunces/files';
const INTER = 'node_modules/@fontsource-variable/inter/files';

// Pick the first font file that exists from a candidate list (fontsource file
// names vary by axis/subset); returns a base64 @font-face src or null.
function pick(dir, candidates) {
  for (const name of candidates) {
    const p = `${dir}/${name}`;
    if (existsSync(p)) return readFileSync(p).toString('base64');
  }
  return null;
}

const frauncesN = pick(FRAUNCES, ['fraunces-latin-standard-normal.woff2', 'fraunces-latin-wght-normal.woff2', 'fraunces-latin-full-normal.woff2']);
const frauncesI = pick(FRAUNCES, ['fraunces-latin-standard-italic.woff2', 'fraunces-latin-wght-italic.woff2', 'fraunces-latin-full-italic.woff2']);
const interN = pick(INTER, ['inter-latin-wght-normal.woff2', 'inter-latin-standard-normal.woff2', 'inter-latin-full-normal.woff2']);

const face = (family, style, b64) =>
  b64 ? `@font-face{font-family:'${family}';font-style:${style};font-weight:100 900;font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2');}` : '';

const fontCss = [
  face('Fraunces', 'normal', frauncesN),
  face('Fraunces', 'italic', frauncesI),
  face('Inter', 'normal', interN),
].join('\n');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  ${fontCss}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1200px;height:630px}
  .card{position:relative;width:1200px;height:630px;overflow:hidden;
    background:linear-gradient(140deg,#17171b 0%,#0b0b0e 45%,#060608 100%);
    font-family:'Inter',-apple-system,'Segoe UI',system-ui,sans-serif;
    display:flex;flex-direction:column;justify-content:space-between;
    padding:76px 84px}
  .card::before{content:"";position:absolute;top:0;left:0;right:0;height:230px;
    background:linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,0))}
  .card::after{content:"";position:absolute;inset:-30% -10% auto -10%;height:120%;
    filter:blur(90px);opacity:.9;
    background:radial-gradient(38% 46% at 26% 30%,rgba(61,255,149,.28),transparent 70%),
      radial-gradient(30% 34% at 82% 22%,rgba(61,255,149,.12),transparent 72%)}
  .row{position:relative;z-index:2}
  .eyebrow{font-size:22px;font-weight:600;letter-spacing:.26em;text-transform:uppercase;color:#3dff95}
  .headline{font-family:'Fraunces',Georgia,serif;font-weight:500;color:#fbfbfd;
    font-size:82px;line-height:1.03;letter-spacing:-.015em;max-width:20ch}
  .headline em{font-style:italic;color:#7dffbc}
  .foot{display:flex;align-items:baseline;justify-content:space-between}
  .wm{font-family:'Fraunces',Georgia,serif;font-weight:500;font-size:34px;color:#fafafc}
  .wm .dot{color:#3dff95}
  .url{font-size:22px;color:#a8a8b3;letter-spacing:.02em}
</style></head><body>
  <div class="card">
    <div class="row eyebrow">A home for thinkers</div>
    <div class="row headline">No thinker should have to build <em>alone.</em></div>
    <div class="row foot">
      <span class="wm">Thinker's Journal<span class="dot">.</span></span>
      <span class="url">thinkersjournal.com</span>
    </div>
  </div>
</body></html>`;

mkdirSync('public', { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.screenshot({ path: 'public/og.png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
  console.log('wrote public/og.png (fonts embedded: ' +
    `fraunces=${!!frauncesN} fraunces-italic=${!!frauncesI} inter=${!!interN})`);
} finally {
  await browser.close();
}
