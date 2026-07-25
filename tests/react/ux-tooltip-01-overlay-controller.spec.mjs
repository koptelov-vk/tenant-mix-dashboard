import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const calculation = (page) => page.getByRole('button', { name: /Пояснение расчёта для категории/ }).first();
const quality = (page) => page.locator('.category-profile-quality-trigger').first();
const activeOverlay = (page) => page.locator('[data-pdf-exclude]:visible');

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
