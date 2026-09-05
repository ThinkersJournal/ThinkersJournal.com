import { test, expect } from '@playwright/test';

test('home responds and renders the brand name', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Thinker's Journal/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('No thinker should');
});

test('body uses the piano-black background token', async ({ page }) => {
  await page.goto('/');
  const bg = await page.evaluate(() =>
    getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(6, 6, 8)'); // #060608
});

test('home exposes social-share (Open Graph + Twitter) meta', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[property="og:image"]'))
    .toHaveAttribute('content', /\/og\.png$/);
  await expect(page.locator('meta[property="og:image:width"]'))
    .toHaveAttribute('content', '1200');
  await expect(page.locator('meta[name="twitter:card"]'))
    .toHaveAttribute('content', 'summary_large_image');
});

test('canonical + og:url use the www canonical host', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="canonical"]'))
    .toHaveAttribute('href', 'https://www.thinkersjournal.com/');
  await expect(page.locator('meta[property="og:url"]'))
    .toHaveAttribute('content', 'https://www.thinkersjournal.com/');
});
