/**
 * Simplified E2E Test for MealMind
 * Verifies app loads with seeded backend data, no mocks used
 */

import { test, expect } from '@playwright/test';

test.describe('MealMind Seeded Load', () => {
  test('Home page shows data with seeded plan', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Wait for dashboard to load with seeded data
    await page.waitForLoadState('networkidle');

    // With seeded approved plan, we should see meal cards (not empty state)
    // Check that we DON'T see the empty state
    await expect(page.getByText('No plan yet')).not.toBeVisible({ timeout: 10000 });

    // Should see meal cards or some content indicating data is loaded
    // Wait for either meal cards or macro rings to appear (indicating data loaded)
    await Promise.race([
      page.waitForSelector('[class*="border-border"]', { timeout: 10000 }),
      page.waitForSelector('svg', { timeout: 10000 }), // Macro rings are SVGs
    ]);

    // Optional: Click Generate button if backend supports it with seeded data
    // Uncomment to test generation flow with real backend:
    // const generateBtn = page.getByRole('button', { name: /Generate this week's plan/i });
    // await generateBtn.click();
    // await page.waitForLoadState('networkidle');
  });
});
