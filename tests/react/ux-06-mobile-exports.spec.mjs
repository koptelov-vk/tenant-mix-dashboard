import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';

const exportProjects = new Set(['mobile-chromium-390', 'mobile-webkit-390']);
const expectedHeader = ['Объект', 'Город', 'Бренд', 'Нормализованный бренд', 'Категория', 'Тип источника', 'Качество источника', 'Дата проверки', 'Источник'];
const normalizeDate = (value) => {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`;
};
const normalizeRows = (rows) => rows.slice(1).filter((row) => row.some((value) => String(value ?? '').length)).map((row) => expectedHeader.map((_, index) => index === 7 ? normalizeDate(row[index]) : String(row[index] ?? '')));

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
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('tenant CSV and XLSX use current context, object terminology and unchanged names', async ({ page }, testInfo) => {
  test.skip(!exportProjects.has(testInfo.project.name));
  await page.goto('?focus=Фантастика&tab=overview');
  await page.getByRole('button', { name: 'Экспорт текущего среза' }).click();
  const csvDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать текущий срез в CSV' }).click();
  const csv = await csvDownload;
  expect(csv.suggestedFilename()).toBe('tenant-mix-slice.csv');
  const csvText = (await readFile(await csv.path(), 'utf8')).replace(/^\uFEFF/, '');
  const csvBook = XLSX.read(csvText, { type: 'string', FS: ';' });
  const csvRows = XLSX.utils.sheet_to_json(csvBook.Sheets[csvBook.SheetNames[0]], { header: 1, raw: false });
  expect(csvRows[0]).toEqual(expectedHeader);
  expect(csvRows.some((row) => row[0] === 'Фантастика')).toBe(true);
  expect(csvRows[0]).not.toContain('ТЦ');
  await page.getByRole('button', { name: 'Экспорт текущего среза' }).click();
  const xlsxDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать текущий срез в XLSX' }).click();
  const xlsx = await xlsxDownload;
  expect(xlsx.suggestedFilename()).toBe('tenant-mix-slice.xlsx');
  const book = XLSX.read(await readFile(await xlsx.path()));
  const xlsxRows = XLSX.utils.sheet_to_json(book.Sheets.Арендаторы, { header: 1, raw: false });
  expect(xlsxRows[0]).toEqual(expectedHeader);
  expect(xlsxRows.some((row) => row[0] === 'Фантастика')).toBe(true);
  expect(xlsxRows[0]).not.toContain('ТЦ');
  expect(normalizeRows(xlsxRows)).toEqual(normalizeRows(csvRows));
});

test('mobile PDF action and PDF-only terminology are correct', async ({ page }, testInfo) => {
  test.skip(!exportProjects.has(testInfo.project.name));
  await page.goto('?focus=Фантастика&tab=overview');
  await expect(page.locator('.pdf-only-heading')).toContainText('Фокусный объект: Фантастика');
  await expect(page.locator('.pdf-only-heading')).not.toContainText('Фокусный ТЦ');
  await page.getByRole('button', { name: 'Экспорт текущего среза' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать текущий анализ в PDF' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('tenant-mix-фантастика-2026-07-16.pdf');
  const file = await readFile(await download.path());
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
