// Cloudflare Pages Function → POST /api/csp-report
//
// Receives Content-Security-Policy violation reports so the policy can be observed
// BEFORE it is ever enforced. Enforcing a policy whose violations you cannot see is half
// a control: a report you never receive is indistinguishable from a violation that never
// happened, which is the fail-toward-NONE shape in the observability layer.
//
// ⚠️ A REPORT SINK IS A DATA-COLLECTION DECISION WEARING A SECURITY-FEATURE NAME.
// CSP reports carry the document URI and the blocked URI — that is visitor browsing data
// arriving at an endpoint we chose to create. This one is built so that the only thing
// which can ever leave it is a DIRECTIVE NAME and a TRUNCATED, ORIGIN-ONLY blocked URI,
// written to the request log and nowhere else. /privacy says so, and says it BEFORE
// collection begins — a privacy page updated afterwards documents a state that was
// already untrue.
//
// This is a PUBLIC, UNAUTHENTICATED, WRITE-SHAPED endpoint on a live site, so:
//
//   1. NEVER PERSIST. Log only. Storage would make it an exhaustion target, and the
//      value of a report is in aggregate counts, not in retained bodies.
//   2. HARD BODY CAP, read as text and parsed defensively. Malformed input is discarded
//      SILENTLY. The parser is the real attack surface here, not the endpoint.
//   3. SAMPLE BEFORE PARSING. Volume is attacker-influenceable — any page on the origin
//      can be induced to emit reports — so the cheap check comes first.
//   4. 204 ALWAYS, and never varying by content. A response that differs by input is an
//      ORACLE, and an oracle would make this worse than having no CSP at all.
//   5. POST with a report content-type only; anything else is 405.

const MAX_BODY_BYTES = 8 * 1024;
// 1 in N reports are logged. Every report still gets a 204; sampling governs LOGGING only,
// so a caller can never tell whether theirs was sampled.
const SAMPLE_ONE_IN = 10;
const REPORT_TYPES = ['application/csp-report', 'application/reports+json', 'application/json'];
// Bounds what a directive name can be before it reaches a log line.
const DIRECTIVE_RE = /^[a-z-]{1,40}$/;

const noContent = () => new Response(null, { status: 204 });

// Reduce a blocked URI to its ORIGIN, or to the scheme for opaque values like `inline`,
// `eval` and `data`. The path is where the visitor-identifying detail lives, and we never
// want it: "https://evil.example/a/b?token=..." becomes "https://evil.example".
export function safeBlockedUri(raw) {
  const s = String(raw ?? '').slice(0, 200);
  if (!s) return '(none)';
  if (!s.includes('://')) return s.split(/[/?#]/)[0].slice(0, 40); // inline | eval | data
  try {
    return new URL(s).origin;
  } catch {
    return '(unparseable)';
  }
}

// Pull just the two fields worth logging out of either report shape — the legacy
// `report-uri` envelope ({ "csp-report": {...} }) or a modern Reporting API entry.
export function summarise(payload) {
  const r = payload?.['csp-report'] ?? payload?.body ?? payload;
  if (!r || typeof r !== 'object') return null;
  const directive = String(r['effective-directive'] ?? r['violated-directive'] ?? r.effectiveDirective ?? '')
    .split(/\s/)[0]
    .toLowerCase();
  if (!DIRECTIVE_RE.test(directive)) return null;
  return { directive, blocked: safeBlockedUri(r['blocked-uri'] ?? r.blockedURL) };
}

export async function onRequestPost(context) {
  const { request } = context;

  // (5) content-type gate, before anything is read.
  const ct = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (!REPORT_TYPES.includes(ct)) return new Response(null, { status: 405 });

  // (3) sample BEFORE parsing, so the expensive path is the rare one.
  if (Math.random() * SAMPLE_ONE_IN >= 1) return noContent();

  try {
    // (2) cap the body. Declared length is a hint, so the read is capped too.
    const declared = Number(request.headers.get('content-length') ?? '0');
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return noContent();
    const text = (await request.text()).slice(0, MAX_BODY_BYTES);

    const summary = summarise(JSON.parse(text));
    // (6) directive + origin-only blocked URI. Never the raw report, never the document
    // URI, never headers.
    if (summary) console.log(`csp-violation directive=${summary.directive} blocked=${summary.blocked}`);
  } catch {
    // (2) malformed input is discarded silently — no logging, so a malformed-report flood
    // cannot be used to write to the log either.
  }

  // (4) identical response on every path above.
  return noContent();
}

// Anything that is not a POST — including the GET a curious visitor would try.
export async function onRequest(context) {
  if (context.request.method === 'POST') return onRequestPost(context);
  return new Response(null, { status: 405, headers: { allow: 'POST' } });
}
