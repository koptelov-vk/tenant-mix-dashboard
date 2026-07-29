import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('potential-brand object counts are correct in UI, accessibility and PDF mode', async ({ page }) => {
  await page.goto('?focus=Фантастика&tab=overview&categories=Детские%20товары');

  const threshold = page.getByLabel('Кол-во объектов присутствия бренда');
  await expect(threshold).toBeVisible();
  await threshold.selectOption('3');

  const signals = page.locator('.brand-signals');
  const labels = await signals.locator('small').allTextContents();

  expect(labels.some((text) => /(?:^|\s)3 объекта(?:\s|$)/.test(text))).toBe(true);
  expect(labels.some((text) => /(?:^|\s)4 объекта(?:\s|$)/.test(text))).toBe(true);
  await expect(signals).toContainText('Original Marines');
  await expect(signals).toContainText('Balabala');
  await expect(signals).toContainText('Beba kids');
  expect(labels.every((text) => !/(?:^|\s)(?:3|4) объектов(?:\s|$)/.test(text))).toBe(true);

  const accessibility = await new AxeBuilder({ page })
    .include('.brand-signals')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(accessibility.violations.filter((item) => item.impact === 'critical')).toEqual([]);

  const beforePdfMode = await signals.locator('small').allTextContents();
  await page.evaluate(() => document.body.classList.add('pdf-rendering'));
  await expect(signals).toBeVisible();
  expect(await signals.locator('small').allTextContents()).toEqual(beforePdfMode);
});
