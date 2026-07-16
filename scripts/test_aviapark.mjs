import { chromium } from "file:///C:/Users/v.koptelov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs";

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", error => errors.push(error.message));

await page.goto(
  "file:///C:/Users/v.koptelov/Documents/tenant-mix-dashboard/outputs/tenant-mix-online-dashboard.html",
  { waitUntil: "load" },
);

await page.locator('[data-geo-filter="nn"]').uncheck();
await page.locator('[data-geo-filter="all_regions"]').uncheck();
await page.locator('[data-geo-filter="moscow"]').check();

const cards = await page.locator(".mall-card").evaluateAll(nodes =>
  nodes.map(node => ({
    title: node.querySelector(".mall-card-title")?.textContent?.trim(),
    badge: node.querySelector(".mall-badge")?.textContent?.trim(),
    value: node.querySelector(".mall-card-value")?.textContent?.trim(),
    area: node.querySelector(".mall-card-area")?.textContent?.trim(),
  })),
);
const aviapark = cards.find(card => card.title === "Авиапарк Москва");
const sourceLinks = await page.locator('tbody tr:has-text("Авиапарк") .source-link').count();
const result = {
  aviapark,
  selectedObjects: await page.locator("#kpiMalls").innerText(),
  sourceLinks,
  pageErrors: errors,
};
console.log(JSON.stringify(result, null, 2));

const normalizedArea = aviapark?.area?.replaceAll("\u00a0", " ") || "";
if (!aviapark || aviapark.badge !== "АВП" || aviapark.value !== "608" || !normalizedArea.includes("GBA 390 000 м²") || errors.length) {
  await browser.close();
  process.exit(1);
}

await browser.close();
