import { chromium } from "file:///C:/Users/v.koptelov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs";

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

for (const [section, url] of [
  ["shops", "https://mega.ru/shops/nn/"],
  ["food", "https://mega.ru/food/nn/"],
  ["entertainment", "https://mega.ru/entertainment/nn/"],
  ["paid-services", "https://mega.ru/hospitality/nn/?paid=on&type=all"],
]) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(9000);
  const data = await page.evaluate(() => {
    const selectors = [".card-shop", ".list-item", ".card-shop__heading-link", ".list-item--title"];
    const counts = Object.fromEntries(selectors.map(selector => [selector, document.querySelectorAll(selector).length]));
    const cards = [...document.querySelectorAll(".card-shop, .list-item")].slice(0, 6).map(card => ({
      cls: card.className,
      text: card.innerText.trim().replace(/\s+/g, " "),
      html: card.outerHTML.slice(0, 5000),
    }));
    const titles = [...document.querySelectorAll("a.list-item--title")].map(a => ({ text: a.innerText.trim(), href: a.href }));
    return { counts, cards, titles };
  });
  console.log(`\n### ${section} ${page.url()}`);
  console.log(JSON.stringify(data, null, 2));
}

await browser.close();
