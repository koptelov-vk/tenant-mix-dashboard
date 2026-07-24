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

test('quality disclosure close-button restores focus to exact trigger (regression #156)', async ({ page }, testInfo) => {
  const activate = (locator) => testInfo.project.name.startsWith('mobile') ? locator.tap() : locator.click();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  const qualityTrigger = quality(page);
  await expect(qualityTrigger).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 200));
  const scrollBefore = await page.evaluate(() => window.scrollY);

  await activate(qualityTrigger);
  const dialog = page.getByRole('dialog', { name: /Качество данных категории/ });
  await expect(dialog).toBeVisible();
  const closeButton = dialog.getByRole('button', { name: 'Закрыть сведения о качестве данных' });

  await activate(closeButton);
  await expect(dialog).toBeHidden();
  await expect(activeOverlay(page)).toHaveCount(0);
  await expect(qualityTrigger).toBeFocused();
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  expect(errors).toEqual([]);
});

test('quality disclosure close-button keyboard activation restores focus to trigger', async ({ page }) => {
  const qualityTrigger = quality(page);
  await qualityTrigger.click();
  const dialog = page.getByRole('dialog', { name: /Качество данных категории/ });
  await expect(dialog).toBeVisible();
  const closeButton = dialog.getByRole('button', { name: 'Закрыть сведения о качестве данных' });
  await closeButton.focus();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(qualityTrigger).toBeFocused();
});

test('repeated open/close via close-button keeps returning focus to the same exact trigger', async ({ page }) => {
  const qualityTrigger = quality(page);
  const dialog = page.getByRole('dialog', { name: /Качество данных категории/ });
  for (let cycle = 0; cycle < 3; cycle += 1) {
    await qualityTrigger.click();
    await expect(dialog).toBeVisible();
    const closeButton = dialog.getByRole('button', { name: 'Закрыть сведения о качестве данных' });
    await closeButton.click();
    await expect(dialog).toBeHidden();
    await expect(activeOverlay(page)).toHaveCount(0);
    await expect(qualityTrigger).toBeFocused();
  }
});

test('quality A→quality B forward handoff via own close buttons returns focus to each own trigger, never bounces to A', async ({ page }) => {
  const qualityTriggers = page.locator('.category-profile-quality-trigger');
  const triggerA = qualityTriggers.nth(0);
  const triggerB = qualityTriggers.nth(1);
  const dialog = page.getByRole('dialog', { name: /Качество данных категории/ });

  await triggerA.click();
  await expect(dialog).toBeVisible();

  await triggerB.click();
  await expect(activeOverlay(page)).toHaveCount(1);
  await expect(triggerA).not.toBeFocused();

  const closeB = dialog.getByRole('button', { name: 'Закрыть сведения о качестве данных' });
  await closeB.click();
  await expect(activeOverlay(page)).toHaveCount(0);
  await expect(triggerB).toBeFocused();
  await expect(triggerA).not.toBeFocused();
});

test('closing quality disclosure via close-button then changing section leaves no orphan overlay', async ({ page }) => {
  const qualityTrigger = quality(page);
  const dialog = page.getByRole('dialog', { name: /Качество данных категории/ });
  await qualityTrigger.click();
  await expect(dialog).toBeVisible();
  const closeButton = dialog.getByRole('button', { name: 'Закрыть сведения о качестве данных' });
  await closeButton.click();
  await expect(dialog).toBeHidden();

  const navigation = page.locator('.category-profile-row').first().getByRole('button', { name: /Открыть категорию/ });
  await navigation.click();
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
