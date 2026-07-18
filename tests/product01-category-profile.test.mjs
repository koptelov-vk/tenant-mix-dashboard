import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const analysis = fs.readFileSync('src/lib/analysis.ts', 'utf8');
const contextTypes = fs.readFileSync('src/types/dashboard.ts', 'utf8');
const ui = fs.readFileSync('src/components/dashboard/CategoryProfile.tsx', 'utf8');

test('PRODUCT-01 keeps one canonical category exclusivity aggregator', () => {
  assert.match(analysis, /export function buildCategoryProfiles\(/);
  assert.match(analysis, /const categoryProfiles = buildCategoryProfiles\(/);
  assert.match(contextTypes, /categoryProfiles: CategoryProfileStats\[\]/);
  assert.doesNotMatch(ui, /new Set\(|\bconst\s+(?:exclusiveBrands|exactPercent)\b/);
});

test('PRODUCT-01 exposes required states and accessible explanations', () => {
  assert.match(ui, /Пересчитываем профиль по категориям/);
  assert.match(ui, /Фокусный объект не входит в текущую группу/);
  assert.match(ui, /выберите минимум ещё один объект/);
  assert.match(ui, /Нет данных, соответствующих выбранным объектам/);
  assert.match(ui, /Расчёт выполнен по доступным данным/);
  assert.match(ui, /role="tooltip"/);
  assert.match(ui, /aria-describedby/);
  assert.match(ui, /Пояснение расчёта для категории/);
});
