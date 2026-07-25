import { defineConfig, devices } from '@playwright/test';

// Temporary diagnostic-only config for Issue #162 event-chain instrumentation.
// Not referenced by any package.json script or ordinary CI workflow — only the
// dedicated .github/workflows/issue-162-ci-baseline.yml invokes it directly.
// Mirrors playwright.react.config.mjs's desktop/mobile-webkit-320 device settings
// exactly, but points at a separate testDir and forces trace/screenshot 'on' for
// every run (pass or fail) so symmetric evidence can be collected.

export default defineConfig({
  testDir: './tests/diagnostics/issue-162',
  timeout: 40_000,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'issue162-diagnostic-report.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:4174/tenant-mix-dashboard/',
    trace: 'on',
    screenshot: 'on',
  },
  webServer: { command: 'pnpm build && pnpm preview --host 127.0.0.1 --port 4174', port: 4174, reuseExistingServer: !process.env.CI, timeout: 120_000 },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
    { name: 'mobile-webkit-320', use: { browserName: 'webkit', viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true } },
  ],
});
