import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const rankCard = (page) => page.locator('.kpi').filter({ hasText: 'Позиция в группе' });

test('PRODUCT-01 category rank shows Нет позиции for zero and recalculates with public context', async ({ page }) => {
  await page.goto('?focus=Фантастика&group=custom&malls=Небо,Океанис&cities=Нижний%20Новгород&categories=Категория%20без%20брендов');
  const zeroRank = rankCard(page);
  await expect(zeroRank).toContainText('Нет позиции');
  await expect(zeroRank).toContainText('нет учитываемых брендов');
  await expect(zeroRank).not.toContainText(/из\s+\d+\s+объект/);
  await expect(page.getByText(/н\/д-е место|0-е место/)).toHaveCount(0);

  await page.goto('?focus=Небо&group=custom&malls=Фантастика,Океанис&cities=Нижний%20Новгород&categories=Одежда');
  await expect(rankCard(page)).not.toContainText('Нет позиции');
  await expect(rankCard(page)).toContainText(/из\s+\d+\s+объект/);

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations.filter((item) => item.impact === 'critical')).toEqual([]);
});
