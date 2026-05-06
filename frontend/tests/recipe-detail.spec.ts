import { test } from '@playwright/test';

test('recipe detail screenshot', async ({ page }) => {
  // Navigate to the seeded recipe page (using port 3000 as specified in task)
  await page.goto('http://localhost:3000/recipe/recipe-1');
  
  // Wait for ingredient list to load using the data-testid we added
  await page.waitForSelector('[data-testid="ingredient-list"]', { timeout: 10000 });
  
  // Take baseline screenshot
  await page.screenshot({ 
    path: '/Users/aashimalhotra/Desktop/mealmind/mealmind/frontend/tests/screenshots/recipe-detail-baseline.png', 
    fullPage: true 
  });
});
