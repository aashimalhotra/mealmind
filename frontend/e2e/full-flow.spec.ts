/**
 * Simplified E2E Test for MealMind
 * Verifies app loads with seeded backend data, no mocks used
 */

import { test, expect } from '@playwright/test';

test.describe('MealMind Seeded Load', () => {
  test('Home page shows empty state with seeded data', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Check empty state (seeded data has no active plan)
    await expect(page.getByText('No plan yet')).toBeVisible();

    // Verify Generate button is present
    await expect(
      page.getByRole('button', { name: /Generate this week's plan/i })
    ).toBeVisible();

    // Optional: Click Generate button if backend supports it with seeded data
    // Uncomment to test generation flow with real backend:
    // const generateBtn = page.getByRole('button', { name: /Generate this week's plan/i });
    // await generateBtn.click();
    // await page.waitForLoadState('networkidle');
  });
});
