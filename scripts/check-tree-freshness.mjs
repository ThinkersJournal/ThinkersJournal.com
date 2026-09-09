#!/usr/bin/env node
// Fails when the working tree is misrepresenting the mainline — i.e. when every file you
// read from it is quietly out of date while every ref check still looks green.
//
// Measured 2026-09-08: local `main` sat 11 commits behind `origin/main` (HEAD was a July
// merge) while `git fetch` had SUCCEEDED and `git rev-parse origin/main` matched
// `git ls-remote origin main` exactly. The tree still served July-era files. "I fetched"
// is not "my branch is current" — and the fetch makes the staleness HARDER to see,
// because the green ref check retires your suspicion. It surfaced only because a grep
// returned empty and somebody chose to investigate the zero. Surprise is not a detector
// that survives a handover; this is.
//
// SCOPE, deliberately narrow so it never cries wolf:
//   - On `main`, being behind origin/main is always a defect.
//   - On a branch, being behind is NORMAL and stays exempt — firing there would make this
//     a warning nobody reads. But the exemption is conditional on the branch actually
//     CONTRIBUTING something origin/main does not already have.
//   - Never runs in the deploy path (wired to `pretest`, NOT `prebuild`) — a freshness
//     guard must not be able to break a production build.
//
// THE EXEMPTION WAS THIS GUARD'S OWN BLIND SPOT, measured 2026-09-08 by walking into it.
// HEAD sat on `chore/tree-freshness-guard` AFTER it had merged: origin/main was 3 ahead
// and the tree was missing the logo and licence work — the exact staleness this file
// exists to catch, waved through because "branch" was treated as a permanent property
// rather than a claim about unmerged work.
// A GUARD'S EXEMPTION IS WHERE ITS OWN FAILURE MODE LIVES.
//
// ⚠️ AND THE OBVIOUS DISCRIMINATOR DOES NOT WORK HERE, which is why this uses merge-tree.
// This repo SQUASH-merges, so a merged branch's commits never become ancestors of
// origin/main. Measured on that same branch:
//   ahead                          2   -- not 0, so "no commits of its own" never fires
//   git branch --merged            0   -- ancestry says unmerged
//   git cherry (patch-id)         +2   -- squash fused 2 commits into 1, no id matches
//   merge-tree vs origin/main^{tree}   IDENTICAL  <- the branch contributes NOTHING
// Only the last one survives squashing. It asks the question that actually matters —
// "would merging this change anything?" — instead of a proxy for it.
//
// A check that CANNOT RUN says so and exits 0. It must never render "could not verify"
// as "verified fine" — that is the ERR-vs-0 bug this repository keeps meeting.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// The decision, isolated from git so it can be tested — see tests/freshness.spec.ts.
// `behind` is how far origin/main is ahead of HEAD. `contributes` is whether merging
// HEAD into origin/main would change anything at all.
export function assess({ branch, behind, contributes }) {
  if (branch === 'main') {
    return behind > 0 ? { code: 1, kind: 'stale-main' } : { code: 0, kind: 'ok' };
  }
  // A branch is exempt because it carries unmerged work. If it contributes nothing, there
  // is nothing to be behind FOR: it has merged, or it was cut and never committed to.
  // Either way the tree is stale and the remedy is the same.
  if (!contributes && behind > 0) return { code: 1, kind: 'spent-branch' };
  return { code: 0, kind: 'ok' };
}

// Everything below is the CLI. It is wrapped so that IMPORTING this module for `assess`
// does not run the guard, fetch from origin, or call process.exit — a test that silently
// executed the thing under test would be worse than no test.
function main() {
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  const notVerified = (why) => {
    console.error(`\n  freshness: NOT VERIFIED — ${why}`);
    console.error('  This is not a pass. Your tree may be stale; re-check before trusting a file read.\n');
    process.exit(0);
  };

  let branch;
  try {
    branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  } catch {
    notVerified('could not read the current branch.');
  }
  // A detached HEAD has no branch, so neither rule applies and this check does not cover
  // it. Say so rather than exiting 0 silently — an uncovered case reported as a pass is
  // exactly the ERR-vs-0 bug above.
  if (branch === 'HEAD') notVerified('HEAD is detached, so there is no branch to compare.');

  try {
    execFileSync('git', ['fetch', '--quiet', 'origin', 'main'], { stdio: 'ignore', timeout: 10_000 });
  } catch {
    notVerified('`git fetch` failed or timed out (offline? unresponsive remote?), so origin/main may itself be stale.');
  }

  let behind;
  try {
    behind = Number(git('rev-list', '--count', 'HEAD..origin/main'));
  } catch {
    notVerified('could not resolve origin/main.');
  }
  if (!Number.isInteger(behind)) notVerified('the commit count did not parse as a number.');

  let contributes = true; // fail SAFE: if we cannot tell, assume real work and stay quiet
  if (branch !== 'main') {
    try {
      const merged = git('merge-tree', '--write-tree', 'origin/main', 'HEAD').split('\n')[0].trim();
      const mainTree = git('rev-parse', 'origin/main^{tree}');
      if (!/^[0-9a-f]{40}$/.test(merged) || !/^[0-9a-f]{40}$/.test(mainTree)) {
        notVerified('merge-tree did not return a tree id (git too old? needs 2.38+).');
      }
      contributes = merged !== mainTree;
    } catch {
      // A conflicting merge exits non-zero — and a branch that CONFLICTS with main
      // definitely carries work, so the exemption is correct. Stay quiet.
      contributes = true;
    }
  }

  const { code, kind } = assess({ branch, behind, contributes });
  if (code === 0) process.exit(0);

  const head = git('rev-parse', '--short', 'HEAD');
  const remote = git('rev-parse', '--short', 'origin/main');

  if (kind === 'stale-main') {
    console.error(`
  STALE TREE — local main is ${behind} commit(s) behind origin/main.

    HEAD         ${head}
    origin/main  ${remote}

  Every file you read from this tree is out of date, and ref checks will still look
  green. Fast-forward before trusting any file read or commit list:

    git merge --ff-only origin/main
`);
  } else {
    console.error(`
  STALE TREE — you are on '${branch}', which contributes NOTHING that origin/main does
  not already have, while origin/main is ${behind} commit(s) ahead.

    HEAD         ${head}  (${branch})
    origin/main  ${remote}

  Two ways this happens, same consequence: the branch already merged (this repo squashes,
  so its commits are not ancestors of main and it will still look "unmerged" to
  git branch --merged), or it was cut and never committed to. Either way this tree is
  missing ${behind} commit(s) of mainline work while every ref check reads green.

  Nothing here is unmerged, so nothing is lost by leaving:

    git checkout main && git merge --ff-only origin/main
`);
  }
  process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
