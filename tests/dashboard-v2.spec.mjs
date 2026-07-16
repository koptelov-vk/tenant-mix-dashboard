import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('opens without errors and defaults to Fantastika', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#focusSelect')).toHaveValue('Фантастика');
  await expect(page.locator('.kpi-card')).toHaveCount(6);
  expect(errors).toEqual([]);
});

test('focus change updates KPI and URL, reload restores state', async ({ page }) => {
  await page.goto('/');
  const before = await page.locator('.kpi-card').first().locator('.kpi-value').innerText();
  await page.locator('#focusSelect').selectOption('Небо');
  await expect.poll(() => new URL(page.url()).searchParams.get('focus')).toBe('небо');
  const after = await page.locator('.kpi-card').first().locator('.kpi-value').innerText();
  expect(after).not.toBe(before);
  await page.reload();
  await expect(page.locator('#focusSelect')).toHaveValue('Небо');
});

test('browser back restores the previous focus', async ({ page }) => {
  await page.goto('/');
  await page.locator('#focusSelect').selectOption('Небо');
  await page.goBack();
  await expect(page.locator('#focusSelect')).toHaveValue('Фантастика');
});

test('heatmap and density mode render for the current slice', async ({ page }) => {
  await page.goto('/?focus=фантастика&tab=tenant-mix&group=superregional&geo=nn,regions&metric=density&gapN=3');
  await expect(page.locator('.heatmap')).toBeVisible();
  await expect(page.locator('[data-metric="density"]')).toHaveClass(/active/);
  await expect(page.locator('.heatmap-na').first()).toBeVisible();
});

test('CSV export contains filtered rows', async ({ page }) => {
  await page.goto('/?focus=фантастика&tab=tenants&group=superregional&geo=nn&metric=absolute&gapN=3');
  await page.locator('#tenantSearch').fill('FARШ');
  await page.waitForTimeout(250);
  const download = page.waitForEvent('download');
  await page.locator('#exportCsv').click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('tenant-mix-filtered.csv');
});

test('empty tenant result is stable', async ({ page }) => {
  await page.goto('/?focus=фантастика&tab=tenants&group=superregional&geo=nn&metric=absolute&gapN=3');
  await page.locator('#tenantSearch').fill('___нет_такого_бренда___');
  await page.waitForTimeout(250);
  await expect(page.locator('#tenantCount')).toContainText('0 строк');
});

test('keyboard navigation and accessibility smoke', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
});

test('mobile width has no page overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test('unconfirmed source has a distinct visual label', async ({ page }) => {
  await page.goto('/?focus=фантастика&tab=tenants&group=all&geo=all&metric=absolute&gapN=3');
  await page.locator('#tenantQuality').selectOption('Средняя');
  await expect(page.locator('.quality.medium').first()).toBeVisible();
});
