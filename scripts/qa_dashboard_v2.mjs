import { chromium } from "file:///C:/Users/v.koptelov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs";
import fs from 'node:fs';

fs.mkdirSync('output/screenshots', { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const results = {};
for (const [name, viewport] of Object.entries({ desktop: { width: 1366, height: 768 }, mobile: { width: 390, height: 844 } })) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('file:///C:/Users/v.koptelov/Documents/tenant-mix-dashboard/.github-publish/index.html', { waitUntil: 'load' });
  await page.waitForSelector('.kpi-card');
  const focus = await page.locator('#focusSelect').inputValue();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  const overflowElements = await page.evaluate(() => [...document.querySelectorAll('body *')]
    .filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.right > document.documentElement.clientWidth + 1 || rect.left < -1;
    })
    .slice(0, 20)
    .map(el => ({ tag: el.tagName, className: el.className, right: Math.round(el.getBoundingClientRect().right), scrollWidth: el.scrollWidth })));
  const firstScreen = await page.locator('#tab-overview').screenshot({ path: `output/screenshots/dashboard-v2-${name}.png`, animations: 'disabled' });
  results[name] = {
    focus,
    kpis: await page.locator('.kpi-card').count(),
    summaryItems: await page.locator('.summary-list li').count(),
    overflow,
    overflowElements,
    errors,
    url: page.url(),
    screenshotBytes: firstScreen.length,
  };
  await page.close();
}
console.log(JSON.stringify(results, null, 2));
await browser.close();
if (Object.values(results).some(result => result.focus !== 'Фантастика' || result.kpis !== 6 || result.overflow || result.errors.length)) process.exit(1);
