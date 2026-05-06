import { test, expect } from '@playwright/test';

test('recipe detail matches baseline', async ({ page }) => {
  // Use known seeded recipe ID (update if actual seed data uses a different ID)
  const seededRecipeId = 'recipe-1';
  await page.goto(`/recipe/${seededRecipeId}`);

  // Wait for React app to hydrate
  await page.waitForFunction(() => {
    const root = document.getElementById('root');
    return root && root.innerHTML.length > 100;
  }, { timeout: 30000 });

  // Wait for recipe content to fully load (ingredient list is rendered when recipe is available)
  await page.waitForSelector('text="Ingredients"', { timeout: 10000 });

  // Wait for macros and images to settle
  await page.waitForTimeout(500);

  // Baseline screenshot (first run will create the snapshot, subsequent runs compare)
  await expect(page).toHaveScreenshot('recipe-detail.png', { maxDiffPixelRatio: 0.02 });
});
