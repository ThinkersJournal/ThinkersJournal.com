import { test, expect } from '@playwright/test';
import { APP } from '../src/consts';

// Launch gate (#32): APP.live may be true only once community#114 — the automated
// CSAM -> NCMEC reporting pipeline — has shipped (CireSnave, board items 76/89).
// Evidence used: ThinkersJournal/community#114 is CLOSED as completed. That is a proxy
// (the issue was once closed by mistake, and reopened), so a human still reads the
// deployed pipeline before the flip; this test only stops the flip while #114 is open
// or unreadable. It fails closed: no answer from GitHub means "not verified".

type Issue = { state?: string; state_reason?: string | null } | null;

function launchVerdict(live: boolean, issue: Issue): { ok: boolean; why: string } {
  if (!live) return { ok: true, why: 'APP.live is false: nothing to verify' };
  if (!issue) return { ok: false, why: 'APP.live is true but community#114 could not be read' };
  if (issue.state !== 'closed' || issue.state_reason !== 'completed') {
    return { ok: false, why: `APP.live is true but community#114 is ${issue.state}/${issue.state_reason ?? 'none'}, not closed/completed` };
  }
  return { ok: true, why: 'community#114 closed as completed' };
}

test.describe('APP.live launch gate (unit)', () => {
  test('live with #114 open FAILS', () => {
    expect(launchVerdict(true, { state: 'open', state_reason: null }).ok).toBe(false);
  });
  test('live with #114 closed as not_planned FAILS', () => {
    expect(launchVerdict(true, { state: 'closed', state_reason: 'not_planned' }).ok).toBe(false);
  });
  test('live with #114 unreadable FAILS (fail closed)', () => {
    expect(launchVerdict(true, null).ok).toBe(false);
  });
  test('live with #114 closed as completed passes', () => {
    expect(launchVerdict(true, { state: 'closed', state_reason: 'completed' }).ok).toBe(true);
  });
  test('not live passes whatever #114 is', () => {
    expect(launchVerdict(false, { state: 'open', state_reason: null }).ok).toBe(true);
    expect(launchVerdict(false, null).ok).toBe(true);
  });
});

test('APP.live in src/consts.ts is consistent with community#114', async () => {
  let issue: Issue = null;
  if (APP.live) {
    const headers: Record<string, string> = { accept: 'application/vnd.github+json' };
    const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
    if (token) headers.authorization = `Bearer ${token}`;
    try {
      const r = await fetch('https://api.github.com/repos/ThinkersJournal/community/issues/114', { headers });
      if (r.ok) issue = await r.json();
    } catch {
      issue = null;
    }
  }
  const v = launchVerdict(APP.live, issue);
  expect(v.ok, v.why).toBe(true);
});
