import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e-screenshots',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:8401',
    viewport: { width: 360, height: 800 },
    screenshot: 'only-on-failure',
    screenshotPath: './e2e-screenshots',
  },
  projects: [
    {
      name: 'Mobile Chrome',
      use: {
        browserName: 'chromium',
      },
    },
  ],
});
