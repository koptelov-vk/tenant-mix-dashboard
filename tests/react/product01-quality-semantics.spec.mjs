import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('PRODUCT-01-UI-03 separates excluded and included-review signals', async ({ page }) => {
  await page.goto('?focus=Фантастика&tab=overview');

  const limited = page.locator('.category-profile-quality-trigger.is-limited');
  const reviewOnly = page.locator('.category-profile-quality-trigger.is-review-only');
  await expect(limited.first()).toBeVisible();
  await expect(reviewOnly.first()).toBeVisible();

  await expect(limited.first()).toContainText('Расчёт ограничен');
  await expect(reviewOnly.first()).toContainText('включены в расчёт');
  await expect(reviewOnly.first()).not.toContainText('Расчёт ограничен');

  await limited.first().click();
  const dialog = page.getByRole('dialog', { name: /Качество данных категории/ });
  await expect(dialog).toContainText('Исключено из расчёта');
  await expect(dialog).toContainText('ограничивают полноту рассчитанного показателя');
  await page.keyboard.press('Escape');

  await reviewOnly.first().click();
  await expect(dialog).toContainText('Включено, но требует проверки');
  await expect(dialog).toContainText('включены в расчёт');
  await expect(dialog).toContainText('сама по себе не ограничивает расчёт');
  await expect(dialog).not.toContainText('Исключено из расчёта');

  const mixed = page.locator('.category-profile-row.has-mixed-quality');
  if (await mixed.count()) {
    await page.keyboard.press('Escape');
    await mixed.first().locator('.category-profile-quality-trigger').click();
    await expect(dialog).toContainText('Исключено из расчёта');
    await expect(dialog).toContainText('Включено, но требует проверки');
  }

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.filter((item) => item.impact === 'critical')).toEqual([]);
});
