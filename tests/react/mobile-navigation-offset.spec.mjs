import { expect, test } from '@playwright/test';

const mobileSizes = [
  { width: 320, height: 568, orientation: 'portrait' },
  { width: 375, height: 812, orientation: 'portrait' },
  { width: 390, height: 844, orientation: 'portrait' },
  { width: 430, height: 932, orientation: 'portrait' },
  { width: 568, height: 320, orientation: 'landscape' },
  { width: 812, height: 375, orientation: 'landscape' },
  { width: 844, height: 390, orientation: 'landscape' },
  { width: 932, height: 430, orientation: 'landscape' },
];

async function readHeaderContract(page) {
  return page.evaluate(() => {
    const header = document.querySelector('.app-header');
    const headerTop = document.querySelector('.header-top');
    const navigation = document.querySelector('.navigation');
    const main = document.getElementById('main-content');
    if (!(header instanceof HTMLElement)
      || !(headerTop instanceof HTMLElement)
      || !(navigation instanceof HTMLElement)
      || !(main instanceof HTMLElement)) {
      throw new Error('Mobile header geometry is unavailable');
    }

    const rootStyle = getComputedStyle(document.documentElement);
    const headerRect = header.getBoundingClientRect();
    const mainRect = main.getBoundingClientRect();
    return {
      headerHeight: headerRect.height,
      headerBottom: headerRect.bottom,
      headerTopHeight: headerTop.getBoundingClientRect().height,
      navigationHeight: navigation.getBoundingClientRect().height,
      canonicalOffset: Number.parseFloat(rootStyle.getPropertyValue('--mobile-header-offset')) || 0,
      scrollPaddingTop: Number.parseFloat(rootStyle.scrollPaddingTop) || 0,
      mainScrollMarginTop: Number.parseFloat(getComputedStyle(main).scrollMarginTop) || 0,
      mainTop: mainRect.top,
      bodyOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

async function assertTargetBelowHeader(page, selector) {
  await page.locator(selector).first().evaluate((element) => element.scrollIntoView({ block: 'start' }));
  await expect.poll(() => page.locator(selector).first().evaluate((target) => {
    const header = document.querySelector('.app-header');
    if (!(header instanceof HTMLElement) || !(target instanceof HTMLElement)) return false;
    return target.getBoundingClientRect().top >= header.getBoundingClientRect().bottom - 1;
  })).toBe(true);
}

test.describe('Issue #83 mobile header/navigation offset', () => {
  test.skip(({ browserName }) => !['chromium', 'webkit'].includes(browserName));

  for (const size of mobileSizes) {
    test(`${size.width}x${size.height} ${size.orientation}: one measured offset protects anchor targets`, async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto('?focus=Фантастика&tab=overview');
      await page.waitForSelector('.app-header');
      await expect.poll(() => page.evaluate(() => Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--mobile-header-offset'),
      ) || 0)).toBeGreaterThan(0);

      await page.locator('.skip-link').focus();
      await page.keyboard.press('Enter');
      await expect.poll(() => page.evaluate(() => window.location.hash)).toBe('#main-content');

      const geometry = await readHeaderContract(page);
      expect.soft(geometry.headerHeight).toBeCloseTo(
        geometry.headerTopHeight + geometry.navigationHeight + 1,
        0,
      );
      expect.soft(geometry.canonicalOffset).toBeCloseTo(geometry.headerHeight, 0);
      expect.soft(geometry.scrollPaddingTop).toBeCloseTo(geometry.canonicalOffset, 0);
      expect.soft(geometry.mainScrollMarginTop).toBeCloseTo(geometry.canonicalOffset, 0);
      expect.soft(geometry.mainTop).toBeGreaterThanOrEqual(geometry.headerBottom);
      expect.soft(geometry.bodyOverflow).toBeLessThanOrEqual(0);
    });
  }

  test('section navigation, Back/Forward and disclosure targets use the same offset', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('?focus=Фантастика&tab=overview');
    await page.waitForSelector('.app-header');

    const disclosure = page.locator('summary', { hasText: 'Метод расчёта сопоставимости' });
    await disclosure.evaluate((element) => element.scrollIntoView({ block: 'start' }));
    let targetGeometry = await page.evaluate(() => {
      const header = document.querySelector('.app-header');
      const target = [...document.querySelectorAll('summary')].find(
        (element) => element.textContent?.includes('Метод расчёта сопоставимости'),
      );
      if (!(header instanceof HTMLElement) || !(target instanceof HTMLElement)) {
        throw new Error('Disclosure geometry is unavailable');
      }
      return {
        headerBottom: header.getBoundingClientRect().bottom,
        targetTop: target.getBoundingClientRect().top,
      };
    });
    expect(targetGeometry.targetTop).toBeGreaterThanOrEqual(targetGeometry.headerBottom);
    await disclosure.click();
    await expect(page.getByRole('region', { name: 'Метод расчёта сопоставимости' })).toBeVisible();
    await disclosure.click();
    await expect(page.getByRole('region', { name: 'Метод расчёта сопоставимости' })).toBeHidden();

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.locator('.app-header').getByRole('button', { name: 'Категории', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Категории', exact: true })).toBeVisible();

    const assertMainBelowHeader = async () => {
      await expect.poll(() => page.evaluate(() => {
        const header = document.querySelector('.app-header');
        const main = document.getElementById('main-content');
        if (!(header instanceof HTMLElement) || !(main instanceof HTMLElement)) return false;
        return main.getBoundingClientRect().top >= header.getBoundingClientRect().bottom - 1;
      })).toBe(true);
    };
    await assertMainBelowHeader();

    await page.goBack();
    await expect(page.locator('.app-header').getByRole('button', { name: 'Сравнение', exact: true })).toHaveAttribute('aria-current', 'page');
    await assertMainBelowHeader();

    await page.goForward();
    await expect(page.locator('.app-header').getByRole('button', { name: 'Категории', exact: true })).toHaveAttribute('aria-current', 'page');
    await assertMainBelowHeader();
  });

  test('breadcrumbs, headings, global filters and table rows are protected scroll targets', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('?focus=Фантастика&tab=overview');
    await page.waitForSelector('.app-header');

    await assertTargetBelowHeader(page, '.filter-shell');
    await assertTargetBelowHeader(page, '.filter-shell .filter-control');

    await page.locator('.app-header').getByRole('button', { name: 'Категории', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Категории', exact: true })).toBeVisible();
    await assertTargetBelowHeader(page, '.page-heading h1');

    await page.locator('.app-header').getByRole('button', { name: 'Сопоставимость', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Сопоставимость объектов', exact: true })).toBeVisible();
    await assertTargetBelowHeader(page, '.comparison-table tbody tr');

    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator('.breadcrumbs')).toBeVisible();
    await assertTargetBelowHeader(page, '.breadcrumbs');
  });
});
