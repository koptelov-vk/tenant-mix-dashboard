import { defineConfig } from '@playwright/test';

const python = process.env.CI
  ? 'python'
  : '"C:/Users/v.koptelov/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe"';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.env.CI ? {} : {
      executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    },
  },
  webServer: {
    command: `${python} -m http.server 4173`,
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1366, height: 768 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true } },
  ],
});
