import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const utils = readFileSync(new URL('../src/lib/utils.ts', import.meta.url), 'utf8');
const potentialBrands = readFileSync(new URL('../src/components/dashboard/PotentialBrands.tsx', import.meta.url), 'utf8');

test('shared Russian pluralization covers object count edge cases', () => {
  assert.match(utils, /lastTwo >= 11 && lastTwo <= 14/);
  assert.match(utils, /last === 1/);
  assert.match(utils, /last >= 2 && last <= 4/);
});

test('potential brands uses existing formatCountRu and no hardcoded numeric objects form', () => {
  assert.match(potentialBrands, /formatCountRu\(item\.mallCount, objectForms\)/);
  assert.doesNotMatch(potentialBrands, /\{item\.mallCount\} объектов/);
  assert.doesNotMatch(potentialBrands, /function plural|const plural/);
});
