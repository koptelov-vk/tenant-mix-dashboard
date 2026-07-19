import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('header actions follow the canonical contract', async ({ page }, testInfo) => {
  await page.addInitScript(({ mobile }) => {
    window.__shared = '';
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value) => { window.__shared = value; } } });
    if (mobile) Object.defineProperty(navigator, 'share', { configurable: true, value: async ({ url }) => { window.__shared = url; } });
  }, { mobile: testInfo.project.name.startsWith('mobile') });
  await page.goto('?focus=Фантастика&tab=brands&group=custom&malls=Небо,Океанис&cities=Нижний%20Новгород&categories=Одежда');
  const actions = page.locator('.header-actions > .button, .header-actions > .templates-root > .button');
  await expect(actions).toHaveCount(3);
  await expect(actions.nth(0)).toHaveAttribute('aria-label', 'Экспортировать в PDF');
  await expect(actions.nth(1)).toHaveAttribute('aria-label', 'Поделиться ссылкой');
  await expect(actions.nth(2)).toHaveAttribute('aria-label', 'Открыть шаблоны');
  await expect(page.getByRole('button', { name: /Обновить данные|Сбросить фильтры|Сохранённые представления|Экспорт текущего среза/ })).toHaveCount(0);
  await actions.nth(1).click();
  const shared = await expect.poll(() => page.evaluate(() => window.__shared)).not.toBe('');
  const url = new URL(await page.evaluate(() => window.__shared));
  expect(url.searchParams.get('tab')).toBe('brands');
  expect(url.searchParams.get('group')).toBe('custom');
  expect(url.searchParams.get('malls')).toBe('Небо,Океанис');
  expect(url.searchParams.get('cities')).toBe('Нижний Новгород');
  expect(url.searchParams.get('categories')).toBe('Одежда');
  await actions.nth(2).click();
  const dialog = page.getByRole('dialog', { name: 'Каталог шаблонов' });
  await expect(dialog).toContainText('Сохранённые представления пользователей не входят');
  await page.keyboard.press('Escape');
  await expect(actions.nth(2)).toBeFocused();
  const sizes = await actions.evaluateAll((items) => items.map((item) => ({ width: item.getBoundingClientRect().width, height: item.getBoundingClientRect().height })));
  expect(sizes.every((item) => item.width >= 44 && item.height >= 44)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.filter((item) => item.impact === 'critical')).toEqual([]);
});
