import { test, expect } from '@playwright/test';

test('dashboard matches baseline', async ({ page }) => {
  await page.goto('/');
  // Wait for React app to hydrate — wait for root content to load
  await page.waitForFunction(() => {
    const root = document.getElementById('root');
    if (!root) return false;
    // Wait for real content (not skeleton loaders)
    const hasMealCards = document.querySelectorAll('[class*="border-border"]').length > 0;
    const hasMacroRings = document.querySelectorAll('svg').length > 0;
    const hasSkeletons = document.querySelectorAll('.animate-pulse').length > 0;
    return (hasMealCards || hasMacroRings) && !hasSkeletons;
  }, { timeout: 30000 });
  // Wait for specific heading to ensure content is rendered
  await page.waitForSelector('h2:text("Today\'s meals")', { timeout: 10000 });
  // Wait a bit more for macro rings and images to settle
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot('dashboard.png', { maxDiffPixelRatio: 0.02 });
});
