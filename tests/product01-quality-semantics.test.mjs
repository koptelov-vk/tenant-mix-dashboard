import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ui = readFileSync(new URL('../src/components/dashboard/CategoryProfile.tsx', import.meta.url), 'utf8');

test('PRODUCT-01-UI-03 separates excluded and included-review presentation', () => {
  assert.match(ui, /hasExcluded \? 'Расчёт ограничен' : reviewSignalText/);
  assert.match(ui, /действующих записей требуют дополнительной проверки, но включены в расчёт/);
  assert.match(ui, /Исключено из расчёта/);
  assert.match(ui, /Включено, но требует проверки/);
  assert.match(ui, /Эти записи исключены и ограничивают полноту рассчитанного показателя/);
  assert.match(ui, /Ручная проверка не меняет active-статус и сама по себе не ограничивает расчёт/);
  assert.match(ui, /hasExcluded && hasIncludedReview/);
});

test('strong partial warning depends only on excluded unknown or conflicting rows', () => {
  assert.match(ui, /const partial = context\.categoryProfiles\.some\(\(profile\) => profile\.excludedUnknownCount \+ profile\.excludedConflictingCount > 0\)/);
  assert.doesNotMatch(ui, /const partial = context\.categoryProfiles\.some\(\(profile\) => profile\.qualityIssues\.length > 0\)/);
});

test('all-quality-excluded blocking state remains present', () => {
  assert.match(ui, /profile\.allRowsExcludedByQuality/);
  assert.match(ui, /Невозможно рассчитать показатель/);
});
