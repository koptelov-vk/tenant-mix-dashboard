import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

const navButton = (page, name) => page.locator('.app-header').getByRole('button', { name, exact: true });

async function chooseFocus(page, mallLabel) {
  await page.getByRole('button', { name: /Фокусный объект/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Выбор: Фокусный объект' });
  await dialog.getByRole('option', { name: new RegExp(`^${mallLabel}(?: ·|$)`) }).click();
}

async function chooseCategory(page, category) {
  await page.getByRole('button', { name: /Категории/ }).filter({ has: page.locator('.filter-label') }).click().catch(async () => {
    await page.locator('.searchable-filter').filter({ hasText: 'Категории' }).getByRole('button').first().click();
  });
  const dialog = page.getByRole('dialog', { name: 'Выбор: Категории' });
  await dialog.getByRole('option', { name: category, exact: true }).click();
  await dialog.getByRole('button', { name: 'Готово' }).click();
}

test('loads production data without JavaScript errors and defaults to Fantastika', async ({ page }) => {
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('');
  await expect(page.locator('.searchable-filter').filter({ hasText: 'Фокусный объект' }).getByRole('button')).toContainText('Фантастика');
  await expect(page.locator('.kpi')).toHaveCount(5);
  expect(errors).toEqual([]);
});

test('focus and tab survive URL and reload', async ({ page }) => {
  await page.goto('');
  await chooseFocus(page, 'Небо');
  await expect.poll(() => new URL(page.url()).searchParams.get('focus')).toBe('Небо');
  await navButton(page, 'Категории').click();
  await expect.poll(() => new URL(page.url()).searchParams.get('tab')).toBe('categories');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Категории' })).toBeVisible();
  await expect(page.locator('.searchable-filter').filter({ hasText: 'Фокусный объект' }).getByRole('button')).toContainText('Небо');
});

test('Back and Forward restore the shared analysis state', async ({ page }) => {
  await page.goto('');
  await chooseFocus(page, 'Небо');
  await navButton(page, 'Категории').click();
  await page.goBack();
  await expect(page.locator('.searchable-filter').filter({ hasText: 'Фокусный объект' }).getByRole('button')).toContainText('Небо');
  await expect(navButton(page, 'Сравнение')).toHaveAttribute('aria-current', 'page');
  await page.goForward();
  await expect(navButton(page, 'Категории')).toHaveAttribute('aria-current', 'page');
});

test('category filter updates the same KPI slice', async ({ page }) => {
  await page.goto('');
  const before = await page.locator('.kpi strong').first().innerText();
  await page.locator('.searchable-filter').filter({ hasText: 'Категории' }).getByRole('button').first().click();
  const dialog = page.getByRole('dialog', { name: 'Выбор: Категории' });
  await dialog.getByRole('option', { name: 'Обувь', exact: true }).click();
  await dialog.getByRole('button', { name: 'Готово' }).click();
  await expect(page.locator('.kpi strong').first()).not.toHaveText(before);
  await expect.poll(() => new URL(page.url()).searchParams.get('categories')).toBe('Обувь');
});

test('overview gap threshold recalculates immediately and uses concise headings', async ({ page }) => {
  await page.goto('');
  const threshold = page.getByLabel('Кол-во объектов присутствия бренда');
  const resultCount = page.locator('.gap-result-count');
  await expect(threshold).toBeVisible();
  await expect(page.getByText('Минимум объектов', { exact: true })).toHaveCount(0);
  const maximum = await threshold.evaluate((element) => element.options.item(element.options.length - 1)?.value);
  expect(maximum).toBeTruthy();
  await threshold.selectOption('1');
  const broadCount = Number.parseInt((await resultCount.innerText()).replace(/\D/g, ''), 10);
  await threshold.selectOption(maximum);
  await expect.poll(async () => Number.parseInt((await resultCount.innerText()).replace(/\D/g, ''), 10)).toBeLessThanOrEqual(broadCount);
  await expect(page.getByText('Executive summary', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Gap-анализ', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Сходство брендов', { exact: true })).toHaveCount(0);
});

test('header navigation uses requested order and all sections open', async ({ page }) => {
  await page.goto('');
  await expect(page.locator('.navigation > button, .navigation > .nav-more > button')).toHaveText(['Сравнение', 'Категории', 'Бренды', 'Сопоставимость', 'Скоро открытие', 'Ещё']);
  for (const [button, heading] of [['Категории', 'Категории'], ['Бренды', 'Бренды'], ['Сопоставимость', 'Сопоставимость объектов'], ['Скоро открытие', 'Скоро открытие']]) {
    await navButton(page, button).click();
    await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
  }
  for (const [button, heading] of [['Качество данных', 'Качество данных'], ['Динамика', 'Историческая динамика пока недоступна']]) {
    await page.getByRole('button', { name: 'Ещё', exact: true }).click();
    await page.getByRole('menuitem', { name: button }).click();
    await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
  }
});

test('CSV exports the current registry slice', async ({ page }) => {
  await page.goto('?tab=brands&categories=Обувь');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSV' }).click();
  expect((await download).suggestedFilename()).toBe('brands-slice.csv');
});

test('keyboard focus and accessibility smoke', async ({ page }) => {
  await page.goto('');
  const skipLink = page.locator('.skip-link');
  await expect(skipLink).toBeAttached();
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
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
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
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
  await expect(page.getByText(/Фокусный объект не соответствует/)).toHaveCount(0);
});

test('comparison table supports explicit sorting', async ({ page }) => {
  await page.goto('?tab=comparability');
  const header = page.locator('.comparison-table thead').getByRole('button', { name: 'Бренды', exact: true });
  const column = header.locator('xpath=../..');
  await header.click(); await expect(column).toHaveAttribute('aria-sort', 'ascending');
  await header.click(); await expect(column).toHaveAttribute('aria-sort', 'descending');
});

test('comparison table provides a filter in every column header', async ({ page }) => {
  await page.goto('?tab=comparability');
  await expect(page.locator('.comparison-table thead .registry-filter-header')).toHaveCount(9);
  await page.getByLabel('Фильтр: Город').click();
  await page.getByRole('checkbox', { name: 'Казань' }).uncheck();
  await expect(page.locator('.comparison-table tbody')).not.toContainText('KazanMall');
});

test('brand registry aggregates brands and opens the brand card', async ({ page }, testInfo) => {
  await page.goto('?tab=brands');
  await expect(page.locator('.brand-registry-row').first()).toBeVisible();
  const names = await page.locator('.brand-registry-row .brand-button').allTextContents();
  expect(new Set(names).size).toBe(names.length);
  await page.locator('.brand-registry-row .brand-button').first().click();
  await expect(page.locator('.sheet[role="dialog"]')).toBeVisible();
  if (testInfo.project.name.startsWith('mobile')) await expect(page.locator('.brand-table .registry-head')).toBeHidden();
});

test('upcoming openings expose desktop column controls and mobile card search', async ({ page }, testInfo) => {
  await page.goto('?tab=upcoming');
  if (testInfo.project.name.startsWith('mobile')) {
    await expect(page.locator('.upcoming-table thead')).toBeHidden();
    await expect(page.getByRole('textbox', { name: 'Поиск в таблице скоро открытие' })).toBeVisible();
    await expect(page.locator('.upcoming-table tbody tr').first()).toBeVisible();
    return;
  }
  await expect(page.locator('.upcoming-table thead .registry-filter-header')).toHaveCount(8);
  const sortHeader = page.locator('.upcoming-table thead').getByRole('button', { name: 'Бренд', exact: true });
  await sortHeader.click();
  await expect(sortHeader.locator('xpath=../..')).toHaveAttribute('aria-sort', 'ascending');
});

test('saved view restores filters, focus and active section', async ({ page }) => {
  await page.goto('?focus=Небо&tab=categories&categories=Обувь&metric=share');
  await page.getByRole('button', { name: 'Сохранённые представления' }).click();
  const dialog = page.getByRole('dialog', { name: 'Сохранённые представления' });
  await dialog.getByLabel('Название нового представления').fill('Контрольный срез');
  await dialog.getByRole('button', { name: 'Сохранить' }).click();
  await dialog.getByRole('button', { name: 'Закрыть' }).click();
  await chooseFocus(page, 'Фантастика');
  await navButton(page, 'Сравнение').click();
  await page.getByRole('button', { name: 'Сохранённые представления' }).click();
  await page.getByRole('dialog', { name: 'Сохранённые представления' }).getByRole('button', { name: 'Открыть' }).click();
  await expect(page.locator('.searchable-filter').filter({ hasText: 'Фокусный объект' }).getByRole('button')).toContainText('Небо');
  await expect(navButton(page, 'Категории')).toHaveAttribute('aria-current', 'page');
  await expect.poll(() => new URL(page.url()).searchParams.get('categories')).toBe('Обувь');
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