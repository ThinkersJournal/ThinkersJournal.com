import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = ['/', '/mission', '/offerings', '/community', '/standards', '/get-involved', '/support', '/dispatches', '/privacy'];

for (const route of ROUTES) {
  test(`no serious accessibility violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
    expect(serious, JSON.stringify(serious.map((v) => v.id), null, 2)).toEqual([]);
  });
}

// Heading order (WCAG 1.3.1) needs its own sweep: axe tags `heading-order` as
// best-practice/moderate, so the wcag2a+wcag2aa scan above — which then filters to
// serious+critical — is structurally blind to it. Runs the rule explicitly, and adds
// the 404 page, where a skipped level is most likely (it has an h1 and little else).
for (const route of [...ROUTES, '/no-such-page']) {
  test(`headings stay in order on ${route}`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withRules(['heading-order']).analyze();
    const offenders = results.violations.flatMap((v) => v.nodes.map((n) => n.html));
    expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);
  });
}

// The sweeps above run at the default (desktop) viewport, where the mobile nav is
// display:none — so the zero-JS checkbox disclosure and its OPEN state had never been
// scanned. Below 840px the burger appears and the links become a dropdown panel.
// Scan the menu open, at mobile width, on a real page.
test('mobile nav has no serious a11y violations with the menu open', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  // Open the disclosure and confirm the panel is actually shown before scanning.
  await page.locator('label.burger').click();
  await expect(page.locator('nav.links')).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));
  expect(serious, JSON.stringify(serious.map((v) => v.id), null, 2)).toEqual([]);
});
