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
});
