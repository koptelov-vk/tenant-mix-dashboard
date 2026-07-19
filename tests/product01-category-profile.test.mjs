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

test('PRODUCT-01 quality indicator is a separate accessible disclosure', () => {
  assert.match(ui, /function QualityDisclosure/);
  assert.match(ui, /Показать качество данных категории/);
  assert.match(ui, /role="dialog"/);
  assert.match(ui, /aria-expanded/);
  assert.match(ui, /aria-controls/);
  assert.match(ui, /Неизвестный статус/);
  assert.match(ui, /Конфликтующий статус/);
  assert.match(ui, /Ручная проверка/);
  assert.match(ui, /event\.key !== 'Escape'/);
  assert.doesNotMatch(ui, /<button[^>]*category-profile-open[\s\S]*?<button[^>]*category-profile-quality-trigger/);
});
