import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
// The tree-freshness guard. It shipped untested in PR #16 and its exemption hole was
// found by a human walking into it — so the decision is pinned here, AND exercised
// end-to-end against a real squash-merged repository.
import { assess, parseTreeOid, MESSAGES, messageFor, remedy } from '../scripts/check-tree-freshness.mjs';

const GUARD = resolve('scripts/check-tree-freshness.mjs');

test.describe('tree-freshness decision (unit)', () => {
  const on = (branch: string, behind: number, contributes: boolean) =>
    assess({ branch, behind, contributes, upstreamGone: false });
  const on2 = (branch: string, behind: number, contributes: boolean, upstreamGone: boolean) =>
    assess({ branch, behind, contributes, upstreamGone });

  test('main behind origin/main fails — the original defect', () => {
    expect(on('main', 11, true)).toEqual({ code: 1, kind: 'stale-main' });
  });

  test('main level with origin/main passes', () => {
    expect(on('main', 0, true).code).toBe(0);
  });

  // The exemption that must SURVIVE: a branch carrying its own work is legitimately
  // behind main, and firing there is what would make this unreadable.
  test('a branch with unmerged work stays exempt even when far behind', () => {
    expect(on('feat/x', 40, true).code).toBe(0);
  });

  test('a branch contributing nothing, with origin/main moved on, FAILS', () => {
    expect(on('chore/done', 3, false)).toEqual({ code: 1, kind: 'spent-branch' });
  });

  // Boundary: a branch just cut from an up-to-date main also contributes nothing, but
  // nothing is stale about it. `behind > 0` separates the two.
  test('a freshly cut branch on a current main passes', () => {
    expect(on('feat/new', 0, false).code).toBe(0);
  });

  // merge-tree DECAYS: once main edits the files a merged branch touched, merging it
  // would change something, so it correctly reports "contributes" and the spent-branch
  // rule stops firing. Measured 2026-09-09 on this repo — #21's own rewrite of
  // check-tree-freshness.mjs blinded the guard to the branch that motivated it. The
  // deleted-upstream signal does not decay, because a deleted ref stays deleted.
  test('a merged branch whose remote is gone FAILS even when it still contributes', () => {
    expect(on2('chore/done', 6, true, true)).toEqual({ code: 1, kind: 'deleted-upstream' });
  });

  test('a live branch with work and an intact remote stays exempt', () => {
    expect(on2('feat/x', 40, true, false).code).toBe(0);
  });

  // Precedence: "contributes nothing" is the stronger statement, because only it can
  // promise nothing is lost by leaving. The messages differ on exactly that point.
  test('contributing nothing outranks the deleted remote', () => {
    expect(on2('chore/done', 3, false, true).kind).toBe('spent-branch');
  });

  test('a deleted remote on a branch that is NOT behind still passes', () => {
    expect(on2('chore/done', 0, true, true).code).toBe(0);
  });
});

// parseTreeOid decides whether merge-tree ANSWERED, which is what separates "no unmerged
// work" from "could not tell". The fixtures below are real git 2.55 output captured on
// 2026-09-09 — not invented, because the previous version of this guard was broken
// exactly by a test whose premise I wrote myself.
test.describe('parseTreeOid (unit)', () => {
  const CLEAN = '61215fb4cf6345771769e2ab47331feca189ea97';
  const CONFLICT = 'b04aecf28169c15b565f1b0de7acfefde0000d4e\nf.txt\n';
  const OLD_GIT = "error: unknown option `write-tree'\nusage: git merge-tree [--write-tree] [<options>] <branch1> <branch2>\n";

  test('a clean merge yields its tree id', () => {
    expect(parseTreeOid(CLEAN)).toBe(CLEAN);
  });

  // A conflicting merge exits NON-ZERO and still prints a tree. Reading the exit code
  // instead of the output would misfile this as "could not verify".
  test('a conflicting merge still yields a tree id', () => {
    expect(parseTreeOid(CONFLICT)).toBe('b04aecf28169c15b565f1b0de7acfefde0000d4e');
  });

  // THE BUG THIS REPLACED: git < 2.38 has no --write-tree, exits 129, and the old bare
  // catch swallowed it into "assume real work" — a silent pass from a check that never
  // ran, inside the file that preaches against exactly that.
  test('an unsupported flag yields null, so the caller reports NOT VERIFIED', () => {
    expect(parseTreeOid(OLD_GIT)).toBeNull();
  });

  test('SHA-256 repositories (64 hex) are accepted', () => {
    expect(parseTreeOid('a'.repeat(64))).toBe('a'.repeat(64));
  });

  // Guards against the loose {40,64} form: a 41-character string is not any oid.
  test('a length between the two oid sizes is rejected', () => {
    expect(parseTreeOid('a'.repeat(41))).toBeNull();
  });

  test('empty and undefined are null, never a false tree', () => {
    expect(parseTreeOid('')).toBeNull();
    expect(parseTreeOid(undefined)).toBeNull();
  });
});


// The message table exists so a new verdict is a MISSING KEY rather than a silently-taken
// else branch. That only holds if something checks it, so: enumerate every verdict assess
// can actually produce across its whole input space, and require a template for each.
test.describe('message table covers every verdict', () => {
  const KINDS = new Set<string>();
  for (const branch of ['main', 'feat/x']) {
    for (const behind of [0, 3]) {
      for (const contributes of [true, false]) {
        for (const upstreamGone of [true, false]) {
          const { code, kind } = assess({ branch, behind, contributes, upstreamGone });
          if (code !== 0) KINDS.add(kind);
        }
      }
    }
  }

  test('the enumeration actually found verdicts — control for the loop', () => {
    // Without this, a bug that made assess always return ok would leave KINDS empty and
    // the coverage test below would pass vacuously.
    expect(KINDS.size).toBeGreaterThanOrEqual(3);
  });

  test('every failing verdict has a message template', () => {
    for (const kind of KINDS) expect([...MESSAGES.keys()]).toContain(kind);
  });

  test('every template renders the branch, the count and both shas', () => {
    for (const [kind, template] of MESSAGES) {
      const out = template({ branch: 'feat/zz', behind: 7, head: 'aaa1111', remote: 'bbb2222', treeClean: true });
      expect(out).toContain('7');
      expect(out).toContain('aaa1111');
      expect(out).toContain('bbb2222');
      // stale-main is about main itself, so it does not name a branch.
      if (kind !== 'stale-main') expect(out).toContain('feat/zz');
    }
  });

  // The two branch verdicts give OPPOSITE advice, and folding them together would force
  // one of them to lie. Pin the distinction that justifies keeping them separate.
  test('only spent-branch promises nothing is lost; deleted-upstream says look first', () => {
    const ctx = { branch: 'feat/zz', behind: 7, head: 'aaa1111', remote: 'bbb2222', treeClean: true };
    expect(messageFor('spent-branch')!(ctx)).toContain('nothing is lost');
    expect(messageFor('deleted-upstream')!(ctx)).not.toContain('nothing is lost');
    expect(messageFor('deleted-upstream')!(ctx)).toContain('git log --oneline origin/main..HEAD');
  });

  // ⚠️ THE CLASS-LEVEL TEST, not an instance test. The fourth assumed-property defect in
  // this script was in the ADVICE: "nothing is lost by leaving" is true about COMMITS and
  // silent about the WORKING TREE, and a reader with uncommitted work is not positioned to
  // notice the substitution. So rather than fixing that one sentence, this enumerates
  // EVERY message against BOTH tree states and pins the claim to the measured field.
  // A future message that hardcodes the reassurance fails here.
  test('no message claims "nothing is lost" unless the tree was measured clean', () => {
    const base = { branch: 'feat/zz', behind: 7, head: 'aaa1111', remote: 'bbb2222' };
    for (const [kind, template] of MESSAGES) {
      expect(template({ ...base, treeClean: false }), `${kind} with a dirty tree`)
        .not.toContain('nothing is lost');
      expect(template({ ...base, treeClean: false }), `${kind} must warn instead`)
        .toContain('UNCOMMITTED CHANGES');
    }
  });

  test('every message still prescribes something actionable in both states', () => {
    const base = { branch: 'feat/zz', behind: 7, head: 'aaa1111', remote: 'bbb2222' };
    for (const [kind, template] of MESSAGES) {
      for (const treeClean of [true, false]) {
        expect(template({ ...base, treeClean }), `${kind}/${treeClean}`)
          .toContain('git merge --ff-only origin/main');
      }
    }
  });

  // remedy is safe ONLY when BOTH ways of losing work are ruled out. The truth table is
  // pinned rather than sampled, because the FIRST version of this fix checked one property
  // and silently reintroduced the defect for the other: a shared prescription handed
  // `deleted-upstream` a "nothing is lost" it must never give.
  test('remedy is safe only when the tree is clean AND nothing may be unpushed', () => {
    const cases: [boolean, boolean, boolean][] = [
      // treeClean, mayHaveUnpushedWork, expected safeToLeave
      [true, false, true],
      [true, true, false],
      [false, false, false],
      [false, true, false],
    ];
    for (const [treeClean, mayHaveUnpushedWork, expected] of cases) {
      expect(remedy({ treeClean, mayHaveUnpushedWork }).safeToLeave,
        `clean=${treeClean} unpushed=${mayHaveUnpushedWork}`).toBe(expected);
    }
  });

  test('a dirty tree gets stash/pop around the switch; other states do not', () => {
    expect(remedy({ treeClean: true, mayHaveUnpushedWork: false }).steps).toHaveLength(1);
    const dirty = remedy({ treeClean: false, mayHaveUnpushedWork: false }).steps.join(' | ');
    expect(dirty).toContain('git stash');
    expect(dirty).toContain('git stash pop');
    // An unpushed-work warning alone must NOT invent stash steps — the tree is clean.
    expect(remedy({ treeClean: true, mayHaveUnpushedWork: true }).steps.join(' | '))
      .not.toContain('git stash');
  });

  // Unmeasured state takes the cautious branch either way: withholding the reassurance can
  // never mislead, giving it wrongly can. Mirrors main()'s catch around git status.
  test('unmeasured properties are treated as unsafe, not as safe', () => {
    expect(remedy({} as never).safeToLeave).toBe(false);
  });

  // The inspection command moved OUT of the deleted-upstream template and INTO remedy,
  // because having it in both produced the same advice twice — once computed, once
  // hand-written, which is what an incomplete migration to computed advice looks like.
  // These pin it so a future tidy-up cannot quietly drop the only step that shows a user
  // what they are about to walk away from.
  test('possible unpushed work always prescribes the command that reveals it', () => {
    const steps = remedy({ treeClean: true, mayHaveUnpushedWork: true }).steps.join(' | ');
    expect(steps).toContain('git log --oneline origin/main..HEAD');
    // ...and it must come BEFORE the switch: inspect, then act.
    const list = remedy({ treeClean: false, mayHaveUnpushedWork: true }).steps;
    expect(list.findIndex((s) => s.includes('git log'))).toBeLessThan(
      list.findIndex((s) => s.includes('git checkout main')));
  });

  test('no unpushed work means no inspection step — the advice is not boilerplate', () => {
    for (const treeClean of [true, false]) {
      expect(remedy({ treeClean, mayHaveUnpushedWork: false }).steps.join(' | '))
        .not.toContain('git log --oneline');
    }
  });

  test('deleted-upstream renders the inspection step in both tree states', () => {
    const base = { branch: 'feat/zz', behind: 7, head: 'aaa1111', remote: 'bbb2222' };
    for (const treeClean of [true, false]) {
      expect(messageFor('deleted-upstream')!({ ...base, treeClean }), `treeClean=${treeClean}`)
        .toContain('git log --oneline origin/main..HEAD');
    }
  });

  // The advice must appear ONCE. Two copies is what the duplication looked like.
  test('no message prints the same command twice', () => {
    const base = { branch: 'feat/zz', behind: 7, head: 'aaa1111', remote: 'bbb2222' };
    for (const [kind, template] of MESSAGES) {
      for (const treeClean of [true, false]) {
        const out = template({ ...base, treeClean });
        for (const cmd of ['git log --oneline origin/main..HEAD', 'git checkout main && git merge --ff-only origin/main']) {
          const n = out.split(cmd).length - 1;
          expect(n, `${kind}/${treeClean} prints "${cmd}" ${n} times`).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  // The distinction that survived the refactor and caught it breaking.
  test('deleted-upstream never promises nothing is lost, even on a clean tree', () => {
    const ctx = { branch: 'feat/zz', behind: 7, head: 'aaa1111', remote: 'bbb2222', treeClean: true };
    expect(messageFor('deleted-upstream')!(ctx)).not.toContain('nothing is lost');
    expect(messageFor('spent-branch')!(ctx)).toContain('nothing is lost');
  });

  // ⚠️ BORN FROM A REAL DEFECT (Codacy on #22, measured 2026-09-09). MESSAGES is now a
  // Map, which has no prototype chain, so these keys CANNOT resolve — the test stays to
  // pin that property, because a later refactor back to an object literal would silently
  // reintroduce it. Historically the lookup was
  // `MESSAGES[kind]` guarded by `if (!template)`, and four INHERITED keys defeat that:
  // "constructor" is callable and yields "[object Object]", "toString" yields
  // "[object Undefined]", "valueOf" and "__proto__" throw. The branch whose whole job is
  // to report a missing template printed garbage or crashed instead.
  //
  // The property ASSUMED was "kind is a verdict"; the property TESTED was "kind indexes
  // this object, prototype included". They agree on every value the other tests generate.
  test('inherited keys are rejected, not treated as templates', () => {
    for (const k of ['constructor', 'toString', 'valueOf', '__proto__', 'hasOwnProperty']) {
      expect(messageFor(k)).toBeNull();
    }
  });

  test('a real verdict still resolves — control, so the rejection is not blanket', () => {
    expect(typeof messageFor('spent-branch')).toBe('function');
    expect(messageFor('unknown-verdict')).toBeNull();
  });

  // Pins the reachability claim rather than asserting it in prose: assess() emits only
  // these four strings, so no prototype key can reach the lookup in practice. If a future
  // verdict is added, this fails and the coverage test above is what catches the message.
  test('assess emits only literal verdict names', () => {
    const kinds = new Set<string>();
    for (const branch of ['main', 'feat/x']) {
      for (const behind of [0, 3]) {
        for (const contributes of [true, false]) {
          for (const upstreamGone of [true, false]) {
            kinds.add(assess({ branch, behind, contributes, upstreamGone }).kind);
          }
        }
      }
    }
    expect([...kinds].sort()).toEqual(['deleted-upstream', 'ok', 'spent-branch', 'stale-main']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// End-to-end. The unit tests above CANNOT catch the defect this suite exists for:
// the first version of this fix used `ahead === 0` as the discriminator and its unit
// test passed, because the test fed it the assumed topology. This repo SQUASH-merges,
// so a merged branch keeps commits of its own and `ahead` is never 0. Only a real repo
// with a real squash merge falsifies that. A UNIT TEST AGREES WITH YOUR MODEL; ONLY
// THE WORLD DISAGREES WITH IT.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('tree-freshness guard (end-to-end, real squash merge)', () => {
  // Serial: these check out branches and reset --hard in one repo, and running them
  // in parallel would rebuild the whole fixture per worker for no benefit.
  test.describe.configure({ mode: 'serial' });
  let dir: string, repo: string;

  const git = (cwd: string, ...args: string[]) =>
    // stderr piped, not inherited: git's "Switched to branch" chatter would otherwise
    // interleave into the test reporter's output.
    execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

  const runGuard = (cwd: string) => {
    try {
      execFileSync(process.execPath, [GUARD], { cwd, encoding: 'utf8', stdio: 'pipe' });
      return 0;
    } catch (e: any) {
      return e.status ?? -1;
    }
  };

  test.beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'tj-freshness-'));
    const origin = join(dir, 'origin.git');
    repo = join(dir, 'work');
    execFileSync('git', ['init', '--bare', '-b', 'main', origin], { stdio: 'ignore' });
    execFileSync('git', ['clone', origin, repo], { stdio: 'ignore' });
    git(repo, 'config', 'user.email', 't@t.test');
    git(repo, 'config', 'user.name', 'T');

    const commit = (name: string, msg: string) => {
      writeFileSync(join(repo, name), `${msg}\n`);
      git(repo, 'add', name);
      git(repo, 'commit', '-m', msg);
    };

    commit('base.txt', 'base');
    git(repo, 'push', '-u', 'origin', 'main');

    // A branch with TWO commits, so a squash genuinely fuses them — the exact shape
    // that defeats both `git branch --merged` and `git cherry`.
    git(repo, 'checkout', '-b', 'chore/done');
    commit('a.txt', 'work one');
    commit('b.txt', 'work two');
    git(repo, 'push', '-u', 'origin', 'chore/done');

    // SQUASH-merge it into main, the way this project merges PRs.
    git(repo, 'checkout', 'main');
    git(repo, 'merge', '--squash', 'chore/done');
    git(repo, 'commit', '-m', 'chore: the squashed work (#1)');
    // ...then let main move on, so the spent branch is genuinely behind.
    commit('later.txt', 'mainline moved on');
    git(repo, 'push', 'origin', 'main');

    // A branch that CONFLICTS with main: merge-tree exits non-zero here, and the guard
    // must read the tree it still prints rather than treating the status as failure.
    git(repo, 'checkout', '-b', 'feat/conflicting', 'origin/main');
    writeFileSync(join(repo, 'later.txt'), 'a rival edit\n');
    git(repo, 'commit', '-am', 'conflicting edit');
    git(repo, 'checkout', 'main');
    writeFileSync(join(repo, 'later.txt'), 'mainline edit\n');
    git(repo, 'commit', '-am', 'mainline edit');
    git(repo, 'push', 'origin', 'main');

    // And a branch that still holds REAL unmerged work, as the false-positive control.
    git(repo, 'checkout', '-b', 'feat/live', 'HEAD~2');
    commit('c.txt', 'genuinely unmerged');
  });

  test.afterAll(() => rmSync(dir, { recursive: true, force: true }));

  test('the squash-merged branch is NOT detected by ancestry or patch-id', () => {
    // Documents WHY merge-tree is used. If either of these ever starts working, this
    // test fails and the simpler discriminator becomes available.
    git(repo, 'checkout', 'chore/done');
    expect(git(repo, 'branch', '--merged', 'origin/main')).not.toContain('chore/done');
    expect(git(repo, 'cherry', 'origin/main', 'chore/done')).toContain('+');
    // ...and it genuinely has commits of its own, so `ahead === 0` could never fire.
    const [, ahead] = git(repo, 'rev-list', '--left-right', '--count', 'origin/main...HEAD')
      .split(/\s+/).map(Number);
    expect(ahead).toBeGreaterThan(0);
  });

  test('standing on the squash-merged branch FAILS', () => {
    git(repo, 'checkout', 'chore/done');
    expect(runGuard(repo)).toBe(1);
  });

  test('standing on a branch with real unmerged work PASSES', () => {
    git(repo, 'checkout', 'feat/live');
    expect(runGuard(repo)).toBe(0);
  });

  // The conflict path end-to-end: merge-tree exits NON-ZERO but still prints a tree, and
  // a conflicted tree differs from main's — so the branch correctly reads as carrying
  // work and stays exempt. Reading the exit status instead would have failed here.
  test('a branch that CONFLICTS with main passes — non-zero exit still yields a tree', () => {
    git(repo, 'checkout', 'feat/conflicting');
    // Control: this test is worthless unless the merge REALLY conflicts. Assert the
    // non-zero exit first, so a fixture that quietly stopped conflicting fails loudly
    // instead of passing for the wrong reason.
    let status = 0;
    let stdout = '';
    try {
      stdout = execFileSync('git', ['merge-tree', '--write-tree', 'origin/main', 'HEAD'],
        { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e: any) {
      status = e.status;
      stdout = e.stdout ?? '';
    }
    expect(status).not.toBe(0);              // it genuinely conflicts
    expect(parseTreeOid(stdout)).not.toBeNull(); // and git still printed a tree
    expect(runGuard(repo)).toBe(0);          // so the guard leaves it exempt
  });

  test('stale main FAILS and current main PASSES', () => {
    git(repo, 'checkout', 'main');
    git(repo, 'reset', '--hard', 'origin/main~1');
    expect(runGuard(repo)).toBe(1);
    git(repo, 'reset', '--hard', 'origin/main');
    expect(runGuard(repo)).toBe(0);
  });

  // ⚠️ THE DECAY CASE, reproducing what happened in this repository on 2026-09-09.
  // merge-tree only sees "this branch is spent" until main edits the files the branch
  // touched; after that, merging it WOULD change something, so it honestly reports
  // "contributes" and the spent-branch rule goes quiet. In the real incident the edit was
  // PR #21 rewriting check-tree-freshness.mjs — the guard's own fix blinded it to the
  // branch that motivated it. The deleted-upstream signal does not decay.
  test('a merged branch stays detected after main edits its files — via the deleted remote', () => {
    // The gate deletes a branch when its PR lands.
    execFileSync('git', ['push', 'origin', '--delete', 'chore/done'], { cwd: repo, stdio: 'ignore' });
    // ...and main moves on THROUGH THE SAME FILE the branch introduced.
    git(repo, 'checkout', 'main');
    writeFileSync(join(repo, 'a.txt'), 'mainline rewrote this later\n');
    git(repo, 'commit', '-am', 'rewrite a.txt on main');
    git(repo, 'push', 'origin', 'main');

    git(repo, 'checkout', 'chore/done');
    execFileSync('git', ['fetch', '--quiet', 'origin'], { cwd: repo, stdio: 'ignore' });

    // CONTROL: the old discriminator must now be BLIND, otherwise this test would pass
    // for the wrong reason and prove nothing about the new signal.
    let stdout = '';
    try {
      stdout = execFileSync('git', ['merge-tree', '--write-tree', 'origin/main', 'HEAD'],
        { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e: any) { stdout = e.stdout ?? ''; }
    const mainTree = git(repo, 'rev-parse', 'origin/main^{tree}');
    expect(parseTreeOid(stdout)).not.toBe(mainTree); // merge-tree now says "contributes"

    // ...and the guard still catches it, on the deleted remote alone.
    expect(runGuard(repo)).toBe(1);
  });
});
