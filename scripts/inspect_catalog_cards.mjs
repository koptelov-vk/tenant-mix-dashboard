import { chromium } from "file:///C:/Users/v.koptelov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs";

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

const targets = [
  ["mega-shops", "https://mega.ru/shops/nn/"],
  ["mega-food", "https://mega.ru/food/nn/"],
  ["mega-entertainment", "https://mega.ru/entertainment/nn/"],
  ["mega-paid-services", "https://mega.ru/hospitality/nn/?paid=on&type=all"],
  ["kazan-shops", "https://kazanmall.com/shops/"],
  ["kazan-food", "https://kazanmall.com/food-court/"],
  ["kazan-entertainment", "https://kazanmall.com/entertainment/"],
  ["kazan-services", "https://kazanmall.com/services/"],
  ["kazan-cinema", "https://kazanmall.com/cinema/"],
];

for (const [name, url] of targets) {
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(name.startsWith("mega") ? 9000 : 3000);
  const cards = await page.locator("a").evaluateAll((nodes, targetName) => nodes.map(node => {
    const href = node.href || "";
    const isMega = targetName.startsWith("mega");
    const isDetail = isMega
      ? /mega\.ru\/(shops|food|entertainment|hospitality)\/[^/?#]+\/nn\//.test(href)
      : /kazanmall\.com\/(shops|food-court|entertainment|services)\/[^/?#]+\/?/.test(href);
    if (!isDetail) return null;
    const parent = node.closest("article, li, [class*='card'], [class*='item']") || node.parentElement;
    const img = node.querySelector("img") || parent?.querySelector("img");
    return {
      text: (node.textContent || "").trim().replace(/\s+/g, " "),
      href,
      cls: typeof node.className === "string" ? node.className : "",
      parentClass: typeof parent?.className === "string" ? parent.className : "",
      parentText: (parent?.textContent || "").trim().replace(/\s+/g, " ").slice(0, 500),
      imageAlt: img?.alt || "",
      imageTitle: img?.title || "",
    };
  }).filter(Boolean), name);
  console.log(`\n### ${name} ${response?.status()} ${page.url()} ${await page.title()} (${cards.length})`);
  console.log(JSON.stringify(cards.slice(0, 40), null, 2));
}

await browser.close();
