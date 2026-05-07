import { test } from '@playwright/test';

test('debug temp: capture page content', async ({ page }) => {
  // Go to baseURL + '/', wait 5s, print full page content
  await page.goto('/');
  await page.waitForTimeout(5000);
  const pageContent = await page.content();
  console.log('=== CAPTURED PAGE CONTENT ===');
  console.log(pageContent);
  console.log('=== END CONTENT ===');
});
