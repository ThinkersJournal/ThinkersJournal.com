# Newsletter provisioning (Listmonk) — founder checklist

The site half (the signup form on `/dispatches` + `functions/api/subscribe.js`) ships
**dormant**: until the backend is wired, the page shows an "email hello@" fallback and
`GET /api/subscribe` returns `{ "configured": false }`. Setting the four env vars in
step 7 activates the live form **automatically — no redeploy**.

## The contract the site expects
`functions/api/subscribe.js` calls Listmonk's admin API:

- **Auth:** `Authorization: token <LISTMONK_API_USER>:<LISTMONK_API_TOKEN>` (Listmonk v3+ API users).
- **Request:** `POST {LISTMONK_URL}/api/subscribers` with
  `{ email, name, lists: [<LISTMONK_LIST_ID>], status: "enabled", preconfirm_subscriptions: false }`.
- **Double opt-in:** the list must be configured **opt-in = double**, so Listmonk sends
  the confirmation email itself (through Postmark).

Verify these against the Listmonk version you install; adjust the function if they differ.

## Founder steps (production infra — not automatable from this repo)

1. **Listmonk on the OVH VPS** — run the Go binary / Docker container behind TLS
   (a reverse proxy such as Caddy/nginx, or Cloudflare in front).
2. **Database** — point Listmonk at a **Neon** Postgres; create a dedicated database and
   a least-privilege role for it.
3. **SMTP** — send through **Postmark** using a **BROADCAST message stream**, **not** the
   transactional stream. Bulk over the transactional stream violates Postmark's terms and
   risks the sending reputation already built and verified.
4. **Admin UI lockdown** — put Listmonk's admin panel behind **Cloudflare Access**
   (email allowlist). This is the portfolio-wide standing decision: Cloudflare Access in
   front of admin panels for all projects. Never expose the admin UI openly — it is an
   admin panel over the whole subscriber list.
5. **API user** — create a Listmonk API user with least privilege (subscribers: write);
   note its username + token.
6. **List** — create the newsletter list with **opt-in = double**; note its numeric id.
7. **Activate the form** — set these on the Cloudflare Pages project
   (Settings → Environment variables; store the token as an encrypted secret):
   - `LISTMONK_URL` — e.g. `https://list.thinkersjournal.com`
   - `LISTMONK_API_USER`
   - `LISTMONK_API_TOKEN` (secret)
   - `LISTMONK_LIST_ID` (the numeric list id)

   Readiness flips to `configured: true` and the live signup form appears on `/dispatches`
   on its own. Note the site's HTML is edge-cached ~4h — **purge the Cloudflare cache** if
   you want the change visible to visitors immediately.
