import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const brand = (page) => page.getByRole('button', { name: 'Tenant Mix Analytics', exact: true });
const canonicalContext = new URLSearchParams({
  focus: 'Небо',
  group: 'custom',
  malls: 'Фантастика',
  cities: 'Нижний Новгород',
  categories: 'Обувь',
  quality: 'Высокая',
  glaMin: '10000',
  glaMax: '100000',
  gbaMin: '20000',
  gbaMax: '150000',
  metric: 'share',
  cpMode: 'share',
  cpShowAll: '1',
  gapN: '1',
});
const origins = ['overview', 'categories', 'brands', 'comparability', 'upcoming', 'quality'];

function contextWithoutTab(url) {
  const params = new URL(url).searchParams;
  params.delete('tab');
  return JSON.stringify([...params.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

test('BrandLockup opens Overview from every approved origin and preserves URL context', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  for (const origin of origins) {
    const params = new URLSearchParams(canonicalContext);
    params.set('tab', origin);
    await page.goto(`?${params}`);
    const beforeContext = contextWithoutTab(page.url());
    const control = brand(page);
    await expect(control).toBeVisible();
    if (testInfo.project.name.startsWith('mobile')) await control.tap();
    else await control.click();

    await expect.poll(() => new URL(page.url()).searchParams.get('tab')).toBe('overview');
    await expect(page.getByRole('button', { name: 'Сравнение', exact: true })).toHaveAttribute('aria-current', 'page');
    expect(contextWithoutTab(page.url())).toBe(beforeContext);
  }

  expect(errors).toEqual([]);
});

test('BrandLockup uses native Enter and Space semantics', async ({ page }) => {
  for (const [origin, key] of [['categories', 'Enter'], ['brands', 'Space']]) {
    await page.goto(`?tab=${origin}&focus=Небо&metric=share`);
    const control = brand(page);
    await control.focus();
    await page.keyboard.press(key);
    await expect.poll(() => new URL(page.url()).searchParams.get('tab')).toBe('overview');
    await expect(control).toBeFocused();
  }
});

test('BrandLockup creates one history entry, supports Back/Forward/refresh, and is idempotent on Overview', async ({ page }) => {
  await page.addInitScript(() => {
    window.__decisionFPushes = 0;
    const pushState = history.pushState.bind(history);
    history.pushState = (...args) => {
      window.__decisionFPushes += 1;
      return pushState(...args);
    };
  });
  await page.goto('?tab=categories&focus=Небо&metric=share&cpMode=share&cpShowAll=1&gapN=2');
  await expect(page.getByRole('button', { name: 'Категории', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const pushesBefore = await page.evaluate(() => window.__decisionFPushes);
  await brand(page).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('tab')).toBe('overview');
  expect(await page.evaluate(() => window.__decisionFPushes)).toBe(pushesBefore + 1);

  await page.goBack();
  await expect.poll(() => new URL(page.url()).searchParams.get('tab')).toBe('categories');
  await page.goForward();
  await expect.poll(() => new URL(page.url()).searchParams.get('tab')).toBe('overview');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Сравнение', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect.poll(() => new URL(page.url()).searchParams.get('focus')).toBe('Небо');
  await expect.poll(() => new URL(page.url()).searchParams.get('cpShowAll')).toBe('1');

  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const pushesOnOverview = await page.evaluate(() => window.__decisionFPushes);
  const urlOnOverview = page.url();
  await brand(page).click();
  expect(await page.evaluate(() => window.__decisionFPushes)).toBe(pushesOnOverview);
  expect(page.url()).toBe(urlOnOverview);
});

test('BrandLockup closes a shared overlay without focus bounce', async ({ page }) => {
  await page.goto('?tab=brands&focus=Небо');
  await page.getByRole('button', { name: 'Сохранённые представления', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Сохранённые представления' })).toBeVisible();

  const control = brand(page);
  await control.focus();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('dialog', { name: 'Сохранённые представления' })).toHaveCount(0);
  await expect(page.locator('.overlay-portal-layer')).toHaveCount(0);
  await expect(control).toBeFocused();
  await expect.poll(() => new URL(page.url()).searchParams.get('tab')).toBe('overview');
});

test('BrandLockup has one native tab stop, exact name, no nested control, and no critical accessibility violations', async ({ page }) => {
  await page.goto('?tab=overview');
  const control = brand(page);
  await expect(control).toHaveCount(1);
  await expect(control).toHaveAttribute('type', 'button');
  await expect(control.locator('button, a, input, select, textarea, [tabindex]')).toHaveCount(0);
  await expect(control.locator('.brand-mark')).toHaveAttribute('aria-hidden', 'true');
  const results = await new AxeBuilder({ page }).include('.app-header').analyze();
  expect(results.violations.filter((item) => item.impact === 'critical')).toEqual([]);
});
