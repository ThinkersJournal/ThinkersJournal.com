import { test, expect } from '@playwright/test';

test('hero shows the tagline and both CTAs', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 }))
    .toContainText('No thinker should');
  await expect(page.getByRole('link', { name: 'Explore the mission' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Support the mission' }).first()).toBeVisible();
});

test('the gap section lands the emotional line', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Most ideas never get built.')).toBeVisible();
});

test('all five offerings render, with The Community marked Coming', async ({ page }) => {
  await page.goto('/');
  for (const t of ['Mentorship', 'Pairing', 'Standards, held in trust', 'Tooling & infrastructure', 'The Community']) {
    await expect(page.getByRole('heading', { name: t })).toBeVisible();
  }
  await expect(page.getByText('Coming', { exact: true })).toBeVisible();
});

test('KISS proof links to the standards page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'See the standards →' }))
    .toHaveAttribute('href', '/standards');
});

test('community teaser links to /community', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: "See what we're building →" }))
    .toHaveAttribute('href', '/community');
});

test('join/support band offers both paths', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Join the mission' })).toHaveAttribute('href', '/get-involved');
  await expect(page.getByRole('link', { name: 'Support the mission' }).last()).toHaveAttribute('href', '/support');
});
