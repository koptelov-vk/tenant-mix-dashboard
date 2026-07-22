import { test, expect } from '@playwright/test';

const configurations = [
  { name: 'portrait-320', width: 320, height: 700 },
  { name: 'portrait-375', width: 375, height: 812 },
  { name: 'portrait-390', width: 390, height: 844 },
  { name: 'portrait-430', width: 430, height: 932 },
  { name: 'landscape-844', width: 844, height: 390 },
  { name: 'desktop-1366', width: 1366, height: 900 },
];

// Corner probes are inset far enough that a border-radius up to ~12px cannot clip them into
// the rounded-off notch (inset >= radius * (1 - 1/sqrt(2)) keeps the probe inside the arc);
// this avoids false negatives from the corner rounding itself while staying close enough to
// the edge to still catch a neighboring control stealing the hit area.
const CORNER_INSET = 4;

/**
 * Verifies size, hit-test identity and (optionally) accessible name for one control.
 * Identity is proven via DOM containment against the control's own ElementHandle, so a
 * neighboring control's markup can never produce a false PASS: a hit that lands on another
 * element (even one also carrying an accessible name or role) fails belongsToControl.
 */
async function assertControlContract(page, locator, { accessibleName } = {}) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeVisible();

  if (accessibleName !== undefined) {
    const name = ((await locator.getAttribute('aria-label')) ?? '').trim();
    expect(name.length).toBeGreaterThan(0);
    if (accessibleName instanceof RegExp) expect(name).toMatch(accessibleName);
    else expect(name).toBe(accessibleName);
  }

  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);

  const elementHandle = await locator.elementHandle();
  const hitResults = await page.evaluate(({ box, el, inset }) => {
    const points = [
      [box.x + box.width / 2, box.y + box.height / 2],
      [box.x + inset, box.y + inset],
      [box.x + box.width - inset, box.y + inset],
      [box.x + inset, box.y + box.height - inset],
      [box.x + box.width - inset, box.y + box.height - inset],
    ];
    return points.map(([x, y]) => {
      const hit = document.elementFromPoint(x, y);
      return {
        belongsToControl: hit === el || el.contains(hit),
        tag: hit?.tagName ?? null,
        className: typeof hit?.className === 'string' ? hit.className : null,
      };
    });
  }, { box, el: elementHandle, inset: CORNER_INSET });

  expect(hitResults, JSON.stringify(hitResults)).toEqual(hitResults.map((result) => ({ ...result, belongsToControl: true })));
  return box;
}

async function assertNoStickyOcclusion(page, box) {
  const filterBox = await page.locator('.filter-shell').boundingBox();
  if (!box || !filterBox) return;
  const overlaps = box.y < filterBox.y + filterBox.height && box.y + box.height > filterBox.y;
  expect(overlaps).toBe(false);
}

function assertWithinViewport(box, configuration) {
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(configuration.width);
  expect(box.y + box.height).toBeLessThanOrEqual(configuration.height);
}

async function assertNoHorizontalOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

for (const configuration of configurations) {
  test(`${configuration.name}: CP-1 controls satisfy geometry, hit testing, accessible name and viewport contracts`, async ({ page }) => {
    await page.addInitScript(() => {
      window.__cp1ClipboardWrites = [];
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: (text) => { window.__cp1ClipboardWrites.push(text); return Promise.resolve(); } },
      });
    });
    await page.setViewportSize({ width: configuration.width, height: configuration.height });
    await page.goto('?focus=Фантастика&tab=overview');

    // 1. Generic KPI tooltip trigger — accessible name is the shared default label.
    const kpiTooltip = page.locator('.kpi .tooltip > button').first();
    await assertControlContract(page, kpiTooltip, { accessibleName: 'Показать методику' });
    await kpiTooltip.click();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toBeVisible();
    assertWithinViewport(await tooltip.boundingBox(), configuration);
    await page.keyboard.press('Escape');
    await expect(tooltip).toHaveCount(0);

    // 2. Header actions — each control has a distinct accessible name and a distinct action.
    // interactive-controls.css hides Reset filters / Refresh below 431px (export-actions.css
    // !important rules), so only assert full contract + behavior on controls that are actually
    // rendered visible for this viewport, and record the intentional hide otherwise.
    const savedViews = page.getByRole('button', { name: 'Сохранённые представления', exact: true });
    await assertControlContract(page, savedViews, { accessibleName: 'Сохранённые представления' });
    await savedViews.click();
    const savedViewsDialog = page.getByRole('dialog', { name: 'Сохранённые представления' });
    await expect(savedViewsDialog).toBeVisible();
    await savedViews.click();
    await expect(savedViewsDialog).toHaveCount(0);

    const exportTrigger = page.getByRole('button', { name: 'Экспорт текущего среза', exact: true });
    await assertControlContract(page, exportTrigger, { accessibleName: 'Экспорт текущего среза' });
    await exportTrigger.click();
    const exportDialog = page.getByRole('dialog', { name: 'Экспорт текущего среза' });
    await expect(exportDialog).toBeVisible();
    await exportTrigger.click();
    await expect(exportDialog).toHaveCount(0);

    const copyLink = page.getByRole('button', { name: 'Скопировать ссылку', exact: true });
    await assertControlContract(page, copyLink, { accessibleName: 'Скопировать ссылку' });
    await copyLink.click();
    const clipboardWrites = await page.evaluate(() => window.__cp1ClipboardWrites);
    expect(clipboardWrites.at(-1)).toBe(page.url());

    const resetFilters = page.getByRole('button', { name: 'Сбросить фильтры', exact: true });
    const refresh = page.getByRole('button', { name: 'Обновить данные', exact: true });

    if (await resetFilters.count()) {
      await assertControlContract(page, resetFilters, { accessibleName: 'Сбросить фильтры' });
      const categoryFilter = page.locator('.filter-bar > .searchable-filter').nth(2);
      await categoryFilter.locator('button.filter-control').click();
      await page.locator('.filter-options [role="option"]').first().click();
      await page.locator('.filter-popover-close').click();
      const activeChips = page.locator('.active-tags button');
      await expect(activeChips).toHaveCount(1);
      await resetFilters.click();
      await expect(activeChips).toHaveCount(0);
    } else {
      await expect(resetFilters).toHaveCount(0);
    }

    if (await refresh.count()) {
      await assertControlContract(page, refresh, { accessibleName: 'Обновить данные' });
      await refresh.click();
      await expect(page.locator('.toast[role="status"]')).toContainText('Данные обновлены');
    } else {
      await expect(refresh).toHaveCount(0);
    }

    // 3. Mobile "Ещё" navigation overflow trigger.
    const more = page.getByRole('button', { name: 'Ещё', exact: true });
    await assertControlContract(page, more, { accessibleName: 'Ещё' });
    await more.click();
    const moreMenu = page.getByRole('menu');
    await expect(moreMenu).toBeVisible();
    await more.click();
    await expect(moreMenu).toHaveCount(0);

    // 4. CategoryProfile calculation-tooltip trigger — dynamic per-category accessible name.
    const calculation = page.getByRole('button', { name: /^Пояснение расчёта для категории .+/ }).first();
    const calculationBox = await assertControlContract(page, calculation, { accessibleName: /^Пояснение расчёта для категории .+/ });
    await assertNoStickyOcclusion(page, calculationBox);
    await calculation.click();
    const calculationTooltip = page.getByRole('tooltip');
    await expect(calculationTooltip).toBeVisible();
    assertWithinViewport(await calculationTooltip.boundingBox(), configuration);
    await page.keyboard.press('Escape');
    await expect(calculationTooltip).toHaveCount(0);

    // 5. Category quality disclosure trigger — dynamic per-category accessible name, opens a dialog.
    const quality = page.locator('.category-profile-quality-trigger').first();
    const qualityBox = await assertControlContract(page, quality, { accessibleName: /^Показать качество данных категории .+/ });
    await assertNoStickyOcclusion(page, qualityBox);
    await quality.click();
    const qualityDialog = page.locator('.category-profile-quality-popover');
    await expect(qualityDialog).toBeVisible();
    await expect(qualityDialog).toHaveAttribute('aria-label', /^Качество данных категории .+/);
    await qualityDialog.locator('button[aria-label="Закрыть сведения о качестве данных"]').click();
    await expect(qualityDialog).toHaveCount(0);

    await assertNoHorizontalOverflow(page);
  });
}
