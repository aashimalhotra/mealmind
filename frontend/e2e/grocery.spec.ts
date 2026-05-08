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

    // Ensure checkbox is unchecked before test to avoid state leakage from previous tests
    if (await firstCheckbox.isChecked()) {
      await firstCheckbox.click();
      await expect(firstCheckbox).not.toBeChecked({ timeout: 5000 });
    }

    // Click to check
    await firstCheckbox.click();

    // Wait for API call to complete and UI to update
    await page.waitForLoadState('networkidle', { timeout: 5000 });
    // Verify it's checked with extended timeout
    await expect(firstCheckbox).toBeChecked({ timeout: 5000 });
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

  test('share button text is visible (light text on dark background)', async ({ page }) => {
    await page.goto('/grocery/e2e-plan-1');
    await page.waitForLoadState('networkidle');

    // Wait for share button to load
    const shareButton = page.locator('button', { hasText: 'Share list' });
    await expect(shareButton).toBeVisible({ timeout: 10000 });

    // Check button background color (dark-bg: #3D2E1F)
    const buttonBg = await shareButton.evaluate(el => window.getComputedStyle(el).backgroundColor);
    expect(buttonBg).toBe('rgb(61, 46, 31)'); // #3D2E1F in rgb

    // Check share button text color (should be white/dark-text)
    const shareText = shareButton.locator('span');
    const textColor = await shareText.evaluate(el => window.getComputedStyle(el).color);
    expect(textColor).toBe('rgb(255, 255, 255)'); // White
  });
});
