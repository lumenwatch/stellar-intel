/**
 * Landing-page smoke test (#533): the page renders its key sections and the
 * primary CTAs navigate correctly. Run by .github/workflows/preview-deploy.yml
 * against the deployed preview URL (PREVIEW_URL), or locally against the dev
 * server started by playwright.config.ts when PREVIEW_URL is unset.
 */
import { test, expect } from '@playwright/test';

if (process.env.PREVIEW_URL) {
  test.use({ baseURL: process.env.PREVIEW_URL });
}

test.describe('Landing page smoke test', () => {
  // Live-rate widgets (Hero, RatePreview) poll continuously, so the network
  // never goes idle — wait for the hero heading instead of 'networkidle'.
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('renders the hero heading and headline stats', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'What anchors say.What anchors did.'
    );
    await expect(page.locator('dl dt').filter({ hasText: /^anchors$/ })).toBeVisible();
    await expect(page.locator('dl dt').filter({ hasText: /^corridors$/ })).toBeVisible();
    await expect(page.locator('dl dt').filter({ hasText: /^countries$/ })).toBeVisible();
  });

  test('"Off-ramp" navigation opens the off-ramp page', async ({ page }) => {
    await page.getByRole('banner').getByRole('link', { name: 'Off-ramp', exact: true }).click();
    // Generous timeout: a route visited for the first time against a local
    // `next dev` server compiles on demand, which can exceed the default 5s.
    await page.waitForURL(/\/offramp/, { timeout: 15000 });
  });

  test('"See the record" opens the anchor registry', async ({ page }) => {
    await page.getByRole('link', { name: 'See the record', exact: true }).click();
    await page.waitForURL(/\/anchors/, { timeout: 15000 });
  });
});
