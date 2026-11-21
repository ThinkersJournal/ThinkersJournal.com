# ThinkersJournal.com roadmap

Rows for this repo's own lane (project ①, the marketing/mission site). Status is read at the
ref noted; each row is a cached claim, so re-check before relying on it.
**Last read: 2026-11-21, origin/main 358aaa8 (v0.1.6).**

| # | Row | State | Blocked on |
|---|-----|-------|------------|
| 1 | `APP.live` launch-gate test (`tests/app-live-gate.spec.ts`): fails when `APP.live` is true and community#114 is not closed/completed | In this PR | nothing |
| 2 | Flip `APP.live` to true (lights up nav "Sign in" and the /community CTA) | **UNVERIFIED, held** (#32). Needs the deployed community CSAM/NCMEC pipeline read by the PM or CireSnave; community#114 is open at 2026-11-21 | community#114; CireSnave (board 89, 76) |
| 3 | Newsletter provisioning (`docs/newsletter-provisioning.md`): listmonk on the VPS, redeploy after env vars are set | Docs merged (0.1.3); provisioning is an ops step, not mine | CireSnave / PM |
| 4 | Weekly dependency pass (dependabot grouped weekly; typescript held at 6) | Ongoing | nothing |
| 5 | Weekly issue sweep until each open issue is decided (`tools/issue-disposition.sh`) | Ongoing | nothing |

Not on this roadmap: the Community platform (project ②, `ThinkersJournal/community`) and any
paid-offering work (Evans Labs).
