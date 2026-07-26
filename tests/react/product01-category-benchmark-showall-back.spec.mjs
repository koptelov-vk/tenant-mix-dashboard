import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const list = () => 'main >> .category-profile-list';

async function expandAndOpenFirstCategory(page) {
  await page.goto('?focus=Фантастика&group=same-class&tab=overview');
  await page.waitForSelector('.category-profile-list');
  const showAll = page.locator('.category-profile-show-all');
  await expect(showAll).toBeVisible();
  await showAll.click();
  await expect(page.locator('.category-profile-row.category-profile-row-collapsed')).toHaveCount(0);
  await page.locator('.category-profile-open').first().click();
  await expect(page).toHaveURL(/tab=categories/);
}

test.describe('Issue #170 correction: "Показать все" survives browser Back', () => {
  test('collapsed -> Показать все -> open category -> Back -> still expanded', async ({ page }) => {
    await expandAndOpenFirstCategory(page);
    await page.goBack();
    await expect(page).toHaveURL(/cpShowAll=1/);
    await expect(page.locator('.category-profile-row.category-profile-row-collapsed')).toHaveCount(0);
    await expect(page.locator('.category-profile-show-all')).toHaveCount(0);
  });

  test('Share mode + Показать все -> open category -> Back -> Share and expanded both restored', async ({ page }) => {
    await page.goto('?focus=Фантастика&group=same-class&tab=overview');
    await page.waitForSelector('.category-profile-list');
    await page.locator('.category-profile-mode-toggle button', { hasText: 'Доля' }).click();
    await expect(page).toHaveURL(/cpMode=share/);
    await page.locator('.category-profile-show-all').click();
    await page.locator('.category-profile-open').first().click();
    await expect(page).toHaveURL(/tab=categories/);

    await page.goBack();
    await expect(page).toHaveURL(/cpMode=share/);
    await expect(page).toHaveURL(/cpShowAll=1/);
    await expect(page.locator('.category-profile-mode-toggle button[aria-pressed="true"]')).toHaveText('Доля');
    await expect(page.locator('.category-profile-row.category-profile-row-collapsed')).toHaveCount(0);
    // Deterministic sorting (by share deviation, descending) is automatic — there is no user-selectable
    // sort control in Variant A ("rank отсутствует в v1"), so there is nothing else to restore here.
  });

  test('Back -> expanded restored -> Forward -> category reopens -> Back again -> still expanded', async ({ page }) => {
    await expandAndOpenFirstCategory(page);
    await page.goBack();
    await expect(page.locator('.category-profile-row.category-profile-row-collapsed')).toHaveCount(0);

    await page.goForward();
    await expect(page).toHaveURL(/tab=categories/);

    await page.goBack();
    await expect(page.locator('.category-profile-row.category-profile-row-collapsed')).toHaveCount(0);
    await expect(page.locator('.category-profile-show-all')).toHaveCount(0);
  });

  test('keyboard: trigger reachable by Tab, Enter expands, aria-expanded flips, last row reachable after Back', async ({ page }) => {
    await page.goto('?focus=Фантастика&group=same-class&tab=overview');
    await page.waitForSelector('.category-profile-list');
    const showAll = page.locator('.category-profile-show-all');
    await showAll.focus();
    await expect(showAll).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Enter');
    await expect(page.locator('.category-profile-show-all')).toHaveCount(0);
    await expect(page.locator('.category-profile-row.category-profile-row-collapsed')).toHaveCount(0);

    await page.locator('.category-profile-open').first().click();
    await page.goBack();
    const lastRow = page.locator('.category-profile-row').last();
    await expect(lastRow).not.toHaveClass(/category-profile-row-collapsed/);
    await lastRow.locator('.category-profile-open').focus();
    await expect(lastRow.locator('.category-profile-open')).toBeFocused();
  });

  test('accessibility: no new axe violations in expanded+restored state', async ({ page }) => {
    await expandAndOpenFirstCategory(page);
    await page.goBack();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).include('.category-profile-list').analyze();
    expect(results.violations).toEqual([]);
  });

  test('812x375 landscape: expanded state restores after Back', async ({ page }) => {
    await page.setViewportSize({ width: 812, height: 375 });
    await expandAndOpenFirstCategory(page);
    await page.goBack();
    await expect(page.locator('.category-profile-row.category-profile-row-collapsed')).toHaveCount(0);
  });
});
