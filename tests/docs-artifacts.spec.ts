import { test, expect } from '@playwright/test';
// A planning document that has been fully executed must SAY SO in the places a reader
// looks first — its header, its status field, and its checkboxes.
//
// This exists because on 2026-09-05 both 2026-07-13 artifacts still read as open work
// against a site that had been live for weeks. The plan carried 83 unticked step boxes
// and zero ticked ones, under a header instructing an agent to "implement this plan
// task-by-task"; the spec's Status field said "ready for implementation planning". The
// planning had happened, the implementation had happened, and it had shipped through
// PRs #1-#10.
//
// Nothing retires a finished plan. A stale open item consumes queue position and
// attention indefinitely, and the failure is silent in the dangerous direction: an agent
// handed that plan would have started by creating `package.json` against a live site.
//
// ⚠ This repository has NO CI, so this file is a detector only when someone runs
// `npm test`. That is weaker than a gate and is stated rather than implied.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PLANS = join(REPO, 'docs/superpowers/plans');
const SPEC = 'docs/superpowers/specs/2026-07-13-thinkers-journal-website-design.md';

/** Repo-relative paths a plan's steps say they create. */
export function namedArtifacts(plan: string): string[] {
  const re = /\*\*Step \d+: (?:Create|Rewrite|Write|Update|Finalize) `([^`]+)`/g;
  return [...new Set([...plan.matchAll(re)].map((m) => m[1]))];
}

/** Step checkboxes still marked unticked. */
export function untickedSteps(plan: string): string[] {
  return plan.split(/\r?\n/).filter((l) => /^\s*- \[ \] \*\*Step/.test(l));
}

const planFiles = existsSync(PLANS)
  ? readdirSync(PLANS).filter((f) => f.endsWith('.md'))
  : [];

test.describe('executed planning artifacts are retired', () => {
  test('a plan whose every named file exists has no unticked steps', () => {
    // Positive control: the sweep must have a subject. An empty plan list would
    // satisfy every assertion below by never entering the loop.
    expect(planFiles.length, 'no plans found — this test checked nothing').toBeGreaterThan(0);

    for (const file of planFiles) {
      const plan = readFileSync(join(PLANS, file), 'utf8');
      const artifacts = namedArtifacts(plan);

      // Positive control per plan: the extractor must find steps, or "all present"
      // is vacuously true and the plan is never examined.
      expect(
        artifacts.length,
        `${file}: no "Step N: Create \`path\`" steps parsed — the extractor has lost ` +
          `its grip on this plan's format and the check below would pass vacuously`,
      ).toBeGreaterThan(0);

      const missing = artifacts.filter((a) => !existsSync(join(REPO, a)));
      if (missing.length > 0) continue; // still genuinely in progress

      expect(
        untickedSteps(plan),
        `${file}: every one of its ${artifacts.length} named files exists, so this plan ` +
          `is executed — but it still carries unticked step boxes. A reader who lands ` +
          `mid-document sees a work queue. Tick them and mark the header EXECUTED.`,
      ).toEqual([]);
    }
  });

  test('the website design spec does not still await implementation planning', () => {
    const spec = readFileSync(join(REPO, SPEC), 'utf8');
    const status = spec
      .split(/\r?\n/)
      .find((l) => l.trimStart().startsWith('- **Status:**'));

    expect(status, `no "- **Status:**" field in ${SPEC} — this test checked nothing`).toBeTruthy();
    expect(
      status,
      'the spec claims it is awaiting implementation planning. The plan was written the ' +
        'same day, executed, and the site is live — quoting the old wording in the ' +
        'DISCHARGED blockquote is intended, asserting it as the Status field is not.',
    ).not.toContain('ready for implementation planning');
  });

  test('the extractors can fail rather than returning a false clean result', () => {
    expect(namedArtifacts('no steps here')).toEqual([]);
    expect(namedArtifacts('**Step 1: Create `a/b.ts`**')).toEqual(['a/b.ts']);
    // Duplicates collapse; a file touched by two steps is one artifact.
    expect(
      namedArtifacts('**Step 1: Create `a.ts`** ... **Step 9: Update `a.ts`**'),
    ).toEqual(['a.ts']);

    expect(untickedSteps('- [x] **Step 1: done**')).toEqual([]);
    expect(untickedSteps('- [ ] **Step 1: open**')).toHaveLength(1);
    // A bare unticked bullet that is not a Step is not this check's business.
    expect(untickedSteps('- [ ] buy milk')).toEqual([]);
  });
});
