import { test, expect } from '@playwright/test';

const configurations = [
  { name: 'portrait-320', width: 320, height: 740 },
  { name: 'portrait-375', width: 375, height: 740 },
  { name: 'portrait-390', width: 390, height: 740 },
  { name: 'portrait-430', width: 430, height: 740 },
  { name: 'landscape-844', width: 844, height: 390 },
  { name: 'desktop-1366', width: 1366, height: 900 },
];

async function expectAccessibleTarget(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);

  const hitResults = await page.evaluate(({ box }) => {
    const points = [
      [box.x + box.width / 2, box.y + box.height / 2],
      [box.x + 2, box.y + 2],
      [box.x + box.width - 2, box.y + 2],
      [box.x + 2, box.y + box.height - 2],
      [box.x + box.width - 2, box.y + box.height - 2],
    ];
    return points.map(([x, y]) => {
      const hit = document.elementFromPoint(x, y);
      return {
        belongsToControl: Boolean(hit?.closest('[data-cp1-control]')),
        tag: hit?.tagName ?? null,
        className: typeof hit?.className === 'string' ? hit.className : null,
      };
    });
  }, { box });
  expect(hitResults, JSON.stringify(hitResults)).toEqual(hitResults.map((result) => ({ ...result, belongsToControl: true })));
}

for (const configuration of configurations) {
  test(`${configuration.name}: CP-1 controls satisfy geometry, hit testing and viewport contracts`, async ({ page }) => {
    await page.setViewportSize({ width: configuration.width, height: configuration.height });
    await page.goto('?focus=Фантастика&tab=overview');

    const kpiTooltip = page.locator('.kpi .tooltip > button').first();
    await kpiTooltip.evaluate((element) => element.setAttribute('data-cp1-control', 'tooltip'));
    await expectAccessibleTarget(page, kpiTooltip);
    await kpiTooltip.click();
    const tooltipBox = await page.getByRole('tooltip').boundingBox();
    expect(tooltipBox).not.toBeNull();
    expect(tooltipBox.x).toBeGreaterThanOrEqual(0);
    expect(tooltipBox.y).toBeGreaterThanOrEqual(0);
    expect(tooltipBox.x + tooltipBox.width).toBeLessThanOrEqual(configuration.width);
    expect(tooltipBox.y + tooltipBox.height).toBeLessThanOrEqual(configuration.height);
    await page.keyboard.press('Escape');

    const headerActions = page.locator('.header-actions .button:visible');
    for (let index = 0; index < await headerActions.count(); index += 1) {
      const action = headerActions.nth(index);
      await action.evaluate((element) => element.setAttribute('data-cp1-control', 'header-action'));
      await expectAccessibleTarget(page, action);
    }

    const more = page.getByRole('button', { name: 'Ещё', exact: true });
    await more.evaluate((element) => element.setAttribute('data-cp1-control', 'navigation-more'));
    await expectAccessibleTarget(page, more);
    await more.click();
    await expect(page.getByRole('menu')).toBeVisible();
    await more.click();
    await expect(page.getByRole('menu')).toHaveCount(0);

    const calculation = page.getByRole('button', { name: /Пояснение расчёта для категории/ }).first();
    await calculation.scrollIntoViewIfNeeded();
    await calculation.evaluate((element) => element.setAttribute('data-cp1-control', 'calculation-tooltip'));
    await expectAccessibleTarget(page, calculation);
    const calculationBox = await calculation.boundingBox();
    const filterBox = await page.locator('.filter-shell').boundingBox();
    if (calculationBox && filterBox) {
      const overlaps = calculationBox.y < filterBox.y + filterBox.height
        && calculationBox.y + calculationBox.height > filterBox.y;
      expect(overlaps).toBe(false);
    }

    await calculation.click();
    const calculationTooltipBox = await page.getByRole('tooltip').boundingBox();
    expect(calculationTooltipBox).not.toBeNull();
    expect(calculationTooltipBox.y).toBeGreaterThanOrEqual(0);
    expect(calculationTooltipBox.y + calculationTooltipBox.height).toBeLessThanOrEqual(configuration.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}
