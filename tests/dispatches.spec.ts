import { test, expect } from '@playwright/test';

test('dispatches index lists the welcome post', async ({ page }) => {
  await page.goto('/dispatches');
  await expect(page.getByRole('link', { name: /Why Thinker's Journal exists/ })).toBeVisible();
});

test('a dispatch post renders its body and a back link', async ({ page }) => {
  await page.goto('/dispatches');
  await page.getByRole('link', { name: /Why Thinker's Journal exists/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText("Why Thinker's Journal exists");
  await expect(page.getByRole('link', { name: '← All dispatches' })).toBeVisible();
});
