import { expect, test } from '@playwright/test';

test('brands registry is scrollable, omits source and shows collision-safe object popover', async ({ page }) => {
  await page.goto('');
  await page.getByRole('navigation', { name: 'Основные разделы' }).getByRole('button', { name: 'Бренды' }).click();
  const table = page.getByRole('table', { name: 'Реестр нормализованных брендов' });
  await expect(table).toBeVisible();
  await expect(table.getByRole('columnheader', { name: /Источник/ })).toHaveCount(0);
  const scroller = page.locator('.brand-table .virtual-list');
  await expect(scroller).toBeVisible();
  const geometry = await scroller.evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, overflowY: getComputedStyle(element).overflowY }));
  expect(['auto', 'scroll']).toContain(geometry.overflowY);
  expect(geometry.clientHeight).toBeGreaterThan(300);

  const more = page.locator('.brand-mall-more:visible').first();
  await expect(more).toBeVisible();
  await more.click();
  const popover = page.getByRole('dialog', { name: 'Все объекты бренда' });
  await expect(popover).toBeVisible();
  await expect(popover).toBeFocused();
  const box = await popover.boundingBox();
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  const viewport = await page.evaluate(() => ({ width: document.documentElement.clientWidth, height: window.visualViewport?.height ?? window.innerHeight }));
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  await page.keyboard.press('Escape');
  await expect(popover).toHaveCount(0);
  await expect(more).toBeFocused();
});

test('upcoming openings has search and consistent status labels', async ({ page }) => {
  await page.goto('');
  await page.getByRole('navigation', { name: 'Основные разделы' }).getByRole('button', { name: 'Скоро открытие' }).click();
  const search = page.getByRole('textbox', { name: 'Поиск в таблице скоро открытие' });
  await expect(search).toBeVisible();
  await search.fill('Фантастика');
  const rows = page.locator('.upcoming-table tbody tr');
  await expect(rows.first()).toBeVisible();
  await expect.poll(async () => {
    const rowTexts = await rows.allTextContents();
    return rowTexts.length > 0 && rowTexts.every((text) => text.includes('Фантастика'));
  }).toBe(true);
  await expect(page.getByText('ожидается', { exact: true })).toHaveCount(0);
});

test('heatmap share mode uses a single visible contrast scale', async ({ page }) => {
  await page.goto('');
  await page.getByRole('navigation', { name: 'Основные разделы' }).getByRole('button', { name: 'Категории' }).click();
  await page.getByRole('button', { name: 'Доля' }).click();
  await expect(page.locator('.heatmap-legend')).toContainText('Единая шкала');
  const colors = await page.locator('.category-heatmap-desktop .heatmap tbody td').evaluateAll((cells) => [...new Set(cells.map((cell) => getComputedStyle(cell).backgroundColor))]);
  expect(colors.length).toBeGreaterThan(2);
});

test('mobile tables expose controls and avoid horizontal page overflow', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'));
  await page.goto('');
  await page.getByRole('navigation', { name: 'Основные разделы' }).getByRole('button', { name: 'Бренды' }).click();
  await expect(page.locator('.brand-table .registry-row').first()).toBeVisible();
  let width = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.client);

  await page.getByRole('navigation', { name: 'Основные разделы' }).getByRole('button', { name: 'Скоро открытие' }).click();
  const controls = page.getByLabel('Фильтры и сортировка скоро открытие');
  await expect(controls).toBeVisible();
  await expect(controls.getByText('Сортировка')).toBeVisible();
  await expect(controls.getByLabel('Фильтр: ТЦ')).toBeVisible();
  width = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.client);
});
