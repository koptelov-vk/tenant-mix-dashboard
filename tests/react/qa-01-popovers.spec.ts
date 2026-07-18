import { expect, test } from '@playwright/test';

const dialogs = (page: import('@playwright/test').Page) => page.locator('[role="dialog"].filter-popover, [role="dialog"].registry-filter-menu');

test.describe('QA-01 filter popovers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { name: 'Сравнение' })).toBeVisible();
  });

  test('outside click and Escape close a global popover and restore focus', async ({ page }) => {
    const geography = page.getByRole('button', { name: /География/ });
    await geography.click();
    await expect(page.getByRole('dialog', { name: 'Выбор: География' })).toBeVisible();

    await page.getByRole('heading', { name: 'Сравнение' }).click();
    await expect(page.getByRole('dialog', { name: 'Выбор: География' })).toHaveCount(0);

    await geography.click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Выбор: География' })).toHaveCount(0);
    await expect(geography).toBeFocused();
  });

  test('opening another global popover closes the previous and keeps selected values', async ({ page }) => {
    const geography = page.getByRole('button', { name: /География/ });
    const categories = page.getByRole('button', { name: /Категории/ });

    await geography.click();
    const geographyDialog = page.getByRole('dialog', { name: 'Выбор: География' });
    const firstOption = geographyDialog.getByRole('option').first();
    const optionName = (await firstOption.textContent())?.trim();
    await firstOption.click();

    await categories.click();
    await expect(geographyDialog).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Выбор: Категории' })).toBeVisible();
    await expect(dialogs(page)).toHaveCount(1);

    await categories.click();
    await geography.click();
    if (optionName) await expect(geographyDialog.getByRole('option', { name: new RegExp(optionName) })).toHaveAttribute('aria-selected', 'true');
  });

  test('global and table filters share one open-popover contract and navigation closes it', async ({ page }) => {
    const globalFilter = page.getByRole('button', { name: /Категории/ });
    await globalFilter.click();
    await expect(dialogs(page)).toHaveCount(1);

    await page.getByRole('button', { name: 'Бренды' }).click();
    await expect(page.getByRole('heading', { name: 'Бренды' })).toBeVisible();
    await expect(dialogs(page)).toHaveCount(0);

    const tableFilter = page.getByLabel('Фильтр: Бренд').first();
    await tableFilter.click();
    await expect(page.getByRole('dialog', { name: 'Фильтр столбца: Бренд' })).toBeVisible();

    await globalFilter.click();
    await expect(page.getByRole('dialog', { name: 'Фильтр столбца: Бренд' })).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Выбор: Категории' })).toBeVisible();
    await expect(dialogs(page)).toHaveCount(1);
  });

  test('table filters are exclusive and Escape restores trigger focus', async ({ page }) => {
    await page.getByRole('button', { name: 'Бренды' }).click();
    const brandFilter = page.getByLabel('Фильтр: Бренд').first();
    const categoryFilter = page.getByLabel('Фильтр: Категория').first();

    await brandFilter.click();
    await categoryFilter.click();
    await expect(page.getByRole('dialog', { name: 'Фильтр столбца: Бренд' })).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Фильтр столбца: Категория' })).toBeVisible();
    await expect(dialogs(page)).toHaveCount(1);

    await page.keyboard.press('Escape');
    await expect(dialogs(page)).toHaveCount(0);
    await expect(categoryFilter).toBeFocused();
  });
});
