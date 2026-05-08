import { test, expect } from '@playwright/test';

test.describe('Grocery List Visual Baseline', () => {
  test('grocery list matches baseline', async ({ page }) => {
    // This test requires a seeded plan with grocery list
    // For now, we'll navigate to a fixture or mock the API
    
    await page.goto('/grocery/e2e-plan-1');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Take screenshot for visual regression
    await expect(page).toHaveScreenshot('grocery-list.png', { 
      maxDiffPixelRatio: 0.02 
    });
  });

  // Requires seeded plan with grocery list in E2E environment
  test('grocery list items can be checked', async ({ page }) => {
    await page.goto('/grocery/e2e-plan-1');
    await page.waitForLoadState('networkidle');

    // Wait for grocery items to load
    await page.waitForSelector('[data-testid="grocery-checkbox"]', { timeout: 10000 });

    // Find first grocery item checkbox
    const firstCheckbox = page.locator('[data-testid="grocery-checkbox"]').first();

    // Click to check
    await firstCheckbox.click();

    // Verify it's checked (should have line-through style)
    await expect(firstCheckbox).toBeChecked();
  });

  // Requires seeded plan with grocery list in E2E environment
  test('filter tabs work correctly', async ({ page }) => {
    await page.goto('/grocery/e2e-plan-1');
    await page.waitForLoadState('networkidle');

    // Wait for filter tabs to load
    await page.waitForSelector('[data-testid="filter-tab"]', { timeout: 10000 });

    // Click on "Sun prep" filter tab (using data-testid for specificity)
    const sunPrepTab = page.locator('[data-testid="filter-tab"]').filter({ hasText: 'Sun prep' }).first();
    await sunPrepTab.click();

    // Verify filter is active - check for active styling
    await expect(sunPrepTab).toHaveAttribute('data-active', 'true');
  });
});
