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
export function assess({ branch, behind, contributes, upstreamGone }) {
  if (branch === 'main') {
    return behind > 0 ? { code: 1, kind: 'stale-main' } : { code: 0, kind: 'ok' };
  }
  // Being behind is the whole point of a branch; only a branch with no reason to exist
  // is a problem.
  if (behind === 0) return { code: 0, kind: 'ok' };
  // Contributes nothing -> merged, or cut and never committed to. Nothing can be lost.
  if (!contributes) return { code: 1, kind: 'spent-branch' };
  // It contributes something, but its remote counterpart has been DELETED — which in this
  // workflow means the PR merged and the branch was cleaned up. Distinct from the case
  // above, because content that differs from main might be unpushed work, so this message
  // must NOT promise that nothing is lost.
  if (upstreamGone) return { code: 1, kind: 'deleted-upstream' };
  return { code: 0, kind: 'ok' };
}

// merge-tree prints the resulting tree oid on stdout. Measured with git 2.55 on
// 2026-09-09: a CLEAN merge exits 0 with the oid; a CONFLICTING merge exits 1 and STILL
// prints a valid oid; an unsupported flag (git < 2.38) exits 129 with a usage message and
// no oid at all. So the discriminator is "did we get a tree id", never the exit code.
// SHA-1 repos give 40 hex chars, SHA-256 repos give 64.
export function parseTreeOid(stdout) {
  const first = String(stdout ?? '').split(/\r?\n/)[0].trim();
  return /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(first) ? first : null;
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

const notVerified = (why) => {
  console.error(`\n  freshness: NOT VERIFIED — ${why}`);
  console.error('  This is not a pass. Your tree may be stale; re-check before trusting a file read.\n');
  process.exit(0);
};

// Does HEAD contribute anything origin/main does not already have?
function headContributes() {
  // NOTE: a bare try/catch here USED to swallow the old-git case and report a pass — the
  // exact ERR-vs-0 bug this file preaches against, inside the file that preaches it.
  // Both outcomes carry stdout, so read the tree id rather than the exit status.
  let stdout;
  let gitSaid = '';
  try {
    stdout = execFileSync('git', ['merge-tree', '--write-tree', 'origin/main', 'HEAD'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    stdout = e?.stdout ?? ''; // a CONFLICT exits non-zero and still prints the oid
    gitSaid = String(e?.stderr ?? '').split(/\r?\n/)[0].trim();
  }
  const merged = parseTreeOid(stdout);
  if (merged === null) {
    // git's own line is CARRIED into the diagnostic rather than discarded — it names the
    // real cause (unknown option `write-tree' on git < 2.38) far better than a guess can.
    const because = gitSaid ? ` — git said: ${gitSaid}` : ' (git older than 2.38?)';
    notVerified(`\`git merge-tree --write-tree\` returned no tree id, so whether this branch still carries unmerged work is unknown${because}.`);
  }
  const mainTree = parseTreeOid(git('rev-parse', 'origin/main^{tree}'));
  if (mainTree === null) notVerified('could not read origin/main^{tree}.');
  // A conflicted merge yields a tree containing conflict markers, which differs from
  // origin/main's — correctly reading as "this branch carries work".
  return merged !== mainTree;
}

// Was this branch pushed once and then DELETED on the remote? In this workflow the merge
// gate deletes a branch when its PR lands, so a vanished upstream is a durable "this
// merged" signal — and unlike merge-tree it does NOT decay when main later edits the same
// files. (Measured 2026-09-09: after #21 rewrote this very file, merge-tree correctly
// reported that the already-merged chore/tree-freshness-guard now "contributes", because
// merging it would revert #21. The guard's own fix is what blinded it to its own
// motivating case. This signal is unaffected.)
//
// `branch.<name>.merge` survives remote deletion and proves the branch was pushed, which
// is what separates "merged and cleaned up" from "never pushed, work still local".
function upstreamDeleted(branch) {
  // ⚠️ Look up the CONFIGURED upstream ref, not the local branch name. `git checkout -b
  // x origin/main` sets branch.x.merge = refs/heads/main, so probing the remote for "x"
  // finds nothing and would declare a perfectly live branch deleted — a false positive
  // on the single most common way a branch is created here. Caught by the end-to-end
  // conflict fixture, which is cut exactly that way.
  let ref, remote;
  try {
    const cfg = (k) => execFileSync('git', ['config', '--get', k],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    ref = cfg(`branch.${branch}.merge`);
    remote = cfg(`branch.${branch}.remote`);
  } catch {
    return false; // never pushed / no tracking -> work may be purely local, stay quiet
  }
  if (!ref || !remote) return false;
  // Tracking something OTHER than a branch of the same name (e.g. cut from origin/main)
  // says nothing about this branch having been merged and cleaned up.
  if (ref !== `refs/heads/${branch}`) return false;
  try {
    // stderr IGNORED, not merely unused: measured 2026-09-09, execFileSync forwards
    // git's stderr to the parent, so a network blip prints five lines of
    // "fatal: Could not read from remote repository / check your access rights"
    // during `npm test` while this probe silently and correctly falls back. That reads
    // as a failure when nothing is wrong.
    return execFileSync('git', ['ls-remote', '--heads', remote, ref],
      { encoding: 'utf8', timeout: 10_000, stdio: ['ignore', 'pipe', 'ignore'] }).trim() === '';
  } catch {
    // A read-only probe that could not run. Returning false only withholds an EXTRA
    // warning; the primary merge-tree verdict is already computed, so this is not an
    // unverified state being reported as verified.
    return false;
  }
}

// All the git probing, so main() stays decision + reporting.
function probe() {
  let branch;
  try {
    branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  } catch {
    notVerified('could not read the current branch.');
  }
  // A detached HEAD has no branch, so neither rule applies and this check does not cover
  // it. Say so rather than exiting 0 silently.
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

  if (branch === 'main') return { branch, behind, contributes: true, upstreamGone: false };
  return { branch, behind, contributes: headContributes(), upstreamGone: upstreamDeleted(branch) };
}

// ⚠️ A PRESCRIPTION IS A CLAIM ABOUT THE WORLD, AND EVERY CLAIM IN ONE MUST COME FROM A
// MEASURED FIELD. This function exists because the fourth assumed-property-vs-tested-
// property defect in this file was not in the detection at all — it was in the ADVICE.
// The spent-branch message said "Nothing here is unmerged, so nothing is lost by
// leaving", which is TRUE ABOUT COMMITS and says nothing about the working tree the
// reader is looking at. Measured 2026-09-10: `git checkout main` then aborted with
// "local changes would be overwritten", and a control run off the back of it silently
// did not run. A TRUE STATEMENT ABOUT THE WRONG NOUN IS MORE DANGEROUS THAN A FALSE ONE,
// BECAUSE IT SURVIVES CHECKING.
//
// So the advice is no longer prose baked into a template: it is computed from state that
// was actually measured, and tested. A wrong prescription now needs a wrong FUNCTION,
// which a test can reach, rather than a wrong SENTENCE, which no test can.
export function remedy({ treeClean, mayHaveUnpushedWork }) {
  // TWO independent ways work can be lost, and BOTH must be false before the reassurance
  // is honest. This shape exists because the first fix checked only the first one: a
  // shared prescription handed `deleted-upstream` a "nothing is lost" it must never give,
  // since that verdict fires precisely when the branch still differs from origin/main and
  // the difference may be commits that were never pushed. REMOVING AN UNCHECKED-CLAIM
  // DEFECT FOR ONE PROPERTY CAN REINTRODUCE IT FOR ANOTHER; the test that pinned the
  // spent-branch/deleted-upstream distinction is what caught it.
  const safeToLeave = treeClean === true && mayHaveUnpushedWork !== true;
  if (safeToLeave) {
    return { safeToLeave, steps: ['git checkout main && git merge --ff-only origin/main'] };
  }
  const steps = [];
  // Inspect BEFORE acting: if there may be unpushed commits, the first thing to run is the
  // one that shows them. This lives here rather than in the deleted-upstream template
  // because A PRESCRIPTION SHOULD BE COMPUTED, NOT PROSE — the same argument the rest of
  // this file makes. Leaving it in the template produced the advice twice, once computed
  // and once hand-written, which is what an incomplete migration looks like.
  if (mayHaveUnpushedWork === true) {
    steps.push('git log --oneline origin/main..HEAD   # what is here that main lacks');
  }
  if (treeClean !== true) {
    steps.push('git stash -u                          # or commit them — either keeps the work');
  }
  steps.push('git checkout main && git merge --ff-only origin/main');
  if (treeClean !== true) {
    steps.push('git stash pop                         # back onto a current tree');
  }
  return { safeToLeave, steps };
}

function prescribe(ctx) {
  const r = remedy(ctx);
  const steps = r.steps.map((s) => '    ' + s).join('\n');
  if (r.safeToLeave) {
    return `  Nothing here is unmerged and the tree is clean, so nothing is lost by leaving:\n\n${steps}\n`;
  }
  const why = [];
  if (ctx.treeClean !== true) {
    why.push('    - you have UNCOMMITTED CHANGES in this tree');
  }
  if (ctx.mayHaveUnpushedWork === true) {
    why.push('    - this branch still differs from origin/main, and the difference may be\n      commits that were never pushed');
  }
  return `  ⚠️ Check before you leave:\n\n${why.join('\n')}\n\n  The staleness is real either way — this is about the tree, not about your work:\n\n${steps}\n`;
}

// One template per verdict, keyed by the kind assess() returns. A table rather than an
// if/else chain so the mapping is explicit and a verdict shipping WITHOUT a message is a
// missing key instead of a silently-taken else branch.
export const MESSAGES = new Map([
  ['stale-main', (ctx) => `
  STALE TREE — local main is ${ctx.behind} commit(s) behind origin/main.

    HEAD         ${ctx.head}
    origin/main  ${ctx.remote}

  Every file you read from this tree is out of date, and ref checks will still look
  green. Fast-forward before trusting any file read or commit list:

${prescribe({ ...ctx, mayHaveUnpushedWork: false })}`],

  ['spent-branch', (ctx) => `
  STALE TREE — you are on '${ctx.branch}', which contributes NOTHING that origin/main
  does not already have, while origin/main is ${ctx.behind} commit(s) ahead.

    HEAD         ${ctx.head}  (${ctx.branch})
    origin/main  ${ctx.remote}

  Two ways this happens, same consequence: the branch already merged (this repo squashes,
  so its commits are not ancestors of main and it still looks "unmerged" to
  git branch --merged), or it was cut and never committed to. Either way this tree is
  missing ${ctx.behind} commit(s) of mainline work while every ref check reads green.

${prescribe({ ...ctx, mayHaveUnpushedWork: false })}`],

  ['deleted-upstream', (ctx) => `
  STALE TREE — '${ctx.branch}' no longer exists on the remote (it was pushed once and has
  since been deleted, which here means its PR merged), while origin/main is ${ctx.behind}
  commit(s) ahead.

    HEAD         ${ctx.head}  (${ctx.branch})
    origin/main  ${ctx.remote}

  Unlike a branch that contributes nothing, this one still differs from origin/main.

${prescribe({ ...ctx, mayHaveUnpushedWork: true })}`],
]);

// Look up a verdict's template.
//
// MESSAGES is a Map, not an object literal, and that is the point: a Map has NO prototype
// chain, so an inherited key ("constructor", "toString", "valueOf", "__proto__" — all
// truthy, two of them callable) cannot resolve. That defect was real here on 2026-09-09;
// this makes it impossible rather than guarded.
export function messageFor(kind) {
  return MESSAGES.get(kind) ?? null;
}

function report(kind, ctx) {
  const template = messageFor(kind);
  if (!template) {
    // Unreachable while the tests hold: freshness.spec.ts enumerates every verdict
    // assess() can produce and requires a template for each.
    console.error(`\n  freshness: verdict '${kind}' has no message — that is a bug in this script.\n`);
    return;
  }
  console.error(template(ctx));
}

// Wrapped so that IMPORTING this module for `assess`/`parseTreeOid`/`remedy` does not run
// the guard, fetch from origin, or call process.exit — a test that silently executed the
// thing under test would be worse than no test.
function main() {
  const { branch, behind, contributes, upstreamGone } = probe();
  const { code, kind } = assess({ branch, behind, contributes, upstreamGone });
  if (code === 0) process.exit(0);

  // The working tree is measured HERE, not assumed by the message. It is the property the
  // old advice silently depended on.
  let treeClean;
  try {
    treeClean = git('status', '--porcelain') === '';
  } catch {
    // Unknown cleanliness -> take the CAUTIOUS branch. Claiming "nothing is lost" is the
    // only outcome that can mislead; withholding the claim never can.
    treeClean = false;
  }

  report(kind, {
    branch,
    behind,
    treeClean,
    head: git('rev-parse', '--short', 'HEAD'),
    remote: git('rev-parse', '--short', 'origin/main'),
  });
  process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
