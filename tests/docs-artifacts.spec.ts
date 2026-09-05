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

/**
 * Repo-relative paths a plan's steps name, with the verb that named them.
 *
 * ⚠ The first version of this required the path to follow the verb IMMEDIATELY, and
 * silently dropped every step with a descriptive phrase in between — `Create temporary
 * \`src/pages/index.astro\``, `Create the seed post \`…welcome.md\``, `Write the failing
 * smoke test \`…\``. It captured 34 of 42 and I reported 34 as the population. An
 * enumeration is not a population, and an extractor that quietly drops members makes the
 * "all present" test below weaker without ever failing. The regression cases in
 * `the extractors can fail rather than returning a false clean result` pin those forms.
 */
export function namedArtifacts(plan: string): { verb: string; path: string }[] {
  // A literal rather than `new RegExp(...)`: a dynamically built pattern is flagged as a
  // security risk, and would be a real one the moment the interpolated part stopped being
  // a constant. `matchAll` clones the regex, so the `g` flag carries no shared lastIndex.
  const re =
    /\*\*Step \d+: (Create|Rewrite|Write|Update|Finalize|Extend|Add|Render)\b[^`*]*`([^`]+)`/gi;
  const seen = new Map<string, string>();
  for (const m of plan.matchAll(re)) {
    // A step may name a component (`<Wordmark />`) rather than a file. Only path-shaped
    // captures are artifacts whose existence means anything.
    if (/^[\w.\-/[\]]+\.[a-z0-9]+$/i.test(m[2]) && !seen.has(m[2])) seen.set(m[2], m[1]);
  }
  return [...seen].map(([path, verb]) => ({ verb, path }));
}

/** Step checkboxes still marked unticked. */
export function untickedSteps(plan: string): string[] {
  return plan.split(/\r?\n/).filter((l) => /^\s*- \[ \] \*\*Step/.test(l));
}

const planFiles = existsSync(PLANS)
  ? readdirSync(PLANS).filter((f) => f.endsWith('.md'))
  : [];

test.describe('executed planning artifacts are retired', () => {
  // Positive control on the sweep itself: an empty plan directory would make every
  // per-plan test below simply not exist, which reads as green.
  test('there is at least one plan to check', () => {
    expect(planFiles.length, 'no plans found — this file checked nothing').toBeGreaterThan(0);
  });

  // One test per plan, so a failure names the culprit instead of collapsing the
  // directory into a single red.
  for (const file of planFiles) {
    test(`${file}: executed means no unticked steps`, () => {
      const plan = readFileSync(join(PLANS, file), 'utf8');
      const artifacts = namedArtifacts(plan);

      // Positive control per plan: the extractor must find steps, or "all present" is
      // vacuously true and this plan is never actually examined.
      expect(
        artifacts.length,
        `${file}: no "Step N: <verb> \`path\`" steps parsed — the extractor has lost its ` +
          `grip on this plan's format and the check below would pass vacuously`,
      ).toBeGreaterThan(0);

      // ⚠ File existence can only tell us a plan is DONE when the plan brings files into
      // being. A plan made entirely of Update/Extend steps has all its artifacts present
      // on day zero, so this check would demand ticked boxes before any work started —
      // a false red on an unstarted plan. Such a plan is SKIPPED, which is a known blind
      // spot rather than a clearance: this file cannot judge an update-only plan.
      const created = artifacts.filter((a) => /^create$/i.test(a.verb));
      test.skip(created.length === 0, 'update-only plan — existence cannot date the work');

      const missing = created.filter((a) => !existsSync(join(REPO, a.path)));
      if (missing.length > 0) return; // still genuinely in progress

      const allMissing = artifacts.filter((a) => !existsSync(join(REPO, a.path)));
      if (allMissing.length > 0) return;

      expect(
        untickedSteps(plan),
        `${file}: every one of its ${artifacts.length} named files exists, so this plan ` +
          `is executed — but it still carries unticked step boxes. A reader who lands ` +
          `mid-document sees a work queue. Tick them and mark the header EXECUTED.`,
      ).toEqual([]);
    });
  }

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
    const paths = (md: string) => namedArtifacts(md).map((a) => a.path);

    expect(paths('no steps here')).toEqual([]);
    expect(paths('**Step 1: Create `a/b.ts`**')).toEqual(['a/b.ts']);

    // ⚠ REGRESSION: the forms the first version of this extractor silently dropped.
    // Each is a real step heading from the 2026-07-13 plan.
    expect(paths('**Step 5: Create temporary `src/pages/index.astro`**')).toEqual([
      'src/pages/index.astro',
    ]);
    expect(paths('**Step 2: Create the seed post `src/content/dispatches/welcome.md`**')).toEqual([
      'src/content/dispatches/welcome.md',
    ]);
    expect(paths('**Step 6: Write the failing smoke test `tests/smoke.spec.ts`**')).toEqual([
      'tests/smoke.spec.ts',
    ]);
    expect(paths('**Step 3: Extend `tests/pages.spec.ts`**')).toEqual(['tests/pages.spec.ts']);

    // A component is not a file, and its absence from disk must mean nothing.
    expect(paths('**Step 6: Render `<Wordmark />` on the home page**')).toEqual([]);

    // Duplicates collapse; a file touched by two steps is one artifact, and the FIRST
    // verb wins so a later `Update` cannot mask that the file was `Create`d.
    const twice = namedArtifacts('**Step 1: Create `a.ts`** x **Step 9: Update `a.ts`**');
    expect(twice).toEqual([{ verb: 'Create', path: 'a.ts' }]);

    expect(untickedSteps('- [x] **Step 1: done**')).toEqual([]);
    expect(untickedSteps('- [ ] **Step 1: open**')).toHaveLength(1);
    // A bare unticked bullet that is not a Step is not this check's business.
    expect(untickedSteps('- [ ] buy milk')).toEqual([]);
  });
});
