import { test, expect } from '@playwright/test';

test('mobile comparison control matches the primary filter height', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'));
  await page.goto('');

  const comparison = page.locator('.comparison-trigger');
  const focusSelect = page.locator('.filter-bar select').first();

  await expect(comparison).toBeVisible();
  await expect(focusSelect).toBeVisible();

  const comparisonBox = await comparison.boundingBox();
  const selectBox = await focusSelect.boundingBox();

  expect(comparisonBox).not.toBeNull();
  expect(selectBox).not.toBeNull();
  expect(comparisonBox.height).toBeGreaterThanOrEqual(44);
  expect(comparisonBox.height).toBeLessThanOrEqual(48);
  expect(Math.abs(comparisonBox.height - selectBox.height)).toBeLessThanOrEqual(4);

  const computed = await comparison.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      alignItems: style.alignItems,
      paddingTop: Number.parseFloat(style.paddingTop),
      paddingBottom: Number.parseFloat(style.paddingBottom),
    };
  });

  expect(computed.alignItems).toBe('center');
  expect(computed.paddingTop).toBe(0);
  expect(computed.paddingBottom).toBe(0);
});
