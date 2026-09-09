import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
// The tree-freshness guard. It shipped untested in PR #16 and its exemption hole was
// found by a human walking into it — so the decision is pinned here, AND exercised
// end-to-end against a real squash-merged repository.
import { assess } from '../scripts/check-tree-freshness.mjs';

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

  test('stale main FAILS and current main PASSES', () => {
    git(repo, 'checkout', 'main');
    git(repo, 'reset', '--hard', 'origin/main~1');
    expect(runGuard(repo)).toBe(1);
    git(repo, 'reset', '--hard', 'origin/main');
    expect(runGuard(repo)).toBe(0);
  });
});
