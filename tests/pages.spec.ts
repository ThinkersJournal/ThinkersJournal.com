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

test('support page shows all configured giving avenues', async ({ page }) => {
  await page.goto('/support');
  for (const name of ['Open Collective', 'GitHub Sponsors', 'Ko-fi']) {
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  }
});
