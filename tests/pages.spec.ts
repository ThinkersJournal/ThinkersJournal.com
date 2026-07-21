import { test, expect } from '@playwright/test';
import { SUPPORT, APP } from '../src/consts';

test('mission page renders with the mission heading', async ({ page }) => {
  await page.goto('/mission');
  await expect(page.getByRole('heading', { level: 1 }))
    .toContainText('No thinker should have to build alone.');
  await expect(page).toHaveTitle(/Mission · Thinker's Journal/);
});

test('offerings page lists all five offerings', async ({ page }) => {
  await page.goto('/offerings');
  for (const t of ['Mentorship', 'Pairing', 'Standards, held in trust', 'Tooling & infrastructure', 'The Community']) {
    await expect(page.getByRole('heading', { name: new RegExp(t) })).toBeVisible();
  }
});

test('standards page links to the GitHub org', async ({ page }) => {
  await page.goto('/standards');
  await expect(page.getByRole('link', { name: 'Browse KISS on GitHub →' }))
    .toHaveAttribute('href', 'https://github.com/thinkersjournal');
});

test('community page explains the flagship and links to get-involved', async ({ page }) => {
  await page.goto('/community');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Where your work comes alive.');
  await expect(page.getByRole('link', { name: 'Help build it' })).toHaveAttribute('href', '/get-involved');
});

test('get-involved offers a mentor role anchor', async ({ page }) => {
  await page.goto('/get-involved');
  await expect(page.locator('#mentor')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Become a mentor' })).toBeVisible();
});

test('support page shows live avenues as cards and names pending ones as coming soon', async ({ page }) => {
  await page.goto('/support');
  const live = SUPPORT.filter((s) => s.live);
  const pending = SUPPORT.filter((s) => !s.live);

  // Live avenues render as give-cards that link out to the platform.
  for (const s of live) {
    const card = page.locator(`a.card[href="${s.href}"]`);
    await expect(card).toBeVisible();
    await expect(card).toContainText(s.label);
  }

  // Pending avenues are not cards, but are named in the "more avenues on the way" note.
  if (pending.length) {
    const soon = page.locator('.soon');
    await expect(soon).toBeVisible();
    for (const s of pending) {
      await expect(soon).toContainText(s.label);
    }
  }
});

test('community app cross-links appear only when the app is live', async ({ page }) => {
  // Gated by APP.live in src/consts.ts: off pre-launch (no dead links), on once the
  // Community app is deployed. This test tracks the flag so it stays green either way.
  await page.goto('/');
  const signIn = page.locator(`header.nav a[href="${APP.login}"]`);
  if (APP.live) {
    await expect(signIn).toBeVisible();
  } else {
    await expect(signIn).toHaveCount(0);
  }

  await page.goto('/community');
  const openApp = page.locator(`a.btn[href="${APP.url}"]`);
  if (APP.live) {
    await expect(openApp).toBeVisible();
  } else {
    await expect(openApp).toHaveCount(0);
  }
});

test('unknown routes render the branded 404', async ({ page }) => {
  const res = await page.goto('/no-such-page');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText("hasn't been built yet");
});
