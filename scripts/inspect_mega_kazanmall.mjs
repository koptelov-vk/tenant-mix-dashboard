import { chromium } from "file:///C:/Users/v.koptelov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs";

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});

for (const url of ["https://mega.ru/nn/?att=2", "https://kazanmall.com/shops/"]) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(12000);
  console.log(JSON.stringify({
    requested: url,
    finalUrl: page.url(),
    status: response?.status(),
    title: await page.title(),
    htmlBytes: (await page.content()).length,
    bodyText: (await page.locator("body").innerText()).slice(0, 4000),
    links: await page.locator("a").evaluateAll(nodes => nodes.slice(0, 1000).map(node => ({
      text: (node.textContent || "").trim().replace(/\s+/g, " "),
      href: node.href,
      cls: node.className,
    })).filter(item => item.text || item.href)),
    errors,
  }, null, 2));
  await page.close();
}

await browser.close();
