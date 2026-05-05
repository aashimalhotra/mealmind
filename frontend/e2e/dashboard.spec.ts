import { test, expect } from '@playwright/test';

test('dashboard matches baseline', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('dashboard.png', { maxDiffPixelRatio: 0.02 });
});
