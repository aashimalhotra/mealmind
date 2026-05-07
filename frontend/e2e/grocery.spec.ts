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
    
    // Click on "Sun prep" filter
    await page.getByText('Sun prep').click();
    
    // Verify filter is active (has active styling - primary background)
    const sunPrepTab = page.getByText('Sun prep');
    await expect(sunPrepTab).toHaveClass(/bg-\[var\(--color-primary\)\]/);
  });
});
