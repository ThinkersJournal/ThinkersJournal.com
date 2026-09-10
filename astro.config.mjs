import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // Canonical host is WWW, not the apex. An email-security DNS record (SPF/DMARC/MX)
  // needs the apex free of a CNAME, so www serves the site and the apex 301s to it
  // (ruled by Eric, 2026-09). `site` drives canonical, og:url, og:image, and the sitemap.
  // Do NOT switch back to the apex — that would require CNAME-flattening / an apex A record
  // that puts email deliverability at risk for a cosmetic gain.
  site: 'https://www.thinkersjournal.com',
  integrations: [sitemap()],
  // Emit island scripts and component CSS as FILES rather than inlining them, so the
  // Content-Security-Policy can eventually enforce `script-src 'self'` and drop
  // `style-src 'unsafe-inline'` without hashes. Vite inlines any asset under 4096 bytes;
  // the two island scripts are 1102 and 398, which is why they were in the document.
  // Measured 2026-09-10: this also shrinks total HTML 93,205 -> 79,410 bytes, because the
  // scoped CSS was being duplicated into all 11 pages and is now shared and cacheable.
  vite: { build: { assetsInlineLimit: 0 } },
});
