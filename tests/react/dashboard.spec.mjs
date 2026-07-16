import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('loads production data without JavaScript errors and defaults to Fantastika', async ({ page }) => {
  const errors = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('');
  await expect(page.locator('select').first()).toHaveValue('Фантастика');
  await expect(page.locator('.kpi')).toHaveCount(6);
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
  for (const [button, heading] of [['Сопоставимость', 'Сопоставимость ТЦ'], ['Категории', 'Категории'], ['Бренды', 'Бренды'], ['Сценарии', 'Сценарии'], ['Скоро открытие', 'Скоро открытие'], ['Качество данных', 'Качество данных'], ['Динамика', 'Историческая динамика пока недоступна']]) {
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
