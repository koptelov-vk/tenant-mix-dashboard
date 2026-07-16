import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const url = process.env.DASHBOARD_URL ?? 'http://127.0.0.1:4173/tenant-mix-dashboard/';
const output = 'artifacts/react';
const viewports = [
  ['1440x900', 1440, 900], ['1366x768', 1366, 768], ['768x1024', 768, 1024], ['390x844', 390, 844], ['320x568', 320, 568],
];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
for (const [name, width, height] of viewports) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${output}/dashboard-react-${name}.png`, fullPage: true });
  await page.close();
}
await browser.close();
