import { test, expect } from '@playwright/test';

test('home responds and renders the brand name', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('placeholder')).toHaveText("Thinker's Journal");
});
