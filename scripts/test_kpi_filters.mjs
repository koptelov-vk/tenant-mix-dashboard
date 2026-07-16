import { chromium } from "file:///C:/Users/v.koptelov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs";

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
const errors = [];
page.on("pageerror", error => errors.push(error.message));
await page.goto(
  "file:///C:/Users/v.koptelov/Documents/tenant-mix-dashboard/outputs/tenant-mix-online-dashboard.html",
  { waitUntil: "load" },
);

const kpiValues = () => page.locator(".kpi .value").allTextContents();
const initial = await kpiValues();

const mallCard = page.locator('[data-kpi-filter="malls"]');
await mallCard.locator(".kpi-filter-button").click();
const mallOptions = await mallCard.locator("[data-kpi-filter-option]").count();
await mallCard.locator("[data-kpi-filter-option]").first().uncheck();
const afterMallFilter = await kpiValues();
const mallMenuAfterChange = await mallCard.locator(".kpi-filter-menu").evaluate(node => getComputedStyle(node).display !== "none");
await mallCard.locator("[data-kpi-select-all]").click();
const afterMallReset = await kpiValues();
const mallMenuAfterReset = await mallCard.locator(".kpi-filter-menu").evaluate(node => getComputedStyle(node).display !== "none");
await mallCard.locator(".kpi-filter-button").click();

const tenantCard = page.locator('[data-kpi-filter="tenants"]');
await tenantCard.locator(".kpi-filter-button").click();
const tenantOptions = await tenantCard.locator("[data-kpi-filter-option]").count();
await tenantCard.locator("[data-kpi-clear-all]").click();
const afterTenantClear = await kpiValues();
await tenantCard.locator("[data-kpi-filter-option]").first().check();
const afterOneTenant = await kpiValues();
const tenantMenuAfterChange = await tenantCard.locator(".kpi-filter-menu").evaluate(node => getComputedStyle(node).display !== "none");
await tenantCard.locator("[data-kpi-select-all]").click();
await tenantCard.locator(".kpi-filter-button").click();

const brandCard = page.locator('[data-kpi-filter="brands"]');
await brandCard.locator(".kpi-filter-button").click();
const brandOptions = await brandCard.locator("[data-kpi-filter-option]").count();
await brandCard.locator("[data-kpi-clear-all]").click();
await brandCard.locator("[data-kpi-filter-option]").first().check();
const afterOneBrand = await kpiValues();
await brandCard.locator("[data-kpi-select-all]").click();
const final = await kpiValues();

await page.locator(".kpis").screenshot({ path: "outputs/qa-kpi-filters-desktop.png" });

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
const mobileErrors = [];
mobile.on("pageerror", error => mobileErrors.push(error.message));
await mobile.goto(
  "file:///C:/Users/v.koptelov/Documents/tenant-mix-dashboard/outputs/tenant-mix-online-dashboard.html",
  { waitUntil: "load" },
);
const mobileCard = mobile.locator('[data-kpi-filter="malls"]');
await mobileCard.scrollIntoViewIfNeeded();
await mobileCard.locator(".kpi-filter-button").click();
const mobileMenuRect = await mobileCard.locator(".kpi-filter-menu").evaluate(node => {
  const rect = node.getBoundingClientRect();
  return { left: Math.round(rect.left), right: Math.round(rect.right), top: Math.round(rect.top), bottom: Math.round(rect.bottom) };
});
await mobile.screenshot({ path: "outputs/qa-kpi-filters-mobile.png" });
const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

const result = {
  initial,
  mallOptions,
  afterMallFilter,
  mallMenuAfterChange,
  afterMallReset,
  mallMenuAfterReset,
  tenantOptions,
  afterTenantClear,
  afterOneTenant,
  tenantMenuAfterChange,
  brandOptions,
  afterOneBrand,
  final,
  mobileMenuRect,
  mobileOverflow,
  pageErrors: [...errors, ...mobileErrors],
};
console.log(JSON.stringify(result, null, 2));

if (errors.length) throw new Error(`Page errors: ${errors.join(" | ")}`);
if (mobileErrors.length) throw new Error(`Mobile page errors: ${mobileErrors.join(" | ")}`);
if (mobileOverflow || mobileMenuRect.left < 0 || mobileMenuRect.right > 390) throw new Error("Mobile KPI filter menu overflows the viewport");
if (!mallMenuAfterChange || !mallMenuAfterReset || !tenantMenuAfterChange) throw new Error("A KPI filter menu closed unexpectedly");
if (Number(afterMallFilter[0].replace(/\D/g, "")) !== Number(initial[0].replace(/\D/g, "")) - 1) throw new Error("Mall KPI filter did not update the object count");
if (afterTenantClear[2] !== "0" || afterTenantClear[3] !== "0") throw new Error("Tenant clear-all did not produce an empty data slice");
if (afterOneBrand[3] !== "1") throw new Error("Brand KPI filter did not isolate one normalized brand");
if (final.join("|") !== initial.join("|")) throw new Error("KPI values did not restore after selecting all values");

await browser.close();
