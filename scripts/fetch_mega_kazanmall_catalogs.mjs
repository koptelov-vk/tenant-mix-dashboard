import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "file:///C:/Users/v.koptelov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(root, "data", "raw", "mega_kazanmall_official_catalogs.json");

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

async function open(url, delayMs) {
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  if (!response?.ok()) throw new Error(`HTTP ${response?.status()} for ${url}`);
  await page.waitForTimeout(delayMs);
}

async function megaSection(section, url) {
  await open(url, 9000);
  return page.locator(".card-shop").evaluateAll((cards, meta) => cards.map(card => {
    const title = card.querySelector(".card-shop__heading-link:not([href])")?.textContent
      || card.querySelector(".card-shop__heading .card-shop__heading-link")?.textContent
      || "";
    const link = card.querySelector("a.card-shop__heading-link[href]")?.href || meta.url;
    const categories = [...card.querySelectorAll(".card-shop__category")]
      .map(node => node.textContent.trim().replace(/\s+/g, " "))
      .filter(Boolean);
    return {
      brand: title.trim().replace(/\s+/g, " "),
      categories,
      section: meta.section,
      sourceUrl: link,
      paid: Boolean(card.querySelector(".commercial-label--price")),
    };
  }).filter(item => item.brand), { section, url: page.url() });
}

async function kazanSection(section, url) {
  await open(url, 2500);
  return page.locator(".card-catalog").evaluateAll((cards, meta) => cards.map(card => {
    const title = card.querySelector(".card-catalog__title")?.textContent || card.dataset.defaultSort || "";
    const popup = card.querySelector(".card-catalog__title")?.getAttribute("data-mfp-src") || "";
    const href = card.querySelector(".card-catalog__title[href]")?.href;
    const categories = [...card.querySelectorAll(".card-catalog__filter")]
      .map(node => node.textContent.trim().replace(/\s+/g, " "))
      .filter(Boolean);
    return {
      brand: title.trim().replace(/\s+/g, " "),
      categories,
      section: meta.section,
      sourceUrl: href || `${meta.url}${popup}`,
      paid: true,
    };
  }).filter(item => item.brand), { section, url: page.url() });
}

const mega = [];
mega.push(...await megaSection("shops", "https://mega.ru/shops/nn/"));
mega.push(...await megaSection("food", "https://mega.ru/food/nn/"));
mega.push(...await megaSection("entertainment", "https://mega.ru/entertainment/nn/"));
mega.push(...await megaSection("paid-services", "https://mega.ru/hospitality/nn/?paid=on&type=all"));

const kazan = [];
kazan.push(...await kazanSection("shops", "https://kazanmall.com/shops/"));
kazan.push(...await kazanSection("food", "https://kazanmall.com/food-court/"));
kazan.push(...await kazanSection("entertainment", "https://kazanmall.com/entertainment/"));
kazan.push(...await kazanSection("services", "https://kazanmall.com/services/"));

const payload = {
  checkedAt: new Date().toISOString(),
  source: "official websites",
  malls: [
    {
      mall: "МЕГА Нижний Новгород",
      city: "НН",
      officialUrl: "https://mega.ru/nn/",
      catalogCounts: {
        shops: mega.filter(item => item.section === "shops").length,
        food: mega.filter(item => item.section === "food").length,
        entertainment: mega.filter(item => item.section === "entertainment").length,
        paidServices: mega.filter(item => item.section === "paid-services").length,
      },
      items: mega,
    },
    {
      mall: "KazanMall",
      city: "Казань",
      officialUrl: "https://kazanmall.com/",
      catalogCounts: {
        shops: kazan.filter(item => item.section === "shops").length,
        food: kazan.filter(item => item.section === "food").length,
        entertainment: kazan.filter(item => item.section === "entertainment").length,
        services: kazan.filter(item => item.section === "services").length,
      },
      items: kazan,
    },
  ],
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf8");
console.log(outputPath);
console.log(JSON.stringify(payload.malls.map(mall => ({ mall: mall.mall, ...mall.catalogCounts }))));
await browser.close();
