import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
// The tree-freshness guard. It shipped untested in PR #16 and its exemption hole was
// found by a human walking into it — so the decision is pinned here, AND exercised
// end-to-end against a real squash-merged repository.
import { assess, parseTreeOid } from '../scripts/check-tree-freshness.mjs';

const GUARD = resolve('scripts/check-tree-freshness.mjs');

test.describe('tree-freshness decision (unit)', () => {
  const on = (branch: string, behind: number, contributes: boolean) =>
    assess({ branch, behind, contributes });

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
});
