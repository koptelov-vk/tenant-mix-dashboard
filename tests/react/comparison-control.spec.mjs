import { test, expect } from '@playwright/test';

test('mobile comparison control aligns its label with the other filters', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'));
  await page.goto('');

  const field = page.locator('.comparison-field');
  const comparison = page.locator('.comparison-trigger');
  const surface = page.locator('.comparison-trigger-surface');

  await expect(field).toBeVisible();
  await expect(comparison).toBeVisible();
  await expect(surface).toBeVisible();
  await expect(field).toHaveJSProperty('tagName', 'DIV');
  await expect(page.locator('#comparison-field-label')).toHaveText('Выбрать объекты');

  const geometry = await page.evaluate(() => {
    const button = document.querySelector('.comparison-trigger');
    const visual = document.querySelector('.comparison-trigger-surface');
    const comparisonLabel = document.querySelector('#comparison-field-label');
    const categoryField = [...document.querySelectorAll('.filter-bar > label')]
      .find((label) => label.querySelector(':scope > span')?.textContent?.trim() === 'Категория');
    const categoryLabel = categoryField?.querySelector(':scope > span');
    const categorySelect = categoryField?.querySelector('select');

    if (!(button instanceof HTMLElement) || !(visual instanceof HTMLElement) ||
        !(comparisonLabel instanceof HTMLElement) || !(categoryLabel instanceof HTMLElement) ||
        !(categorySelect instanceof HTMLElement)) return null;

    const buttonStyle = getComputedStyle(button);
    const visualStyle = getComputedStyle(visual);
    const comparisonLabelRect = comparisonLabel.getBoundingClientRect();
    const visualRect = visual.getBoundingClientRect();
    const categoryLabelRect = categoryLabel.getBoundingClientRect();
    const categorySelectRect = categorySelect.getBoundingClientRect();

    return {
      hitHeight: button.getBoundingClientRect().height,
      visualHeight: visualRect.height,
      hitBlockSize: buttonStyle.blockSize,
      hitAlignItems: buttonStyle.alignItems,
      visualBlockSize: visualStyle.blockSize,
      hitPaddingTop: Number.parseFloat(buttonStyle.paddingTop),
      hitPaddingBottom: Number.parseFloat(buttonStyle.paddingBottom),
      visualAlignItems: visualStyle.alignItems,
      visualFontSize: visualStyle.fontSize,
      visualBorderRadius: visualStyle.borderRadius,
      comparisonGap: visualRect.top - comparisonLabelRect.bottom,
      categoryGap: categorySelectRect.top - categoryLabelRect.bottom,
      appearance: buttonStyle.appearance,
    };
  });

  expect(geometry).not.toBeNull();
  expect(geometry.hitHeight).toBeGreaterThanOrEqual(44);
  expect(geometry.hitHeight).toBeLessThanOrEqual(48);
  expect(geometry.visualHeight).toBeGreaterThanOrEqual(27);
  expect(geometry.visualHeight).toBeLessThanOrEqual(29);
  expect(geometry.visualHeight).toBeLessThan(geometry.hitHeight);
  expect(geometry.hitBlockSize).toBe('44px');
  expect(geometry.hitAlignItems).toBe('flex-start');
  expect(geometry.visualBlockSize).toBe('28px');
  expect(geometry.hitPaddingTop).toBe(0);
  expect(geometry.hitPaddingBottom).toBe(0);
  expect(geometry.visualAlignItems).toBe('center');
  expect(geometry.visualFontSize).toBe('14px');
  expect(geometry.visualBorderRadius).toBe('8px');
  expect(Math.abs(geometry.comparisonGap - geometry.categoryGap)).toBeLessThanOrEqual(2);
  expect(geometry.appearance).toBe('none');
});
