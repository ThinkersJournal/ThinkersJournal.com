// Cloudflare Pages Function → /api/subscribe
//   GET  → { configured: boolean }              (is the newsletter backend wired? no secrets leaked)
//   POST → { ok: true } | { ok: false, reason } (add a double-opt-in subscriber)
//
// Talks to a Listmonk instance whose URL + admin credentials + list id come from ENV,
// NEVER constants — the instance is provisioned separately on the founder's OVH VPS:
//   LISTMONK_URL        e.g. https://list.thinkersjournal.com
//   LISTMONK_API_USER   a least-privilege Listmonk API user (subscribers: write)
//   LISTMONK_API_TOKEN  that user's API token
//   LISTMONK_LIST_ID    numeric id of the newsletter list (configured for double opt-in)
//
// CONTRACT ASSUMPTIONS to verify at provisioning (the instance does not exist yet):
//   - auth header `Authorization: token <user>:<token>` (Listmonk v3+ API users)
//   - POST /api/subscribers with { email, name, lists:[id], status, preconfirm_subscriptions }
//   - the list's opt-in is "double", so preconfirm_subscriptions:false makes Listmonk send
//     the confirmation email (through Postmark's BROADCAST stream — an account-level config).
// Until the vars are set, GET reports unconfigured and the site shows a static fallback.

function config(env) {
  const url = env && env.LISTMONK_URL;
  const user = env && env.LISTMONK_API_USER;
  const token = env && env.LISTMONK_API_TOKEN;
  const listId = env && env.LISTMONK_LIST_ID;
  if (!url || !user || !token || !listId) return null;
  return { url: String(url).replace(/\/+$/, ''), user, token, listId: Number(listId) };
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export function onRequestGet({ env }) {
  return json({ configured: config(env) !== null });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestPost({ request, env }) {
  const cfg = config(env);
  if (!cfg) return json({ ok: false, reason: 'unconfigured' });

  let email = '';
  let name = '';
  try {
    const body = await request.json();
    email = String((body && body.email) || '').trim();
    name = String((body && body.name) || '').trim();
  } catch {
    return json({ ok: false, reason: 'invalid' }, 400);
  }
  if (!EMAIL_RE.test(email) || email.length > 320) return json({ ok: false, reason: 'invalid' }, 400);

  try {
    const res = await fetch(`${cfg.url}/api/subscribers`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `token ${cfg.user}:${cfg.token}`,
      },
      body: JSON.stringify({
        email,
        name: name || email.split('@')[0],
        lists: [cfg.listId],
        status: 'enabled',
        preconfirm_subscriptions: false, // Listmonk sends the double opt-in email
      }),
    });
    // 409 = already a subscriber; report success so we never disclose list membership.
    if (res.ok || res.status === 409) return json({ ok: true });
    return json({ ok: false, reason: 'upstream' });
  } catch {
    return json({ ok: false, reason: 'upstream' });
  }
}
