import { test, expect } from '@playwright/test';

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
