import { test, expect } from '@playwright/test';

test('home responds and renders the brand name', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('placeholder')).toHaveText("Thinker's Journal");
});

test('body uses the piano-black background token', async ({ page }) => {
  await page.goto('/');
  const bg = await page.evaluate(() =>
    getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(6, 6, 8)'); // #060608
});
