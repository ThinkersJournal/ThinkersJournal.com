#!/usr/bin/env node
// Fails when the local `main` is BEHIND `origin/main` — i.e. when the working tree is
// misrepresenting the mainline and every file you read from it is quietly out of date.
//
// Measured here 2026-09-08: local `main` sat 11 commits behind `origin/main` (HEAD was a
// July merge) while `git fetch` had SUCCEEDED and `git rev-parse origin/main` matched
// `git ls-remote origin main` exactly. Every ref check came back green and the tree still
// served July-era files. "I fetched" is not "my branch is current" — and the fetch makes
// the staleness HARDER to see, because the green ref check retires your suspicion.
// It surfaced only because a grep returned empty and somebody chose to investigate the
// zero. Surprise is not a detector that survives a handover; this is.
//
// SCOPE, deliberately narrow so it never cries wolf:
//   - Only checks when HEAD is `main`. Being behind main on a feature branch is normal
//     and expected, so firing there would make this a warning nobody reads.
//   - Never runs in the deploy path (wired to `pretest`, NOT `prebuild`) — a freshness
//     guard must not be able to break a production build.
//
// A check that CANNOT RUN says so and exits 0. It must never render "could not verify"
// as "verified fine" — that is the ERR-vs-0 bug this repository keeps meeting.
import { execFileSync } from 'node:child_process';

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

// Behind `main` is the normal state of a feature branch — checking there would fire on
// the happy path, and a warning on the happy path is one nobody reads.
if (branch !== 'main') process.exit(0);

try {
  execFileSync('git', ['fetch', '--quiet', 'origin', 'main'], { stdio: 'ignore' });
} catch {
  notVerified('`git fetch` failed (offline?), so origin/main may itself be stale.');
}

let behind;
try {
  behind = Number(git('rev-list', '--count', 'HEAD..origin/main'));
} catch {
  notVerified('could not resolve origin/main.');
}
if (!Number.isInteger(behind)) notVerified('the commit count did not parse as a number.');

if (behind > 0) {
  const head = git('rev-parse', '--short', 'HEAD');
  const remote = git('rev-parse', '--short', 'origin/main');
  console.error(`
  STALE TREE — local main is ${behind} commit(s) behind origin/main.

    HEAD         ${head}
    origin/main  ${remote}

  Every file you read from this tree is out of date, and ref checks will still look
  green. Fast-forward before trusting any file read or commit list:

    git merge --ff-only origin/main
`);
  process.exit(1);
}
