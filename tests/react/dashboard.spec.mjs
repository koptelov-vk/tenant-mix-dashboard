import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

test('loads production data without JavaScript errors and defaults to Fantastika', async ({ page }) => {
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('');
  await expect(page.locator('select').first()).toHaveValue('Фантастика');
  await expect(page.locator('.kpi')).toHaveCount(5);
  expect(errors).toEqual([]);
});

test('focus and tab survive URL and reload', async ({ page }) => {
  await page.goto('');
  await page.locator('select').first().selectOption('Небо');
  await expect.poll(() => new URL(page.url()).searchParams.get('focus')).toBe('Небо');
  await page.getByRole('button', { name: 'Категории' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('tab')).toBe('categories');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Категории' })).toBeVisible();
  await expect(page.locator('select').first()).toHaveValue('Небо');
});

test('Back and Forward restore the shared analysis state', async ({ page }) => {
  await page.goto('');
  await page.locator('select').first().selectOption('Небо');
  await expect.poll(() => new URL(page.url()).searchParams.get('focus')).toBe('Небо');
  await page.getByRole('button', { name: 'Категории' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('tab')).toBe('categories');

  await page.goBack();
  await expect(page.locator('select').first()).toHaveValue('Небо');
  await expect(page.getByRole('button', { name: 'Обзор' })).toHaveAttribute('aria-current', 'page');

  await page.goForward();
  await expect(page.locator('select').first()).toHaveValue('Небо');
  await expect(page.getByRole('button', { name: 'Категории' })).toHaveAttribute('aria-current', 'page');
});

test('category filter updates the same KPI slice', async ({ page }) => {
  await page.goto('');
  const before = await page.locator('.kpi strong').first().innerText();
  await page.locator('.filter-bar label').filter({ hasText: 'Категория' }).locator('select').selectOption('Обувь');
  await expect(page.locator('.kpi strong').first()).not.toHaveText(before);
});

test('all sections open', async ({ page }) => {
  await page.goto('');
  for (const [button, heading] of [['Сопоставимость', 'Сопоставимость ТЦ'], ['Категории', 'Категории'], ['Бренды', 'Бренды'], ['Скоро открытие', 'Скоро открытие'], ['Качество данных', 'Качество данных'], ['Динамика', 'Историческая динамика пока недоступна']]) {
    if (button === 'Качество данных' || button === 'Динамика') await page.getByRole('button', { name: 'Ещё' }).click();
    await page.getByRole('button', { name: button }).click(); await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
  }
});

test('CSV exports the current registry slice', async ({ page }) => {
  await page.goto('?tab=brands&category=Обувь');
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'CSV' }).click();
  expect((await download).suggestedFilename()).toBe('tenant-mix-slice.csv');
});

test('keyboard focus and accessibility smoke', async ({ page }) => {
  await page.goto(''); await expect(page.locator('.skip-link')).toBeAttached(); await page.locator('body').focus(); await page.keyboard.press('Tab'); await expect(page.locator('.skip-link')).toBeFocused();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.filter((item) => item.impact === 'critical')).toEqual([]);
});

test('page has no horizontal overflow on mobile', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'));
  await page.goto('');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('mall details open from comparability and close with Escape', async ({ page }) => {
  await page.goto('?tab=comparability');
  await page.locator('.table-link').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('heading', { level: 2 })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('legacy scenarios URL opens the overview', async ({ page }) => {
  await page.goto('?tab=scenarios');
  await expect(page.getByRole('button', { name: 'Обзор' })).toHaveAttribute('aria-current', 'page');
  await expect.poll(() => new URL(page.url()).searchParams.get('tab')).toBe('overview');
});

test('manual comparison selection is stored in URL and excludes focus', async ({ page }) => {
  await page.goto('');
  await page.getByRole('button', { name: /Объекты сравнения/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Выбор объектов' });
  await dialog.getByRole('button', { name: 'Снять все' }).click();
  await dialog.getByText('Небо', { exact: true }).click();
  await dialog.getByRole('button', { name: 'Применить' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('group')).toBe('custom');
  await expect.poll(() => new URL(page.url()).searchParams.get('malls')).toContain('Небо');
});

test('comparison table supports explicit sorting', async ({ page }) => {
  await page.goto('?tab=comparability');
  const header = page.getByRole('button', { name: /Бренды/ }).first();
  await header.click();
  await expect(header.locator('xpath=..')).toHaveAttribute('aria-sort', 'ascending');
  await header.click();
  await expect(header.locator('xpath=..')).toHaveAttribute('aria-sort', 'descending');
});

test('brand registry local filters do not change the global URL state', async ({ page }) => {
  await page.goto('?tab=brands');
  const before = page.url();
  await page.locator('.registry-filter').filter({ hasText: 'Категория' }).locator('summary').click();
  await page.locator('.registry-filter').filter({ hasText: 'Категория' }).getByText('Снять все').click();
  expect(page.url()).toBe(before);
});

test('saved view restores filters, focus and active section', async ({ page }) => {
  await page.goto('?focus=Небо&tab=categories&category=Обувь&metric=share');
  await page.getByRole('button', { name: 'Сохранённые представления' }).click();
  const dialog = page.getByRole('dialog', { name: 'Сохранённые представления' });
  await dialog.getByLabel('Название нового представления').fill('Контрольный срез');
  await dialog.getByRole('button', { name: 'Сохранить' }).click();
  await expect(dialog.getByRole('status')).toContainText('сохранён');
  await dialog.getByRole('button', { name: 'Закрыть' }).click();

  await page.locator('.filter-bar select').first().selectOption('Фантастика');
  await page.getByRole('button', { name: 'Обзор' }).click();
  await page.getByRole('button', { name: 'Сохранённые представления' }).click();
  await page.getByRole('dialog', { name: 'Сохранённые представления' }).getByRole('button', { name: 'Открыть' }).click();

  await expect(page.locator('.filter-bar select').first()).toHaveValue('Небо');
  await expect(page.getByRole('button', { name: 'Категории' })).toHaveAttribute('aria-current', 'page');
  await expect.poll(() => new URL(page.url()).searchParams.get('category')).toBe('Обувь');
  await expect.poll(() => new URL(page.url()).searchParams.get('metric')).toBe('share');
});

test('PDF export downloads a valid current-analysis document', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.goto('?focus=Фантастика&tab=overview');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Скачать текущий анализ в PDF' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('tenant-mix-фантастика-2026-07-16.pdf');
  const path = await download.path();
  expect(path).not.toBeNull();
  const file = await readFile(path);
  expect(file.subarray(0, 5).toString()).toBe('%PDF-');
  expect(file.length).toBeGreaterThan(20_000);
});
