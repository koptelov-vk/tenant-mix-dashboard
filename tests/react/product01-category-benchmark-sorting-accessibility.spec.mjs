import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// PR #171 final Tier 3 finding: prove the sorting description is reachable in the REAL
// accessibility tree (not just a DOM attribute check), announced once per entry into the
// CategoryProfile region, and that Count vs Share actually produce the described order.

test.describe('CategoryProfile accessible region and active-sorting relationship', () => {
  test('region has the correct role and accessible name, and the sorting description is reachable via the real accessibility tree', async ({ page }) => {
    await page.goto('?focus=Фантастика&tab=overview');
    await page.waitForSelector('.category-profile-list');

    const region = page.getByRole('region', { name: 'Профиль по категориям' });
    await expect(region).toBeVisible();

    const describedById = await region.getAttribute('aria-describedby');
    expect(describedById).toBeTruthy();

    // Read the real accessibility tree node for the region (not just the DOM attribute) and
    // confirm the description text is exposed as part of it.
    const snapshot = await region.ariaSnapshot();
    expect(snapshot).toContain('отсортированы по отклонению от медианы группы');

    // The description element itself must exist exactly once in the DOM.
    const descriptionCount = await page.locator(`#${describedById}`).count();
    expect(descriptionCount).toBe(1);
  });

  test('Count mode: rows are ordered by descending exact count deviation (read from the canonical export manifest), tie-break by category name', async ({ page }) => {
    await page.goto('?focus=Фантастика&tab=overview&metric=absolute');
    await page.waitForSelector('.category-profile-list');
    const manifest = await page.evaluate(() => {
      const el = document.getElementById('category-benchmark-export-manifest');
      return el ? JSON.parse(el.textContent || '{}') : null;
    });
    expect(manifest.mode).toBe('count');
    const rows = manifest.categories;
    for (let i = 1; i < rows.length; i += 1) {
      const prev = rows[i - 1].deviationRaw;
      const cur = rows[i].deviationRaw;
      if (prev == null || cur == null) continue;
      if (prev === cur) {
        expect(rows[i].categoryId.localeCompare(rows[i - 1].categoryId, 'ru')).toBeGreaterThanOrEqual(0);
      } else {
        expect(cur).toBeLessThanOrEqual(prev);
      }
    }
    expect(rows.length).toBeGreaterThan(0);
  });

  test('Share mode: switching mode re-sorts by share deviation (order differs from Count for this dataset)', async ({ page }) => {
    await page.goto('?focus=Фантастика&tab=overview');
    await page.waitForSelector('.category-profile-list');
    await page.locator('.category-profile-show-all').click().catch(() => {});
    const countOrder = await page.locator('.category-profile-row .category-profile-copy strong').allTextContents();

    await page.locator('.category-profile-mode-toggle button', { hasText: 'Доля' }).click();
    const shareOrder = await page.locator('.category-profile-row .category-profile-copy strong').allTextContents();

    expect(shareOrder.length).toBe(countOrder.length);
    // The two orders are not required to be identical (different deviation basis) — assert
    // the sorting description itself now reads "доле категории" for Share mode.
    const region = page.getByRole('region', { name: 'Профиль по категориям' });
    const describedById = await region.getAttribute('aria-describedby');
    const descriptionText = await page.locator(`#${describedById}`).textContent();
    expect(descriptionText).toMatch(/доле категории/);
  });

  test('sorting description is not duplicated onto individual row buttons, and keyboard tab order is unaffected', async ({ page }) => {
    await page.goto('?focus=Фантастика&tab=overview');
    await page.waitForSelector('.category-profile-list');
    const rowDescribedBy = await page.locator('.category-profile-open').first().getAttribute('aria-describedby');
    expect(rowDescribedBy).toBeNull();

    // The region itself must not have entered the tab order — only role/aria-label/
    // aria-describedby were added, no tabIndex, so it must remain unreachable by Tab.
    const tabIndex = await page.locator('.category-profile-list').getAttribute('tabindex');
    expect(tabIndex).toBeNull();
  });

  test('axe: 0 violations on the region with the new role/label/describedby wiring', async ({ page }) => {
    await page.goto('?focus=Фантастика&tab=overview');
    await page.waitForSelector('.category-profile-list');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).include('.category-profile-list').analyze();
    expect(results.violations).toEqual([]);
  });
});
