import { test, expect, type Page } from '@playwright/test';

// The island fetches /api/oc-total (a Cloudflare Pages Function that does NOT exist
// under `astro preview`), so we mock the endpoint with page.route to exercise every
// display path. The floor is $100 (10000 cents): below it — and on any failure — the
// element must stay hidden and never render "$0".
//
// The island's module script fetches on load, so waitForResponse is armed BEFORE goto
// (a wait set up after navigation would miss the response and hang).

/** Mock /api/oc-total with `json`, navigate, and wait for the island's fetch to resolve. */
async function loadWithMock(page: Page, json: object) {
  await page.route('**/api/oc-total', (route) => route.fulfill({ json }));
  await Promise.all([
    page.waitForResponse('**/api/oc-total'),
    page.goto('/support/'),
  ]);
}

test.describe('Open Collective donation-total island (/support)', () => {
  test('stays hidden when the endpoint is unavailable — page still complete', async ({ page }) => {
    // No mock: real preview 404s /api/oc-total, which the island treats as no data.
    await Promise.all([
      page.waitForResponse('**/api/oc-total'),
      page.goto('/support/'),
    ]);
    await expect(page.locator('#oc-total')).toBeHidden();
    await expect(page.locator('.card').first()).toBeVisible(); // giving cards unaffected
  });

  test('shows the formatted total when above the floor', async ({ page }) => {
    await loadWithMock(page, { ok: true, amountCents: 250000, currency: 'USD' });
    const total = page.locator('#oc-total');
    await expect(total).toBeVisible();
    await expect(total).toContainText('$2,500');
    await expect(total).toContainText('raised');
  });

  test('stays hidden on a zero total — never shows $0', async ({ page }) => {
    await loadWithMock(page, { ok: true, amountCents: 0, currency: 'USD' });
    await expect(page.locator('#oc-total')).toBeHidden();
    await expect(page.locator('#oc-total')).toBeEmpty();
  });

  test('stays hidden below the floor (e.g. $50) — no trivial number', async ({ page }) => {
    await loadWithMock(page, { ok: true, amountCents: 5000, currency: 'USD' });
    await expect(page.locator('#oc-total')).toBeHidden();
  });

  test('stays hidden when the fetch reports failure', async ({ page }) => {
    await loadWithMock(page, { ok: false });
    await expect(page.locator('#oc-total')).toBeHidden();
  });
});
