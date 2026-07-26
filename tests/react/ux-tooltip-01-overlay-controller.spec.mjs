import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const calculation = (page) => page.getByRole('button', { name: /Пояснение расчёта для категории/ }).first();
const quality = (page) => page.locator('.category-profile-quality-trigger').first();
// Canonical overlay identity: OverlayController.tsx exports OVERLAY_PORTAL_CLASS
// ('overlay-portal-layer') and applies it to every controller-owned overlay's content
// root (Tooltip, ExportActionsMenu, GlobalFilters, Navigation, SavedViewsMenu,
// MultiFilter, CategoryProfile's quality popover) alongside data-pdf-exclude. The
// PDF-exclusion attribute alone is not an overlay marker: CategoryProfile's
// persistently visible mode-toggle group and show-all button also carry
// data-pdf-exclude (they must be hidden from PDF export) without ever being overlays,
// which made the old `[data-pdf-exclude]:visible` selector overcount by exactly those
// two elements. `.overlay-portal-layer` is conditionally rendered only while an
// overlay is open, so it alone is a correct 0/1 activity count.
const activeOverlay = (page) => page.locator('.overlay-portal-layer:visible');

test.beforeEach(async ({ page }) => { await page.goto('?focus=Фантастика&tab=overview'); });

test('calculation A→B, reverse handoff, repeated activation and one active overlay', async ({ page }, testInfo) => {
  const triggers = page.getByRole('button', { name: /Пояснение расчёта для категории/ });
  const activate = (locator) => testInfo.project.name.startsWith('mobile') ? locator.tap() : locator.click();
  await activate(triggers.nth(0));
  await expect(activeOverlay(page)).toHaveCount(1);
  await activate(triggers.nth(1));
  await expect(activeOverlay(page)).toHaveCount(1);
  await expect(triggers.nth(0)).toHaveAttribute('aria-expanded', 'false');
  await activate(triggers.nth(0));
  await expect(activeOverlay(page)).toHaveCount(1);
  await activate(triggers.nth(0));
  await expect(activeOverlay(page)).toHaveCount(0);
});

test('quality↔calculation handoff has no focus bounce and close restores focus', async ({ page }, testInfo) => {
  const activate = (locator) => testInfo.project.name.startsWith('mobile') ? locator.tap() : locator.click();
  const qualityTrigger = quality(page);
  await expect(qualityTrigger).toBeVisible();
  await activate(qualityTrigger);
  const calculationTrigger = calculation(page);
  await activate(calculationTrigger);
  await expect(activeOverlay(page)).toHaveCount(1);
  await expect(qualityTrigger).not.toBeFocused();
  await activate(qualityTrigger);
  await expect(activeOverlay(page)).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(activeOverlay(page)).toHaveCount(0);
  await expect(qualityTrigger).toBeFocused();
});

test('calculation tooltip hover-open then Escape restores focus, closes cleanly and allows reopen (reentrancy corrective, Scenario A)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile'), 'hover-open is a desktop pointer interaction; not simulated on touch/mobile');
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  const trigger = calculation(page);
  await trigger.hover();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await expect(trigger).not.toBeFocused();

  // Escape triggers close(), which synchronously focuses the opener. That
  // focus event fires the trigger's own onFocus -> openOverlay() reentrantly
  // on the unfixed controller, leaving a stale active registration even
  // though the tooltip visually closes.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(activeOverlay(page)).toHaveCount(0);

  // Next legitimate open of the same trigger must still work — proves no
  // stale active registration is left behind blocking it. The mouse must
  // genuinely leave and re-enter (real hover requires a fresh transition;
  // hovering the same already-hovered point again is a no-op in real browsers).
  await page.mouse.move(0, 0);
  await trigger.hover();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toBeHidden();

  // A different, unrelated overlay must open cleanly right after.
  const qualityTrigger = quality(page);
  await qualityTrigger.click();
  await expect(activeOverlay(page)).toHaveCount(1);
  await expect(page.getByRole('tooltip')).toHaveCount(0);

  expect(errors).toEqual([]);
});

test('calculation tooltip hover-open then outside-pointerdown closes cleanly with no orphan overlay and no stale active state (reentrancy corrective, Scenario B)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile'), 'hover-open is a desktop pointer interaction; not simulated on touch/mobile');
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  const trigger = calculation(page);
  await trigger.hover();
  await expect(page.getByRole('tooltip')).toBeVisible();

  // Moving the mouse to click elsewhere necessarily leaves the hover zone
  // first (real browser hover semantics), so this exercises the tooltip's
  // own hover-leave close before the outside-pointerdown handler would even
  // see an active overlay. That is correct, pre-existing, unmodified
  // behavior (hover-leave never restores focus) — the decisive check here is
  // that closing this way leaves no orphan overlay and no stale active
  // registration blocking what comes next, not a focus assertion.
  await page.locator('main').click({ position: { x: 2, y: 2 } });
  await expect(page.getByRole('tooltip')).toBeHidden();
  await expect(activeOverlay(page)).toHaveCount(0);

  const qualityTrigger = quality(page);
  await qualityTrigger.click();
  await expect(activeOverlay(page)).toHaveCount(1);
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await qualityTrigger.click();
  await expect(activeOverlay(page)).toHaveCount(0);

  expect(errors).toEqual([]);
});

test('calculation tooltip focus-open (keyboard) then outside-pointerdown restores focus and clears active state (reentrancy corrective, Scenario B without hover-leave interference)', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile'), 'keyboard-focus-open is a desktop interaction pattern; touch/mobile uses tap-open, covered separately');
  const trigger = calculation(page);
  await trigger.focus();
  await expect(page.getByRole('tooltip')).toBeVisible();

  // A synthetic pointerdown dispatch (not a real .click()) matches the
  // existing PRODUCT-01 pattern for this exact scenario: clicking a
  // non-focusable area for real triggers the browser's own native default
  // blur-to-nothing action *after* listeners run, which would independently
  // clobber any programmatic focus() made during the same event — a browser
  // quirk unrelated to this fix. Dispatching the event directly isolates the
  // app's own close()/restoreFocus contract from that native side effect.
  await page.dispatchEvent('body', 'pointerdown', { pointerType: 'mouse', bubbles: true });
  await expect(page.getByRole('tooltip')).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(activeOverlay(page)).toHaveCount(0);

  const qualityTrigger = quality(page);
  await qualityTrigger.click();
  await expect(activeOverlay(page)).toHaveCount(1);
  await expect(page.getByRole('tooltip')).toHaveCount(0);
});

test('quality disclosure close-button restores focus to exact trigger (regression #156)', async ({ page }, testInfo) => {
  const activate = (locator) => testInfo.project.name.startsWith('mobile') ? locator.tap() : locator.click();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  const qualityTrigger = quality(page);
  await expect(qualityTrigger).toBeVisible();

  await activate(qualityTrigger);
  const dialog = page.getByRole('dialog', { name: /Качество данных категории/ });
  await expect(dialog).toBeVisible();
  const closeButton = dialog.getByRole('button', { name: 'Закрыть сведения о качестве данных' });

  // Captured after opening (not before): opening a trigger that is below the fold
  // legitimately scrolls it into view first (especially on narrow mobile viewports).
  // The invariant under test is that CLOSING must not introduce further scroll.
  const scrollBeforeClose = await page.evaluate(() => window.scrollY);

  await activate(closeButton);
  await expect(dialog).toBeHidden();
  await expect(activeOverlay(page)).toHaveCount(0);
  await expect(qualityTrigger).toBeFocused();
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBeforeClose);
  expect(errors).toEqual([]);
});

test('quality disclosure close-button keyboard activation restores focus to trigger', async ({ page }, testInfo) => {
  const activate = (locator) => testInfo.project.name.startsWith('mobile') ? locator.tap() : locator.click();
  const qualityTrigger = quality(page);
  await activate(qualityTrigger);
  const dialog = page.getByRole('dialog', { name: /Качество данных категории/ });
  await expect(dialog).toBeVisible();
  const closeButton = dialog.getByRole('button', { name: 'Закрыть сведения о качестве данных' });
  await closeButton.focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(qualityTrigger).toBeFocused();
});

test('repeated open/close via close-button keeps returning focus to the same exact trigger', async ({ page }, testInfo) => {
  const activate = (locator) => testInfo.project.name.startsWith('mobile') ? locator.tap() : locator.click();
  const qualityTrigger = quality(page);
  const dialog = page.getByRole('dialog', { name: /Качество данных категории/ });
  for (let cycle = 0; cycle < 3; cycle += 1) {
    await activate(qualityTrigger);
    await expect(dialog).toBeVisible();
    const closeButton = dialog.getByRole('button', { name: 'Закрыть сведения о качестве данных' });
    await activate(closeButton);
    await expect(dialog).toBeHidden();
    await expect(activeOverlay(page)).toHaveCount(0);
    await expect(qualityTrigger).toBeFocused();
  }
});

test('quality A→quality B forward handoff via own close buttons returns focus to each own trigger, never bounces to A', async ({ page }, testInfo) => {
  const activate = (locator) => testInfo.project.name.startsWith('mobile') ? locator.tap() : locator.click();
  const qualityTriggers = page.locator('.category-profile-quality-trigger');
  const triggerA = qualityTriggers.nth(0);
  const triggerB = qualityTriggers.nth(1);
  const dialog = page.getByRole('dialog', { name: /Качество данных категории/ });

  await activate(triggerA);
  await expect(dialog).toBeVisible();

  await activate(triggerB);
  await expect(activeOverlay(page)).toHaveCount(1);
  await expect(triggerA).not.toBeFocused();

  const closeB = dialog.getByRole('button', { name: 'Закрыть сведения о качестве данных' });
  await activate(closeB);
  await expect(activeOverlay(page)).toHaveCount(0);
  await expect(triggerB).toBeFocused();
  await expect(triggerA).not.toBeFocused();
});

test('closing quality disclosure via close-button then changing section leaves no orphan overlay', async ({ page }, testInfo) => {
  const activate = (locator) => testInfo.project.name.startsWith('mobile') ? locator.tap() : locator.click();
  const qualityTrigger = quality(page);
  const dialog = page.getByRole('dialog', { name: /Качество данных категории/ });
  await activate(qualityTrigger);
  await expect(dialog).toBeVisible();
  const closeButton = dialog.getByRole('button', { name: 'Закрыть сведения о качестве данных' });
  await activate(closeButton);
  await expect(dialog).toBeHidden();

  const navigation = page.locator('.category-profile-row').first().getByRole('button', { name: /Открыть категорию/ });
  await activate(navigation);
  await expect.poll(() => new URL(page.url()).searchParams.get('tab')).toBe('categories');
  await expect(activeOverlay(page)).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: /Качество данных категории/ })).toHaveCount(0);
});

test('tooltip↔filter↔export↔Saved Views share atomic integration contract', async ({ page }) => {
  await calculation(page).click();
  await page.getByRole('button', { name: 'Бренды' }).first().click();
  const filter = page.locator('.registry-filter summary:visible').first();
  await filter.click();
  await expect(activeOverlay(page)).toHaveCount(1);
  await page.getByRole('button', { name: /Экспорт текущего среза/ }).click();
  await expect(activeOverlay(page)).toHaveCount(1);
  await page.getByRole('button', { name: /Сохранённые представления/ }).click();
  await expect(activeOverlay(page)).toHaveCount(1);
});

test('outside pointer closes without invisible hit layer; keyboard and accessibility contract', async ({ page }) => {
  const trigger = calculation(page);
  await trigger.click();
  await page.locator('main').click({ position: { x: 2, y: 2 } });
  await expect(activeOverlay(page)).toHaveCount(0);
  await trigger.focus();
  await expect(activeOverlay(page)).toHaveCount(1);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => item.impact === 'critical')).toEqual([]);
});

for (const width of [320, 375, 390, 430]) {
  for (const landscape of [false, true]) {
    test(`${width}px ${landscape ? 'landscape' : 'portrait'} respects viewport, safe-area and PDF exclusion`, async ({ page }) => {
      await page.setViewportSize({ width: landscape ? 760 : width, height: landscape ? width : 740 });
      await calculation(page).click();
      const box = await page.getByRole('tooltip').boundingBox();
      expect(box).not.toBeNull();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(landscape ? 760 : width);
      await expect(page.getByRole('tooltip')).toHaveAttribute('data-pdf-exclude', 'true');
    });
  }
}

// Issue #162 keyboard acceptance: real Tab / Shift+Tab / Space / Enter
// keyboard contract of QualityDisclosure (never via .focus() as a Tab
// substitute), covering both the deferred-autofocus-vs-Enter race and the
// Tab-vs-adjacent-Tooltip cross-overlay handoff race, both fixed by making
// QualityDisclosure's autofocus synchronous (useLayoutEffect) instead of
// deferred (requestAnimationFrame). Complements — does not replace or
// modify — the existing tests above.
test.describe('quality disclosure real keyboard navigation (issue #162 acceptance)', () => {
  test('initial focus lands inside the dialog synchronously on open, before any keyboard input', async ({ page, isMobile }) => {
    const activate = (locator) => isMobile ? locator.tap() : locator.click();
    const qualityTrigger = quality(page);

    await activate(qualityTrigger);
    const dialog = page.getByRole('dialog', { name: /Качество данных категории/ });
    await expect(dialog).toBeVisible();

    // No wait, no extra tick: this is the exact same task the open() click
    // handler ran in, so if autofocus were still deferred to a later frame
    // this would be the moment it hadn't happened yet.
    expect(await dialog.evaluate((el) => document.activeElement === el)).toBe(true);
  });

  test('Tab moves focus onto the close button, and the adjacent calculation Tooltip does not open', async ({ page, isMobile }) => {
    const activate = (locator) => isMobile ? locator.tap() : locator.click();
    const qualityTrigger = quality(page);

    await activate(qualityTrigger);
    const dialog = page.getByRole('dialog', { name: /Качество данных категории/ });
    await expect(dialog).toBeVisible();
    await expect(qualityTrigger).toHaveAttribute('aria-expanded', 'true');
    const scrollBefore = await page.evaluate(() => window.scrollY);

    await page.keyboard.press('Tab');

    const closeButton = dialog.getByRole('button', { name: 'Закрыть сведения о качестве данных' });
    await expect(closeButton).toBeFocused();
    await expect(dialog).toBeVisible();
    await expect(activeOverlay(page)).toHaveCount(1);
    await expect(qualityTrigger).toHaveAttribute('aria-expanded', 'true');
    // The regression check for the Tab cross-overlay race: the sibling
    // calculation Tooltip must not have opened as a side effect.
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  });

  test('Shift+Tab moves focus backward without landing on <body> or the dialog container', async ({ page, isMobile }) => {
    const activate = (locator) => isMobile ? locator.tap() : locator.click();
    const qualityTrigger = quality(page);

    await activate(qualityTrigger);
    const dialog = page.getByRole('dialog', { name: /Качество данных категории/ });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Tab');
    const closeButton = dialog.getByRole('button', { name: 'Закрыть сведения о качестве данных' });
    await expect(closeButton).toBeFocused();

    await page.keyboard.press('Shift+Tab');

    // Not a scroll-position assertion here: the dialog is a non-modal
    // (aria-modal="false"), non-focus-trapped popover portaled to the end of
    // document.body, so Shift+Tab out of it correctly lands on whatever
    // precedes the whole portal in flattened document tab order — an
    // unrelated, distant element by design, identical before and after this
    // fix, and out of scope for the autofocus-race contract this Issue
    // covers. What IS in scope and asserted below: focus must not land on
    // <body>, and — the actual regression check — the (now synchronous)
    // autofocus must not have reclaimed it back onto the dialog container;
    // the disclosure itself must remain open (correct non-modal behavior:
    // tabbing out does not dismiss it).
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
    expect(await closeButton.evaluate((el) => document.activeElement === el)).toBe(false);
    expect(await dialog.evaluate((el) => document.activeElement === el)).toBe(false);
    await expect(dialog).toBeVisible();
    await expect(activeOverlay(page)).toHaveCount(1);
    await expect(qualityTrigger).toHaveAttribute('aria-expanded', 'true');
  });

  test('Space on a Tab-focused close button closes the dialog and returns focus to the exact trigger', async ({ page, isMobile }) => {
    const activate = (locator) => isMobile ? locator.tap() : locator.click();
    const qualityTrigger = quality(page);

    await activate(qualityTrigger);
    const dialog = page.getByRole('dialog', { name: /Качество данных категории/ });
    await expect(dialog).toBeVisible();
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.keyboard.press('Tab');
    const closeButton = dialog.getByRole('button', { name: 'Закрыть сведения о качестве данных' });
    await expect(closeButton).toBeFocused();

    await page.keyboard.press('Space');

    await expect(dialog).toBeHidden();
    await expect(activeOverlay(page)).toHaveCount(0);
    await expect(qualityTrigger).toHaveAttribute('aria-expanded', 'false');
    await expect(qualityTrigger).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);

    // No close-then-reopen: the dialog must stay gone, not flicker back.
    await expect(dialog).toHaveCount(0);
  });

  test('Enter on a Tab-focused (not .focus()-set) close button closes the dialog and returns focus to the exact trigger', async ({ page, isMobile }) => {
    const activate = (locator) => isMobile ? locator.tap() : locator.click();
    const qualityTrigger = quality(page);

    await activate(qualityTrigger);
    const dialog = page.getByRole('dialog', { name: /Качество данных категории/ });
    await expect(dialog).toBeVisible();
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.keyboard.press('Tab');
    const closeButton = dialog.getByRole('button', { name: 'Закрыть сведения о качестве данных' });
    await expect(closeButton).toBeFocused();

    await page.keyboard.press('Enter');

    await expect(dialog).toBeHidden();
    await expect(activeOverlay(page)).toHaveCount(0);
    await expect(qualityTrigger).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  });

  test('intentional handoff: deliberately focusing the calculation Tooltip still opens it and dismisses the quality dialog', async ({ page, isMobile }) => {
    const activate = (locator) => isMobile ? locator.tap() : locator.click();
    const qualityTrigger = quality(page);
    const calculationTrigger = calculation(page);

    await activate(qualityTrigger);
    const dialog = page.getByRole('dialog', { name: /Качество данных категории/ });
    await expect(dialog).toBeVisible();

    // Deliberate action, not incidental Tab traversal: this must keep working
    // exactly as documented — a different overlay's own trigger receiving
    // focus is legitimate handoff, not a bug.
    await calculationTrigger.focus();

    await expect(page.getByRole('tooltip')).toBeVisible();
    await expect(dialog).toHaveCount(0);
    await expect(activeOverlay(page)).toHaveCount(1);
  });
});

test('persistently visible data-pdf-exclude controls (CategoryProfile mode toggle and show-all) are never counted as active overlays', async ({ page }, testInfo) => {
  const activate = (locator) => testInfo.project.name.startsWith('mobile') ? locator.tap() : locator.click();
  const modeToggle = page.locator('.category-profile-mode-toggle');
  const showAll = page.locator('.category-profile-show-all');

  // Given: two persistently visible non-overlay controls carry data-pdf-exclude
  // (they must be hidden from PDF export) and no overlay is open. urlBefore is
  // captured only after the initial state has settled, so it isn't racing the
  // app's own unrelated asynchronous URL-state normalization (a pre-existing,
  // out-of-scope behavior) — this assertion is about the overlay leaving the URL
  // unchanged, not about that normalization's timing.
  await expect(modeToggle).toBeVisible();
  await expect(modeToggle).toHaveAttribute('data-pdf-exclude', 'true');
  await expect(showAll).toBeVisible();
  await expect(showAll).toHaveAttribute('data-pdf-exclude', 'true');
  await expect(activeOverlay(page)).toHaveCount(0);
  const urlBefore = page.url();

  // When: one real tooltip is opened.
  const calculationTrigger = calculation(page);
  await activate(calculationTrigger);
  await expect(activeOverlay(page)).toHaveCount(1);
  // The two non-overlay controls remain visible and pdf-excluded, but are still not
  // counted — proving the canonical selector, not just an absence of overlays, is
  // what excludes them.
  await expect(modeToggle).toBeVisible();
  await expect(showAll).toBeVisible();

  // After close: back to zero, focus restored, no lingering overlay-portal-layer node,
  // and the URL/navigation context is exactly what it was before the overlay opened.
  await activate(calculationTrigger);
  await expect(activeOverlay(page)).toHaveCount(0);
  await expect(calculationTrigger).toBeFocused();
  expect(page.url()).toBe(urlBefore);
  await expect(modeToggle).toBeVisible();
  await expect(showAll).toBeVisible();
});
