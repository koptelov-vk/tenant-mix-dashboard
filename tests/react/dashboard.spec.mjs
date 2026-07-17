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

test('overview gap threshold recalculates immediately and uses concise headings', async ({ page }) => {
  await page.goto('');
  const threshold = page.getByLabel('Минимум объектов для списка брендов');
  const resultCount = page.locator('.gap-result-count');
  await expect(threshold).toBeVisible();
  const maximum = await threshold.evaluate((element) => element.options.item(element.options.length - 1)?.value);
  expect(maximum).toBeTruthy();

  await threshold.selectOption('1');
  const broadCount = Number.parseInt((await resultCount.innerText()).replace(/\D/g, ''), 10);
  await threshold.selectOption(maximum);
  await expect.poll(() => new URL(page.url()).searchParams.get('gapN')).toBe(maximum);
  await expect.poll(async () => Number.parseInt((await resultCount.innerText()).replace(/\D/g, ''), 10)).toBeLessThanOrEqual(broadCount);

  await expect(page.getByText('Executive summary', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Gap-анализ', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Сходство брендов', { exact: true })).toHaveCount(0);
});

test('all sections open', async ({ page }) => {
  await page.goto('');
  for (const [button, heading] of [['Сопоставимость', 'Сопоставимость объектов'], ['Категории', 'Категории'], ['Бренды', 'Бренды'], ['Скоро открытие', 'Скоро открытие'], ['Качество данных', 'Качество данных'], ['Динамика', 'Историческая динамика пока недоступна']]) {
    const secondary = button === 'Качество данных' || button === 'Динамика';
    if (secondary) await page.getByRole('button', { name: 'Ещё', exact: true }).click();
    await page.getByRole(secondary ? 'menuitem' : 'button', { name: button }).click(); await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
  }
});

test('CSV exports the current registry slice', async ({ page }) => {
  await page.goto('?tab=brands&category=Обувь');
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'CSV' }).click();
  expect((await download).suggestedFilename()).toBe('brands-slice.csv');
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
  await page.getByRole('button', { name: /Выбрать объекты/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Выбор объектов' });
  await dialog.getByRole('button', { name: 'Снять все' }).click();
  await dialog.getByRole('checkbox', { name: /Небо/ }).check();
  await dialog.getByRole('button', { name: 'Применить' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('group')).toBe('custom');
  await expect.poll(() => new URL(page.url()).searchParams.get('malls')).toContain('Небо');
});

test('primary filters use the revised comparison terminology', async ({ page }) => {
  await page.goto('');
  await expect(page.getByLabel('Параметры анализа').getByText('Выбрать объекты', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Параметры анализа').getByRole('option', { name: 'Сопоставимые' })).toBeAttached();
  await expect(page.getByRole('button', { name: 'Расширенные фильтры' })).toHaveCount(0);
  await expect(page.locator('.focus-hero')).toHaveCount(0);
});

test('comparison table supports explicit sorting', async ({ page }) => {
  await page.goto('?tab=comparability');
  const header = page.locator('.comparison-table thead').getByRole('button', { name: 'Бренды', exact: true });
  const column = header.locator('xpath=../..');
  await header.click();
  await expect(column).toHaveAttribute('aria-sort', 'ascending');
  await header.click();
  await expect(column).toHaveAttribute('aria-sort', 'descending');
});

test('comparison table provides a filter in every column header', async ({ page }) => {
  await page.goto('?tab=comparability');
  await expect(page.locator('.comparison-table thead .registry-filter-header')).toHaveCount(9);
  const filter = page.getByLabel('Фильтр: Город');
  await filter.click();
  await page.getByRole('checkbox', { name: 'Казань' }).uncheck();
  await expect(page.locator('.comparison-table tbody')).not.toContainText('KazanMall');
});

test('brand registry column filters and sorting do not change global URL state', async ({ page }, testInfo) => {
  await page.goto('?tab=brands');
  await expect.poll(() => new URL(page.url()).searchParams.get('focus')).toBe('Фантастика');
  const before = new URL(page.url());
  await expect(page.locator('.registry-head .registry-filter-header')).toHaveCount(5);
  for (const [index, label] of ['Бренд', 'Характеристика', 'Категория', 'Объекты', 'Источник'].entries()) await expect(page.locator('.registry-head [role="columnheader"]').nth(index)).toContainText(label);
  const categoryFilter = testInfo.project.name === 'desktop' ? page.locator('.registry-head').getByLabel('Фильтр: Категория') : page.locator('.brand-mobile-controls').getByLabel('Фильтр: Категория');
  await categoryFilter.click();
  await page.getByRole('button', { name: 'Снять все' }).click();
  await expect(testInfo.project.name === 'desktop' ? page.locator('.registry-filter-header[open]') : page.locator('.brand-mobile-controls .registry-filter[open]')).toHaveCount(1);
  await expect(page.locator('.registry-row')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Категория: ничего/ })).toBeVisible();
  await page.getByRole('button', { name: 'Выбрать все' }).click();
  await page.getByRole('button', { name: 'Закрыть фильтр' }).click();
  if (testInfo.project.name === 'desktop') {
    const brandHeader = page.locator('.registry-head').getByRole('button', { name: 'Бренд', exact: true });
    await brandHeader.click();
    await expect(brandHeader.locator('xpath=../..')).toHaveAttribute('aria-sort', 'descending');
  } else {
    await page.locator('.brand-mobile-controls select').selectOption('brand');
    await page.locator('.brand-mobile-controls').getByRole('button', { name: 'По возрастанию' }).click();
    await expect(page.locator('.brand-mobile-controls').getByRole('button', { name: 'По убыванию' })).toBeVisible();
  }
  const after = new URL(page.url());
  expect(after.searchParams.toString()).toBe(before.searchParams.toString());
});

test('brand registry aggregates brands and opens the brand card', async ({ page }, testInfo) => {
  await page.goto('?tab=brands');
  await expect(page.locator('.brand-registry-row').first()).toBeVisible();
  const names = await page.locator('.brand-registry-row .brand-button').allTextContents();
  expect(new Set(names).size).toBe(names.length);
  await page.locator('.brand-registry-row .brand-button').first().click();
  await expect(page.locator('.sheet[role="dialog"]')).toBeVisible();
  if (testInfo.project.name !== 'desktop') await expect(page.locator('.brand-table .registry-head')).toBeHidden();
});

test('upcoming openings provide sortable filters in every column header', async ({ page }) => {
  await page.goto('?tab=upcoming');
  await expect(page.locator('.upcoming-table thead .registry-filter-header')).toHaveCount(8);
  const sortHeader = page.locator('.upcoming-table thead').getByRole('button', { name: 'Бренд', exact: true });
  await sortHeader.click();
  await expect(sortHeader.locator('xpath=../..')).toHaveAttribute('aria-sort', 'ascending');
  await page.getByLabel('Фильтр: Категория').click();
  await page.getByRole('button', { name: 'Снять все' }).click();
  await expect(page.locator('.upcoming-table tbody tr')).toHaveCount(0);
  await expect(page.locator('.registry-filter-header[open]')).toHaveCount(1);
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
