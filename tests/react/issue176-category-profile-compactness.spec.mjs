import { expect, test } from '@playwright/test';

const dashboardUrl = '?focus=Фантастика&group=same-class&tab=overview';

function intersects(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

test.describe('Issue #176: CategoryProfile compactness and readability', () => {
  test('collapsed profile is compact, non-overlapping, and horizontally contained', async ({ page }) => {
    await page.goto(dashboardUrl);
    const profile = page.locator('.category-profile-list');
    await expect(profile).toBeVisible();

    await expect(page.locator('.category-profile-row')).toHaveCount(21);
    await expect(page.locator('.category-profile-row.category-profile-row-collapsed')).toHaveCount(17);
    await expect(page.locator('.category-profile-show-all')).toHaveAttribute('aria-expanded', 'false');

    const geometry = await page.evaluate(() => {
      const profile = document.querySelector('.category-profile-list');
      const visibleRows = [...document.querySelectorAll('.category-profile-row')]
        .filter((row) => getComputedStyle(row).display !== 'none');
      const controls = [...document.querySelectorAll(
        '.category-profile-row:not(.category-profile-row-collapsed) .category-profile-quality-trigger, '
        + '.category-profile-row:not(.category-profile-row-collapsed) .category-profile-tooltip summary',
      )];
      return {
        profileHeight: profile.getBoundingClientRect().height,
        visibleRows: visibleRows.length,
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        controls: controls.map((control) => {
          const rect = control.getBoundingClientRect();
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
        }),
      };
    });

    expect(geometry.visibleRows).toBe(4);
    expect(geometry.scrollWidth).toBe(geometry.clientWidth);
    // Production baseline was 2,034–2,526 px on mobile; 1,300 px preserves
    // readable 44 px controls while enforcing a material compactness gain.
    expect(geometry.profileHeight).toBeLessThanOrEqual(geometry.clientWidth <= 640 ? 1300 : 850);
    for (const control of geometry.controls) {
      expect(control.width).toBeGreaterThanOrEqual(44);
      expect(control.height).toBeGreaterThanOrEqual(44);
    }
    for (let left = 0; left < geometry.controls.length; left += 1) {
      for (let right = left + 1; right < geometry.controls.length; right += 1) {
        expect(intersects(geometry.controls[left], geometry.controls[right])).toBe(false);
      }
    }
  });

  test('show-all exposes the last row and supports direct collapse', async ({ page }) => {
    await page.goto(dashboardUrl);
    const toggle = page.locator('.category-profile-show-all');
    await toggle.click();
    await expect(toggle).toHaveText('Свернуть');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.category-profile-row.category-profile-row-collapsed')).toHaveCount(0);
    await expect(page.locator('.category-profile-row').last()).toBeVisible();

    await toggle.click();
    await expect(toggle).toContainText('Показать все 21 категорий');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.category-profile-row.category-profile-row-collapsed')).toHaveCount(17);
  });
});
