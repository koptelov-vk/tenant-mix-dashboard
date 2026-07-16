import { chromium } from "file:///C:/Users/v.koptelov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs";

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", error => errors.push(error.message));
await page.goto(
  "file:///C:/Users/v.koptelov/Documents/tenant-mix-dashboard/outputs/tenant-mix-online-dashboard.html",
  { waitUntil: "load" },
);

const panel = page.locator(".table-panel");
await panel.scrollIntoViewIfNeeded();
await panel.locator('[data-column="brand"] .excel-filter').click();
const menuVisible = await panel.locator('[data-column="brand"] .filter-menu').evaluate(node => getComputedStyle(node).display !== "none");
await panel.locator('[data-column="brand"] .excel-filter').click();
await panel.screenshot({ path: "outputs/qa-brand-registry-mobile.png" });

const sourceLinks = await panel.locator("tbody .source-link").count();
const invalidLinks = await panel.locator("tbody .source-link").evaluateAll(nodes =>
  nodes.filter(node => !/^https?:\/\//i.test(node.href) || node.target !== "_blank").length,
);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
const firstRowDisplay = await panel.locator("tbody tr").first().evaluate(node => getComputedStyle(node).display);

console.log(JSON.stringify({ menuVisible, sourceLinks, invalidLinks, overflow, firstRowDisplay, pageErrors: errors }, null, 2));
await browser.close();
