import { test, expect } from '@playwright/test';

test('geography and categories support searchable multiple selection', async ({ page }) => {
  await page.goto('');

  await page.getByRole('button', { name: /География Все города/ }).click();
  const geography = page.getByRole('dialog', { name: 'Выбор: География' });
  await geography.getByPlaceholder('Поиск: география').fill('Ниж');
  await geography.getByRole('option', { name: /Нижний Новгород/ }).click();
  await geography.getByPlaceholder('Поиск: география').fill('Каз');
  await geography.getByRole('option', { name: /Казань/ }).click();
  await geography.getByRole('button', { name: 'Готово' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('cities')).toContain('Нижний Новгород');
  await expect.poll(() => new URL(page.url()).searchParams.get('cities')).toContain('Казань');

  await page.getByRole('button', { name: /Категории Все категории/ }).click();
  const categories = page.getByRole('dialog', { name: 'Выбор: Категории' });
  const labels = await categories.getByRole('option').locator('b').allTextContents();
  expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, 'ru')));
  await categories.getByPlaceholder('Поиск: категории').fill('Обув');
  await categories.getByRole('option', { name: /Обувь/ }).click();
  await categories.getByPlaceholder('Поиск: категории').fill('Одеж');
  await categories.getByRole('option', { name: /Одежда/ }).click();
  await categories.getByRole('button', { name: 'Готово' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('categories')).toContain('Обувь');
  await expect.poll(() => new URL(page.url()).searchParams.get('categories')).toContain('Одежда');
});

test('mobile filter sheet stays below the header and restores viewport width', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'));
  await page.goto('');
  const initial = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.visualViewport?.width ?? window.innerWidth,
    scale: window.visualViewport?.scale ?? 1,
  }));

  await page.getByRole('button', { name: /География Все города/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Выбор: География' });
  const search = sheet.getByPlaceholder('Поиск: география');
  await expect(sheet).toBeVisible();
  await expect(search).toHaveCSS('font-size', '16px');

  const geometry = await page.evaluate(() => {
    const header = document.querySelector('.app-header');
    const dialog = document.querySelector('.filter-popover');
    if (!(header instanceof HTMLElement) || !(dialog instanceof HTMLElement)) return null;
    return {
      headerBottom: header.getBoundingClientRect().bottom,
      dialogTop: dialog.getBoundingClientRect().top,
      firstOptionTop: dialog.querySelector('[role="option"]')?.getBoundingClientRect().top ?? 0,
    };
  });
  expect(geometry).not.toBeNull();
  expect(geometry.dialogTop).toBeGreaterThanOrEqual(geometry.headerBottom - 1);
  expect(geometry.firstOptionTop).toBeGreaterThanOrEqual(geometry.dialogTop);

  await search.fill('Москва');
  await sheet.getByRole('button', { name: 'Готово' }).click();
  await expect(sheet).toHaveCount(0);

  const restored = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.visualViewport?.width ?? window.innerWidth,
    scale: window.visualViewport?.scale ?? 1,
  }));
  expect(restored.scrollWidth).toBeLessThanOrEqual(restored.clientWidth);
  expect(Math.abs(restored.clientWidth - initial.clientWidth)).toBeLessThanOrEqual(1);
  expect(Math.abs(restored.viewportWidth - initial.viewportWidth)).toBeLessThanOrEqual(1);
  expect(Math.abs(restored.scale - initial.scale)).toBeLessThanOrEqual(0.01);
});

test('focus selector includes city and supports search', async ({ page }) => {
  await page.goto('');
  await page.getByRole('button', { name: /Фокусный объект/ }).click();
  const selector = page.getByRole('dialog', { name: 'Выбор: Фокусный объект' });
  await selector.getByPlaceholder('Поиск: фокусный объект').fill('Казань');
  await expect(selector.getByRole('option').first()).toContainText('Казань');
});

test('manual peer selection does not trigger a false focus warning', async ({ page }) => {
  await page.goto('');
  await page.getByRole('button', { name: /Выбрать объекты/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Выбор объектов' });
  await dialog.getByRole('button', { name: 'Снять все' }).click();
  await dialog.getByRole('checkbox', { name: /Небо/ }).check();
  await dialog.getByRole('button', { name: 'Применить' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('group')).toBe('custom');
  await expect(page.getByText(/Фокусный объект не соответствует/)).toHaveCount(0);
});

test('all objects and unrestricted geography do not show a focus warning', async ({ page }) => {
  await page.goto('?group=all');
  await expect(page.getByText(/Фокусный объект не соответствует/)).toHaveCount(0);
});
