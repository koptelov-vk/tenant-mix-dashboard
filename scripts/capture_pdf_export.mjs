import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const url =
  process.env.DASHBOARD_URL ??
  "http://127.0.0.1:4173/tenant-mix-dashboard/";
const output =
  process.env.PDF_OUTPUT ??
  "artifacts/react/tenant-mix-overview-export.pdf";
const executablePath =
  process.env.CHROME_PATH ??
  "C:/Program Files/Google/Chrome/Application/chrome.exe";

await mkdir("artifacts/react", { recursive: true });

const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

await page.goto(url, { waitUntil: "networkidle" });

const downloadPromise = page.waitForEvent("download");
await page
  .getByRole("button", { name: "Скачать текущий анализ в PDF" })
  .click();

const download = await downloadPromise;
await download.saveAs(output);
await browser.close();

console.log(output);
