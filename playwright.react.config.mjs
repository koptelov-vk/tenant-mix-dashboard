import { defineConfig, devices } from '@playwright/test';

const mobileViewports = [
  { width: 320, height: 568 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
];

export default defineConfig({
  testDir: './tests/react',
  timeout: 40_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/react', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4174/tenant-mix-dashboard/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: { command: 'pnpm build && pnpm preview --host 127.0.0.1 --port 4174', port: 4174, reuseExistingServer: !process.env.CI, timeout: 120_000 },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
    { name: 'desktop-webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1366, height: 768 } } },
    ...mobileViewports.flatMap((viewport) => [
      { name: `mobile-chromium-${viewport.width}`, use: { browserName: 'chromium', viewport, isMobile: true, hasTouch: true } },
      { name: `mobile-webkit-${viewport.width}`, use: { browserName: 'webkit', viewport, isMobile: true, hasTouch: true } },
    ]),
  ],
});
