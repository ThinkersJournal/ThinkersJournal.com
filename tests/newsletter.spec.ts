import { test, expect, type Page } from '@playwright/test';

// The form talks to /api/subscribe (a Cloudflare Pages Function absent under
// `astro preview`), so we mock both verbs: GET drives the readiness gate, POST drives
// the submit result. The form is revealed only when the backend reports configured;
// otherwise the static "email hello@" fallback stays. It never claims a false success.

async function setup(
  page: Page,
  opts: { configured?: boolean; postResult?: object } = {},
) {
  const { configured = true, postResult = { ok: true } } = opts;
  await page.route('**/api/subscribe', (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { configured } });
    return route.fulfill({ json: postResult });
  });
  await page.goto('/dispatches/');
}

test.describe('newsletter signup (/dispatches)', () => {
  test('backend unconfigured → fallback shown, no form', async ({ page }) => {
    await setup(page, { configured: false });
    await expect(page.locator('#signup-fallback')).toBeVisible();
    await expect(page.locator('#signup-form')).toBeHidden();
  });

  test('unavailable endpoint (real 404) → fallback shown, page complete', async ({ page }) => {
    // No mock: /api/subscribe 404s under preview, which reads as not-configured.
    await page.goto('/dispatches/');
    await expect(page.locator('#signup-fallback')).toBeVisible();
    await expect(page.locator('#signup-form')).toBeHidden();
    await expect(page.locator('.list a').first()).toBeVisible(); // post list unaffected
  });

  test('backend configured → live form revealed, fallback hidden', async ({ page }) => {
    await setup(page, { configured: true });
    await expect(page.locator('#signup-form')).toBeVisible();
    await expect(page.locator('#signup-fallback')).toBeHidden();
  });

  test('valid submit → double-opt-in confirmation message', async ({ page }) => {
    await setup(page, { configured: true, postResult: { ok: true } });
    await expect(page.locator('#signup-form')).toBeVisible();
    await page.locator('#signup-email').fill('reader@example.com');
    await page.locator('#signup-form button[type="submit"]').click();
    await expect(page.locator('#signup-status')).toContainText(/confirm/i);
  });

  test('Listmonk unreachable → honest error, never a false success', async ({ page }) => {
    await setup(page, { configured: true, postResult: { ok: false, reason: 'upstream' } });
    await expect(page.locator('#signup-form')).toBeVisible();
    await page.locator('#signup-email').fill('reader@example.com');
    await page.locator('#signup-form button[type="submit"]').click();
    const status = page.locator('#signup-status');
    await expect(status).toContainText(/hello@thinkersjournal\.com/i);
    await expect(status).not.toContainText(/confirm/i);
  });

  test('invalid email → no request, no false success', async ({ page }) => {
    let posts = 0;
    await page.route('**/api/subscribe', (route) => {
      if (route.request().method() === 'GET') return route.fulfill({ json: { configured: true } });
      posts += 1;
      return route.fulfill({ json: { ok: true } });
    });
    await page.goto('/dispatches/');
    await expect(page.locator('#signup-form')).toBeVisible();
    await page.locator('#signup-email').fill('not-an-email');
    await page.locator('#signup-form button[type="submit"]').click();
    await expect(page.locator('#signup-form')).toBeVisible(); // still there, not a success
    await expect(page.locator('#signup-status')).not.toContainText(/confirm/i);
    expect(posts).toBe(0);
  });
});
