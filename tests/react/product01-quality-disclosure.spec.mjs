import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('PRODUCT-01 quality disclosure is independent, keyboard accessible and preserves category navigation', async ({ page }, testInfo) => {
  await page.goto('?focus=Фантастика&tab=overview');

  const trigger = page.getByRole('button', { name: /Показать качество данных категории/ }).first();
  await expect(trigger).toBeVisible();
  expect(await trigger.evaluate((element) => element.closest('.category-profile-open') === null)).toBe(true);

  const initialUrl = page.url();
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: /Качество данных категории/ });
  await expect(dialog).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const controlledId = await trigger.getAttribute('aria-controls');
  expect(controlledId).toBeTruthy();
  await expect(dialog).toHaveAttribute('id', controlledId);
  expect(new URL(page.url()).searchParams.get('tab') ?? 'overview').toBe('overview');
  expect(page.url()).toBe(initialUrl);
  await expect(dialog).toContainText('записей исключено из основного показателя');
  await expect(dialog).toContainText('не входят в основной active-only показатель');

  const reasons = await dialog.locator('dl > div').evaluateAll((rows) => rows.map((row) => ({
    label: row.querySelector('dt')?.textContent?.trim() ?? '',
    value: Number((row.querySelector('dd')?.textContent ?? '').replace(/\D/g, '')),
  })));
  expect(reasons.length).toBeGreaterThan(0);
  expect(reasons.every((reason) => reason.label.length > 0 && reason.value > 0)).toBe(true);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.press('Enter');
  await expect(dialog).toBeVisible();
  await page.mouse.click(4, 4);
  await expect(dialog).toBeHidden();

  await trigger.focus();
  await trigger.press('Space');
  await expect(dialog).toBeVisible();

  const calculationTrigger = page.getByRole('button', { name: /Пояснение расчёта для категории/ }).first();
  await calculationTrigger.click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.category-profile-tooltip[open] [role="tooltip"]').first()).toBeVisible();

  const navigation = page.locator('.category-profile-row').first().getByRole('button', { name: /Открыть категорию/ });
  await navigation.click();
  await expect.poll(() => new URL(page.url()).searchParams.get('tab')).toBe('categories');

  if (testInfo.project.name.startsWith('mobile')) {
    await page.goBack();
    await expect(trigger).toBeVisible();
    const box = await trigger.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await trigger.click();
    const geometry = await dialog.boundingBox();
    const viewport = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      height: window.visualViewport?.height ?? window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(geometry.x).toBeGreaterThanOrEqual(0);
    expect(geometry.y).toBeGreaterThanOrEqual(0);
    expect(geometry.x + geometry.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(geometry.y + geometry.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width);
  }

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.filter((item) => item.impact === 'critical')).toEqual([]);
});
