import { test, expect } from '@playwright/test';

test('mobile comparison control matches the primary filter height', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'));
  await page.goto('');

  const field = page.locator('.comparison-field');
  const comparison = page.locator('.comparison-trigger');
  const focusSelect = page.locator('.filter-bar select').first();

  await expect(field).toBeVisible();
  await expect(comparison).toBeVisible();
  await expect(focusSelect).toBeVisible();
  await expect(field).toHaveJSProperty('tagName', 'DIV');

  const geometry = await page.evaluate(() => {
    const button = document.querySelector('.comparison-trigger');
    const select = document.querySelector('.filter-bar select');
    if (!(button instanceof HTMLElement) || !(select instanceof HTMLElement)) return null;
    const buttonStyle = getComputedStyle(button);
    return {
      buttonHeight: button.getBoundingClientRect().height,
      selectHeight: select.getBoundingClientRect().height,
      computedHeight: buttonStyle.height,
      blockSize: buttonStyle.blockSize,
      minBlockSize: buttonStyle.minBlockSize,
      maxBlockSize: buttonStyle.maxBlockSize,
      alignItems: buttonStyle.alignItems,
      paddingTop: Number.parseFloat(buttonStyle.paddingTop),
      paddingBottom: Number.parseFloat(buttonStyle.paddingBottom),
      appearance: buttonStyle.appearance,
    };
  });

  expect(geometry).not.toBeNull();
  expect(geometry.buttonHeight).toBeGreaterThanOrEqual(44);
  expect(geometry.buttonHeight).toBeLessThanOrEqual(48);
  expect(Math.abs(geometry.buttonHeight - geometry.selectHeight)).toBeLessThanOrEqual(4);
  expect(geometry.computedHeight).toBe('44px');
  expect(geometry.blockSize).toBe('44px');
  expect(geometry.minBlockSize).toBe('44px');
  expect(geometry.maxBlockSize).toBe('44px');
  expect(geometry.alignItems).toBe('center');
  expect(geometry.paddingTop).toBe(0);
  expect(geometry.paddingBottom).toBe(0);
  expect(geometry.appearance).toBe('none');
});
