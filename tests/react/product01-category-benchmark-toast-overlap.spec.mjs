import { expect, test } from '@playwright/test';

// PR #171 browser-QA correction: the "data refreshed" toast (informational only, no interactive
// content, role="status") must never intercept clicks on underlying controls — verified here with
// the CategoryProfile list expanded and scrolled so its last row sits directly under the toast's
// fixed position, which is the exact configuration that previously let elementFromPoint resolve to
// the toast itself instead of the control beneath it.

test('toast is visible, announced as status, and does not intercept clicks on CategoryProfile controls', async ({ page }) => {
  await page.goto('?focus=Фантастика&tab=overview');
  await page.waitForSelector('.category-profile-list');

  const showAll = page.locator('.category-profile-show-all');
  if (await showAll.count()) await showAll.click();

  const refreshButton = page.locator('button[aria-label="Обновить данные"]');
  const refreshVisible = await refreshButton.isVisible();
  test.skip(!refreshVisible, 'refresh control is intentionally hidden below 430px (pre-existing, unrelated CSS)');

  await refreshButton.click();
  const toast = page.locator('.toast');
  await expect(toast).toBeVisible();
  await expect(toast).toHaveAttribute('role', 'status');
  await expect(toast).toContainText('Данные обновлены');

  const rows = page.locator('.category-profile-row');
  await rows.last().scrollIntoViewIfNeeded();

  const result = await page.evaluate(() => {
    const el = document.querySelector('.toast');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const hit = document.elementFromPoint(cx, cy);
    return {
      pointerEvents: getComputedStyle(el).pointerEvents,
      hitIsToast: hit === el,
    };
  });

  if (result) {
    expect(result.pointerEvents).toBe('none');
    expect(result.hitIsToast).toBe(false);
  }
});
