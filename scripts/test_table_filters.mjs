import { chromium } from "file:///C:/Users/v.koptelov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs";

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const errors = [];
page.on("pageerror", error => errors.push(error.message));

await page.goto(
  "file:///C:/Users/v.koptelov/Documents/tenant-mix-dashboard/outputs/tenant-mix-online-dashboard.html",
  { waitUntil: "load" },
);
await page.locator("#brandTable").scrollIntoViewIfNeeded();

const filterButton = column => page.locator(`.filter-cell[data-column="${column}"] .excel-filter`);
const filterMenu = column => page.locator(`.filter-cell[data-column="${column}"] .filter-menu`);
const result = {};
result.initialHint = await page.locator("#tableHint").innerText();
result.initialRows = await page.locator("#brandTable tr").count();
result.initialWidths = await page.locator("#brandTable").evaluate(node =>
  [...node.closest("table").querySelectorAll("thead th")].map(cell => Math.round(cell.getBoundingClientRect().width)),
);

await filterButton("brand").click();
result.brandOptions = await filterMenu("brand").locator(".filter-option").count();
result.brandMenuVisible = await filterMenu("brand").isVisible();
if (!result.brandOptions) {
  result.brandMenuHtml = await filterMenu("brand").innerHTML();
  result.pageErrors = errors;
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  process.exit(1);
}

await filterMenu("brand").locator('[data-filter-clear-all="brand"]').click();
result.menuAfterClear = await filterMenu("brand").isVisible();
result.rowsAfterClear = await page.locator("#brandTable tr").count();
result.emptyText = await page.locator("#brandTable").innerText();

await filterMenu("brand").locator('[data-filter-select-all="brand"]').click();
result.menuAfterSelectAll = await filterMenu("brand").isVisible();
result.rowsAfterSelectAll = await page.locator("#brandTable tr").count();

await filterButton("brand").click();
await filterButton("status").click();
const statusMenu = filterMenu("status");
await statusMenu.locator('[data-filter-clear-all="status"]').click();
await statusMenu.locator('input[type="checkbox"]').first().check();
result.statusFilteredHint = await page.locator("#tableHint").innerText();
result.resetVisible = await page.locator("#resetTableFilters").isVisible();
result.widthsAfterFilter = await page.locator("#brandTable").evaluate(node =>
  [...node.closest("table").querySelectorAll("thead th")].map(cell => Math.round(cell.getBoundingClientRect().width)),
);

await filterButton("status").click();
await filterButton("category").click();
result.contextualCategoryOptions = await filterMenu("category").locator(".filter-option").count();
await filterMenu("category").locator('[data-filter-sort="category"][data-sort-direction="desc"]').click();
result.sortHint = await page.locator("#tableHint").innerText();

await filterButton("category").click();
await page.locator("#resetTableFilters").click();
result.resetHint = await page.locator("#tableHint").innerText();
result.resetRows = await page.locator("#brandTable tr").count();
result.resetHidden = await page.locator("#resetTableFilters").isHidden();
result.pageErrors = errors;

console.log(JSON.stringify(result, null, 2));
await browser.close();
