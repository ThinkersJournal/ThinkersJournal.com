# Newsletter provisioning (Listmonk) — founder checklist

The site half (the signup form on `/dispatches` + `functions/api/subscribe.js`) ships
**dormant**: until the backend is wired, the page shows an "email hello@" fallback and
`GET /api/subscribe` returns `{ "configured": false }`. Setting the four env vars in
step 7 activates the live form **automatically — no redeploy**.

## The contract the site expects
`functions/api/subscribe.js` calls Listmonk's admin API:

- **Auth:** `Authorization: token <LISTMONK_API_USER>:<LISTMONK_API_TOKEN>`. Listmonk supports
  **both** this token header and HTTP BasicAuth with the same `api_user:token` credentials
  (`curl -u "api_user:token"`); the function uses the token header. Either works.
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
7. **Activate the form** — set these on the Cloudflare **Pages** project named
   **`thinkersjournal-com`** (Settings → Environment variables; store the token as an
   encrypted secret):

   > ⚠️ **Do not use the Workers named `thinkersjournal-web` or `thinkersjournal-api`.**
   > `thinkersjournal-web` reads like "the website" and is not: both Workers belong to the
   > **Community** platform (`community.thinkersjournal.com`, a different repo). This site
   > is a **Pages** project. Verified 2026-09-10 — `thinkersjournal-com.pages.dev` serves
   > this site's title and a `www.thinkersjournal.com` canonical, while
   > `community.thinkersjournal.com` serves "Discover — Thinker's Journal Community".
   > Setting the four vars on a Worker leaves `/api/subscribe` reporting
   > `configured: false` with nothing obviously wrong anywhere.
   - `LISTMONK_URL` — e.g. `https://list.thinkersjournal.com`
   - `LISTMONK_API_USER`
   - `LISTMONK_API_TOKEN` (secret)
   - `LISTMONK_LIST_ID` (the numeric list id)

8. **Trigger a redeploy.** Cloudflare Pages binds env vars **at deploy time** — an existing
   deployment will NOT see newly-set vars. After step 7, trigger a new deployment.
   **Pushing any commit to the repo rebuilds Pages and needs no dashboard access** — use
   that if you can't reach the Cloudflare dashboard; otherwise Pages → Deployments →
   *Retry deployment* / *Create deployment*. Only then does `GET /api/subscribe` report
   `configured: true` and the live form replace the fallback.

9. **Purge the cache (or wait ~4h).** ⚠️ The site's HTML is edge-cached ~4 hours, so even
   after the redeploy the **cached `/dispatches` will keep showing the static `hello@`
   fallback** until the cache expires or you purge it. Do not conclude the wiring is broken
   from a stale page — **cache-bust** (`/dispatches/?x=1`) to see the true deployed state,
   and **purge the Cloudflare cache** to make the live form appear for everyone immediately.
