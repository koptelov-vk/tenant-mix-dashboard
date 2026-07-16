import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/react',
  timeout: 40_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/react', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4174/tenant-mix-dashboard/',
    trace: 'retain-on-failure', screenshot: 'only-on-failure',
    launchOptions: process.env.CI ? {} : { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' },
  },
  webServer: { command: 'pnpm build && pnpm preview --host 127.0.0.1 --port 4174', port: 4174, reuseExistingServer: false, timeout: 120_000 },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1366, height: 768 } } },
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 }, isMobile: true } },
    { name: 'mobile-320', use: { viewport: { width: 320, height: 568 }, isMobile: true } },
  ],
});
