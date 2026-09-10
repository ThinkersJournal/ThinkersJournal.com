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

// Opaque blocked-uri values are a small closed vocabulary — "inline", "eval", "data",
// "blob", "filesystem", "wasm-eval". Anything else in that position is not a value we
// need, so this is a WHITELIST rather than an escape.
//
// ⚠️ Measured 2026-09-10: the previous version split on [/?#] and returned the remainder,
// so "inline\ncsp-violation directive=script-src blocked=TOTALLY-FAKE" survived intact
// and would have FORGED A SECOND LOG LINE. Stripping \r\n would have fixed that instance;
// a whitelist fixes the class, because the log is a text format and every control
// character is a potential delimiter in one. Note the URL branch was never affected —
// the WHATWG parser strips tab/newline during parsing, verified with a control.
const OPAQUE_RE = /^[a-z][a-z-]{0,29}$/;

export function safeBlockedUri(raw) {
  const s = String(raw ?? '').slice(0, 200);
  if (!s) return '(none)';
  if (!s.includes('://')) {
    const token = s.split(/[/?#]/)[0].toLowerCase();
    return OPAQUE_RE.test(token) ? token : '(redacted)';
  }
  try {
    return new URL(s).origin.slice(0, 100);
  } catch {
    return '(unparseable)';
  }
}

// ⚠️ crypto, not Math.random. Sampling is not itself a security control — it is volume
// reduction — and no oracle exists to learn the PRNG state from, because every request
// gets the same 204. But that argument depends on constraint 4 continuing to hold, and a
// CSPRNG costs nothing here, so the sampling should not have a hidden dependency on
// another constraint's correctness. A PREDICTABLE SAMPLER LETS AN ATTACKER CHOOSE WHETHER
// THEIR VIOLATIONS ARE RECORDED — flooding the log, or staying out of it.
export function shouldLog(oneIn = SAMPLE_ONE_IN) {
  const [n] = crypto.getRandomValues(new Uint32Array(1));
  return (n / 2 ** 32) * oneIn < 1;
}

// Read at most `maxBytes`, ABORTING the stream rather than buffering and slicing.
//
// ⚠️ Measured 2026-09-10: the previous version checked `content-length` and then called
// `request.text()`. When the header is ABSENT the check passes with declared=0, and
// `.text()` buffers the WHOLE body before the slice ever runs — a 200 KB payload was
// accepted against an 8 KB cap. A CAP APPLIED AFTER THE READ IS NOT A CAP, and the
// comment above it claimed otherwise, which is the part that would have kept anyone from
// looking. Returns null when the body is too large or unreadable.
//
// The bound is maxBytes PLUS AT MOST ONE CHUNK, not exactly maxBytes: the excess is only
// detected after the chunk that crosses the line has arrived. Measured: 12,288 bytes
// pulled with 4 KB chunks against an 8 KB cap, then cancel(). That is bounded, which is
// the property that matters; stating it exactly avoids a later reader "fixing" a cap that
// is not off by one.
export async function readCapped(request, maxBytes) {
  const declared = Number(request.headers.get('content-length') ?? NaN);
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  const merged = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    merged.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(merged);
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

  // (3) sample BEFORE reading, so the expensive path is the rare one.
  if (!shouldLog()) return noContent();

  try {
    // (2) cap the READ itself — an absent content-length must not become an unbounded read.
    const text = await readCapped(request, MAX_BODY_BYTES);
    if (text === null) return noContent();

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
