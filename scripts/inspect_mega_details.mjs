import { chromium } from "file:///C:/Users/v.koptelov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs";

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
for (const id of ["8048", "70774", "69570", "70773"]) {
  await page.goto(`https://mega.ru/shops/${id}/nn/`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(5000);
  const main = await page.locator("main, .page-content, body").first().innerText();
  console.log(`\n### ${id}\n${main.replace(/\n{3,}/g, "\n\n").slice(0, 3500)}`);
}
await browser.close();
