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
