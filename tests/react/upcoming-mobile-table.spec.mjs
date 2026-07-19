import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('upcoming uses one four-column table with internal horizontal scroll', async ({ page }, testInfo) => {
  await page.goto('?tab=upcoming');
  const region = page.getByRole('region', { name: /Таблица будущих открытий/ });
  const table = region.getByRole('table');
  await expect(table).toBeVisible();
  await expect(table.getByRole('columnheader')).toHaveCount(4);
  for (const label of ['Объект', 'Бренд', 'Категория', 'Источник']) {
    await expect(table.getByRole('button', { name: label, exact: true })).toBeVisible();
  }
  await expect(page.locator('.upcoming-table tr').first()).not.toHaveCSS('display', 'grid');

  const geometry = await page.evaluate(() => {
    const region = document.querySelector('.upcoming-table-scroll');
    const sticky = document.querySelector('.upcoming-table tbody th[scope="row"]');
    if (!(region instanceof HTMLElement) || !(sticky instanceof HTMLElement)) throw new Error('Upcoming table geometry is unavailable');
    return {
      pageWidth: document.documentElement.clientWidth,
      pageScrollWidth: document.documentElement.scrollWidth,
      regionClientWidth: region.clientWidth,
      regionScrollWidth: region.scrollWidth,
      stickyPosition: getComputedStyle(sticky).position,
      stickyLeft: getComputedStyle(sticky).left,
      stickyBackground: getComputedStyle(sticky).backgroundColor,
    };
  });
  expect(geometry.pageScrollWidth).toBeLessThanOrEqual(geometry.pageWidth + 1);
  expect(geometry.regionScrollWidth).toBeGreaterThanOrEqual(geometry.regionClientWidth);
  expect(geometry.stickyPosition).toBe('sticky');
  expect(geometry.stickyLeft).toBe('0px');
  expect(geometry.stickyBackground).not.toBe('rgba(0, 0, 0, 0)');

  const source = table.getByRole('link', { name: /Открыть источник/ }).first();
  if (await source.count()) {
    const box = await source.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    await expect(source).toHaveAttribute('target', '_blank');
    await expect(source).toHaveAttribute('rel', /noopener/);
  }

  if (testInfo.project.name.startsWith('mobile')) {
    await region.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
    expect(await region.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  }

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.filter((item) => item.impact === 'critical')).toEqual([]);
});
