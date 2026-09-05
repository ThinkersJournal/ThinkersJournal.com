// Cloudflare Pages Function → GET /api/oc-total
//
// Returns Open Collective's net total raised for the `thinkersjournal` collective,
// cached ~1h at the edge. It NEVER throws to the client and NEVER invents a number:
// on any failure it returns { ok: false } so the island renders nothing (not "$0").
//
// This runs only in the Cloudflare Pages runtime (and `wrangler pages dev`), not in
// `astro preview` — there /api/oc-total 404s, which the island treats as "no data".

const OC_API = 'https://api.opencollective.com/graphql/v2';
const SLUG = 'thinkersjournal';
const QUERY = `query ($slug: String!) {
  account(slug: $slug) {
    stats { totalAmountReceived(net: true) { valueInCents currency } }
  }
}`;

export async function onRequestGet(context) {
  const { request } = context;
  const cache = caches.default;
  const cacheKey = new Request(new URL('/api/oc-total', request.url).toString());

  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  let payload = { ok: false };
  try {
    const res = await fetch(OC_API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { slug: SLUG } }),
    });
    if (res.ok) {
      const json = await res.json();
      const amt = json && json.data && json.data.account
        && json.data.account.stats && json.data.account.stats.totalAmountReceived;
      if (amt && typeof amt.valueInCents === 'number') {
        payload = { ok: true, amountCents: amt.valueInCents, currency: amt.currency || 'USD' };
      }
    }
  } catch {
    // network/parse failure — payload stays { ok: false }
  }

  const maxAge = payload.ok ? 3600 : 60; // cache a real total 1h; back off briefly on failure
  const response = new Response(JSON.stringify(payload), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=${maxAge}, s-maxage=${maxAge}`,
    },
  });
  // Only persist successful responses at the edge.
  if (payload.ok) context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
