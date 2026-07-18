import { expect, test, type Locator, type Page } from '@playwright/test';

const dialogs = (page: Page) => page.locator('[role="dialog"].filter-popover, [role="dialog"].registry-filter-menu');
const globalFilter = (page: Page, label: string) => page.locator('.searchable-filter').filter({ has: page.locator('.filter-label', { hasText: label }) }).locator(':scope > button.filter-control');
const visibleTableFilter = (page: Page, label: string): Locator => page.locator(`summary[aria-label="Фильтр: ${label}"]:visible`).first();
const activateOtherTrigger = async (trigger: Locator, projectName: string) => {
  if (projectName.startsWith('mobile')) {
    await trigger.focus();
    await trigger.press('Enter');
    return;
  }
  await trigger.click();
};

test.describe('QA-01 filter popovers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('button', { name: 'Сравнение', exact: true })).toHaveAttribute('aria-current', 'page');
  });

  test('outside click and Escape close a global popover and restore focus', async ({ page }) => {
    const geography = globalFilter(page, 'География');
    await geography.click();
    await expect(page.getByRole('dialog', { name: 'Выбор: География' })).toBeVisible();

    await page.locator('main').click({ position: { x: 4, y: 4 } });
    await expect(page.getByRole('dialog', { name: 'Выбор: География' })).toHaveCount(0);

    await geography.click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Выбор: География' })).toHaveCount(0);
    await expect(geography).toBeFocused();
  });

  test('opening another global popover closes the previous and keeps selected values', async ({ page }, testInfo) => {
    const geography = globalFilter(page, 'География');
    const categories = globalFilter(page, 'Категории');

    await geography.click();
    const geographyDialog = page.getByRole('dialog', { name: 'Выбор: География' });
    await geographyDialog.getByRole('option').first().click();

    await activateOtherTrigger(categories, testInfo.project.name);
    await expect(geographyDialog).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Выбор: Категории' })).toBeVisible();
    await expect(dialogs(page)).toHaveCount(1);

    await page.keyboard.press('Escape');
    await geography.click();
    await expect(geographyDialog.locator('[role="option"][aria-selected="true"]')).toHaveCount(1);
  });

  test('global and table filters share one open-popover contract and navigation closes it', async ({ page }, testInfo) => {
    const categories = globalFilter(page, 'Категории');
    await categories.click();
    await expect(dialogs(page)).toHaveCount(1);

    await page.getByRole('button', { name: 'Бренды', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Бренды' })).toBeVisible();
    await expect(dialogs(page)).toHaveCount(0);

    const tableFilter = visibleTableFilter(page, 'Бренд');
    await tableFilter.click();
    await expect(page.getByRole('dialog', { name: 'Фильтр столбца: Бренд' })).toBeVisible();

    await activateOtherTrigger(categories, testInfo.project.name);
    await expect(page.getByRole('dialog', { name: 'Фильтр столбца: Бренд' })).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Выбор: Категории' })).toBeVisible();
    await expect(dialogs(page)).toHaveCount(1);
  });

  test('table filters are exclusive and Escape restores trigger focus', async ({ page }) => {
    await page.getByRole('button', { name: 'Бренды', exact: true }).click();
    const brandFilter = visibleTableFilter(page, 'Бренд');
    const categoryFilter = visibleTableFilter(page, 'Категория');

    await brandFilter.click();
    await expect(page.getByRole('dialog', { name: 'Фильтр столбца: Бренд' })).toBeVisible();

    await categoryFilter.focus();
    await categoryFilter.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Фильтр столбца: Бренд' })).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: 'Фильтр столбца: Категория' })).toBeVisible();
    await expect(dialogs(page)).toHaveCount(1);

    await page.keyboard.press('Escape');
    await expect(dialogs(page)).toHaveCount(0);
    await expect(categoryFilter).toBeFocused();
  });
});
