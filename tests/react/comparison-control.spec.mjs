import { test, expect } from '@playwright/test';

test('mobile global filters share one control system', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith('mobile'));
  await page.goto('');

  const fields = page.locator('.filter-bar .filter-field');
  const controls = page.locator('.filter-bar .filter-control');
  const comparisonLabel = page.locator('#comparison-field-label');

  await expect(fields).toHaveCount(5);
  await expect(controls).toHaveCount(5);
  await expect(comparisonLabel).toHaveText('Выбрать объекты');

  const metrics = await controls.evaluateAll((elements) => elements.map((element) => {
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return {
      tagName: element.tagName,
      height: box.height,
      fontSize: style.fontSize,
      borderRadius: style.borderRadius,
      borderWidth: style.borderTopWidth,
      paddingTop: style.paddingTop,
      paddingBottom: style.paddingBottom,
      backgroundColor: style.backgroundColor,
      appearance: style.appearance,
    };
  }));

  expect(metrics).toHaveLength(5);
  for (const metric of metrics) {
    expect(metric.height).toBeGreaterThanOrEqual(44);
    expect(metric.height).toBeLessThanOrEqual(48);
    expect(metric.fontSize).toBe('14px');
    expect(metric.borderRadius).toBe('10px');
    expect(metric.borderWidth).toBe('1px');
    expect(metric.paddingTop).toBe('0px');
    expect(metric.paddingBottom).toBe('0px');
    expect(metric.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(metric.appearance).toBe('none');
  }

  const heights = metrics.map((metric) => metric.height);
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);

  const verticalAlignment = await page.evaluate(() => {
    const categoryField = Array.from(document.querySelectorAll('.filter-field')).find((field) => field.querySelector('.filter-label')?.textContent === 'Категория');
    const comparisonField = document.querySelector('.comparison-field');
    if (!(categoryField instanceof HTMLElement) || !(comparisonField instanceof HTMLElement)) return null;
    const categoryLabel = categoryField.querySelector('.filter-label');
    const categoryControl = categoryField.querySelector('.filter-control');
    const comparisonLabelElement = comparisonField.querySelector('.filter-label');
    const comparisonControl = comparisonField.querySelector('.filter-control');
    if (!(categoryLabel instanceof HTMLElement) || !(categoryControl instanceof HTMLElement) || !(comparisonLabelElement instanceof HTMLElement) || !(comparisonControl instanceof HTMLElement)) return null;
    return {
      categoryGap: categoryControl.getBoundingClientRect().top - categoryLabel.getBoundingClientRect().bottom,
      comparisonGap: comparisonControl.getBoundingClientRect().top - comparisonLabelElement.getBoundingClientRect().bottom,
    };
  });

  expect(verticalAlignment).not.toBeNull();
  expect(Math.abs(verticalAlignment.categoryGap - verticalAlignment.comparisonGap)).toBeLessThanOrEqual(1);
});
