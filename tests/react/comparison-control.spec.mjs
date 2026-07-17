import { test, expect } from '@playwright/test';

test('mobile comparison control keeps a 44px hit area with select-like visual metrics', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'));
  await page.goto('');

  const field = page.locator('.comparison-field');
  const comparison = page.locator('.comparison-trigger');
  const surface = page.locator('.comparison-trigger-surface');

  await expect(field).toBeVisible();
  await expect(comparison).toBeVisible();
  await expect(surface).toBeVisible();
  await expect(field).toHaveJSProperty('tagName', 'DIV');

  const geometry = await page.evaluate(() => {
    const button = document.querySelector('.comparison-trigger');
    const visual = document.querySelector('.comparison-trigger-surface');
    if (!(button instanceof HTMLElement) || !(visual instanceof HTMLElement)) return null;
    const buttonStyle = getComputedStyle(button);
    const visualStyle = getComputedStyle(visual);
    return {
      hitHeight: button.getBoundingClientRect().height,
      visualHeight: visual.getBoundingClientRect().height,
      hitBlockSize: buttonStyle.blockSize,
      visualBlockSize: visualStyle.blockSize,
      hitPaddingTop: Number.parseFloat(buttonStyle.paddingTop),
      hitPaddingBottom: Number.parseFloat(buttonStyle.paddingBottom),
      visualAlignItems: visualStyle.alignItems,
      visualFontSize: visualStyle.fontSize,
      visualBorderRadius: visualStyle.borderRadius,
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
  expect(geometry.visualBlockSize).toBe('28px');
  expect(geometry.hitPaddingTop).toBe(0);
  expect(geometry.hitPaddingBottom).toBe(0);
  expect(geometry.visualAlignItems).toBe('center');
  expect(geometry.visualFontSize).toBe('14px');
  expect(geometry.visualBorderRadius).toBe('8px');
  expect(geometry.appearance).toBe('none');
});