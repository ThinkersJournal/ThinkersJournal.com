import { test, expect } from '@playwright/test';

test('wordmark shows the brand name with a green dot', async ({ page }) => {
  await page.goto('/');
  const dot = page.getByTestId('wm-dot').first();
  await expect(dot).toHaveText('.');
  const color = await dot.evaluate((el) => getComputedStyle(el).color);
  expect(color).toBe('rgb(61, 255, 149)'); // #3dff95
});

test('primary nav exposes the four sections plus Support', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Primary' });
  for (const label of ['Mission', 'What We Offer', 'Standards', 'Dispatches', 'Support']) {
    await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
  }
});

test('footer states the non-profit promise', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('contentinfo'))
    .toContainText('Free, at cost, or below market — always.');
});

test('page has exactly one banner, main, and contentinfo landmark', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('banner')).toHaveCount(1);
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.getByRole('contentinfo')).toHaveCount(1);
});

test('mobile: primary nav collapses into a toggle menu', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Primary' });
  const mission = nav.getByRole('link', { name: 'Mission', exact: true });
  const burger = page.locator('label.burger');

  // Burger visible; links collapsed (not reachable) until opened.
  await expect(burger).toBeVisible();
  await expect(mission).toBeHidden();

  // Opening the menu reveals the links.
  await burger.click();
  await expect(mission).toBeVisible();
});
