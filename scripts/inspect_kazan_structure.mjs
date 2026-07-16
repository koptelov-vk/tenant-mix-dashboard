import { chromium } from "file:///C:/Users/v.koptelov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs";

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

for (const section of ["shops", "food-court", "entertainment", "services", "cinema"]) {
  await page.goto(`https://kazanmall.com/${section}/`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2500);
  const data = await page.evaluate(() => {
    const selectors = [".card-catalog", "[class*='catalog']", "[class*='entertain']", "[class*='service']"];
    const counts = Object.fromEntries(selectors.map(selector => [selector, document.querySelectorAll(selector).length]));
    const cards = [...document.querySelectorAll(".card-catalog")].slice(0, 5).map(card => ({
      text: card.innerText.trim().replace(/\s+/g, " "),
      html: card.outerHTML.slice(0, 5000),
    }));
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,[class*='title']")]
      .map(node => ({ cls: node.className, text: node.innerText?.trim().replace(/\s+/g, " ") }))
      .filter(item => item.text).slice(0, 100);
    return { counts, cards, headings };
  });
  console.log(`\n### ${section}`);
  console.log(JSON.stringify(data, null, 2));
}

await browser.close();
