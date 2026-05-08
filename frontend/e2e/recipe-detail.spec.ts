import { test, expect } from '@playwright/test';

// Requires seeded recipe in E2E environment
test('recipe detail screenshot', async ({ page }) => {
  // Navigate to the seeded recipe page
  await page.goto('/recipe/e2e-recipe-1');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Wait for ingredient list to load
  await page.waitForSelector('[data-testid="ingredient-list"]', { timeout: 10000 });

  // Take screenshot for visual regression
  await expect(page).toHaveScreenshot('recipe-detail.png', {
    maxDiffPixelRatio: 0.02
  });
});
