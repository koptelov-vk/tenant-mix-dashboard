import { chromium } from "file:///C:/Users/v.koptelov/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs";

const user = process.env.BEGET_USER;
const password = process.env.BEGET_PASS;
if (!user || !password) throw new Error("Beget credentials are not available");

const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", error => errors.push(error.message));
await page.goto("https://cp.beget.com/", { waitUntil: "domcontentloaded", timeout: 60000 });

const before = {
  url: page.url(),
  title: await page.title(),
  inputs: await page.locator("input").evaluateAll(nodes => nodes.map(node => ({
    type: node.type,
    name: node.name,
    placeholder: node.placeholder,
  }))),
  buttons: await page.locator("button").allTextContents(),
};

const login = page.locator('input[type="text"], input[name*="login" i], input[autocomplete="username"]').first();
const pass = page.locator('input[type="password"]').first();
if (await login.count() && await pass.count()) {
  await login.fill(user);
  await pass.fill(password);
  const submit = page.locator('button[type="submit"], input[type="submit"]').first();
  if (await submit.count()) await submit.click();
  else await pass.press("Enter");
  await page.waitForTimeout(5000);
}

const bodyText = (await page.locator("body").innerText()).replace(/\s+/g, " ").trim();
await page.screenshot({ path: "outputs/beget-control-panel-status.png", fullPage: false });
console.log(JSON.stringify({
  before,
  after: {
    url: page.url(),
    title: await page.title(),
    text: bodyText.slice(0, 1200),
  },
  pageErrors: errors,
}, null, 2));

await browser.close();
