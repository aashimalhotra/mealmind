import { test } from '@playwright/test';

test('debug', async ({page}) => { await page.goto('/'); await page.waitForTimeout(3000); const content = await page.content(); console.log('PAGE:', content.substring(0,2000)); await page.screenshot({path:'/tmp/debug.png'}); });
