import { chromium } from "file:///C:/Users/v.koptelov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs";

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1800, height: 1200 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", error => errors.push(error.message));

await page.goto(
  "file:///C:/Users/v.koptelov/Documents/tenant-mix-dashboard/outputs/tenant-mix-online-dashboard.html",
  { waitUntil: "load" },
);
await page.locator("section.grid").screenshot({
  path: "outputs/qa-scale-lanes-desktop.png",
});

const metrics = await page.locator(".scale-row").first().evaluate(node => {
  const row = node.getBoundingClientRect();
  const legend = node.querySelector(".scale-legend").getBoundingClientRect();
  return {
    rowHeight: Math.round(row.height),
    legendHeight: Math.round(legend.height),
    background: getComputedStyle(node).backgroundColor,
  };
});
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const mobileErrors = [];
mobile.on("pageerror", error => mobileErrors.push(error.message));
await mobile.goto(
  "file:///C:/Users/v.koptelov/Documents/tenant-mix-dashboard/outputs/tenant-mix-online-dashboard.html",
  { waitUntil: "load" },
);
await mobile.locator("section.grid > .section").first().screenshot({
  path: "outputs/qa-scale-lanes-mobile.png",
});
const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

console.log(JSON.stringify({ metrics, mobileOverflow, pageErrors: [...errors, ...mobileErrors] }, null, 2));
await browser.close();
