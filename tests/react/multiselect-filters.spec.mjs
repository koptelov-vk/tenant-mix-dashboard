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