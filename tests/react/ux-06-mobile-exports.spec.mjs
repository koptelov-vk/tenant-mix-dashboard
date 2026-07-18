import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';

test('mobile export actions are visible, accessible, touch-safe and do not overflow', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'));
  await page.goto('?focus=Фантастика&tab=overview');
  const trigger = page.getByRole('button', { name: 'Экспорт текущего среза' });
  await expect(trigger).toBeVisible();
  const triggerBox = await trigger.boundingBox();
  expect(triggerBox.width).toBeGreaterThanOrEqual(44);
  expect(triggerBox.height).toBeGreaterThanOrEqual(44);
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Экспорт текущего среза' });
  await expect(dialog).toBeVisible();
  for (const name of ['Скачать текущий анализ в PDF', 'Скачать текущий срез в CSV', 'Скачать текущий срез в XLSX']) {
    const action = dialog.getByRole('button', { name });
    await expect(action).toBeVisible();
    const box = await action.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  const geometry = await dialog.boundingBox();
  const viewport = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(geometry.x).toBeGreaterThanOrEqual(0);
  expect(geometry.x + geometry.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width);
});

test('tenant CSV and XLSX export current context with object terminology and unchanged object names', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium-390');
  await page.goto('?focus=Фантастика&tab=overview');
  await page.getByRole('button', { name: 'Экспорт текущего среза' }).click();
  const csvDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать текущий срез в CSV' }).click();
  const csv = await csvDownload;
  expect(csv.suggestedFilename()).toBe('tenant-mix-slice.csv');
  const csvPath = await csv.path();
  const csvText = await readFile(csvPath, 'utf8');
  expect(csvText.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0]).toBe('Объект;Город;Бренд;Нормализованный бренд;Категория;Тип источника;Качество источника;Дата проверки;Источник');
  expect(csvText).toContain('Фантастика');

  await page.getByRole('button', { name: 'Экспорт текущего среза' }).click();
  const xlsxDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать текущий срез в XLSX' }).click();
  const xlsx = await xlsxDownload;
  expect(xlsx.suggestedFilename()).toBe('tenant-mix-slice.xlsx');
  const xlsxPath = await xlsx.path();
  const book = XLSX.read(await readFile(xlsxPath));
  const sheet = book.Sheets.Арендаторы;
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  expect(rows[0][0]).toBe('Объект');
  expect(rows.some((row) => row[0] === 'Фантастика')).toBe(true);
});

test('mobile PDF action downloads a valid document and PDF-only text uses object terminology', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium-390');
  await page.goto('?focus=Фантастика&tab=overview');
  await expect(page.locator('.pdf-only-heading')).toContainText('Фокусный объект: Фантастика');
  await expect(page.locator('.pdf-only-heading')).not.toContainText('Фокусный ТЦ');
  await page.getByRole('button', { name: 'Экспорт текущего среза' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать текущий анализ в PDF' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('tenant-mix-фантастика-2026-07-16.pdf');
  const path = await download.path();
  const file = await readFile(path);
  expect(file.subarray(0, 5).toString()).toBe('%PDF-');
  expect(file.length).toBeGreaterThan(20_000);
});

test('MallSheet terminology and desktop breadcrumbs remain correct', async ({ page }, testInfo) => {
  await page.goto('?focus=Фантастика&tab=comparability');
  if (testInfo.project.name === 'desktop' || testInfo.project.name === 'desktop-webkit') {
    await expect(page.locator('.breadcrumbs')).toContainText('объект');
    await expect(page.locator('.breadcrumbs')).toContainText('Фантастика');
  }
  const opener = page.locator('.table-link:visible, .mall-card-title:visible').filter({ hasNotText: 'Фантастика' }).first();
  await opener.click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByText('Карточка объекта', { exact: true })).toBeVisible();
  await expect(sheet.getByText('Жаккар с фокусным объектом', { exact: true })).toBeVisible();
});
