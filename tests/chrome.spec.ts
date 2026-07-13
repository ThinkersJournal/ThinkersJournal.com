import { test, expect } from '@playwright/test';

test('wordmark shows the brand name with a green dot', async ({ page }) => {
  await page.goto('/');
  const dot = page.getByTestId('wm-dot').first();
  await expect(dot).toHaveText('.');
  const color = await dot.evaluate((el) => getComputedStyle(el).color);
  expect(color).toBe('rgb(61, 255, 149)'); // #3dff95
});
