import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('data/aggregates/dashboard_data.json', 'utf8'));

test('aggregate contract is complete', () => {
  assert.equal(data.dataQuality.rows, 4996);
  assert.equal(data.dataQuality.brands, 2577);
  assert.equal(data.dataQuality.malls, 30);
  assert.equal(data.dataQuality.emptyBrands, 0);
  assert.equal(data.dataQuality.duplicateMallBrandPairs, 0);
});

test('GLA and GBA remain distinct and density only uses confirmed GLA', () => {
  for (const mall of data.mallSummary) {
    if (mall.gla && mall.gba) assert.ok(mall.gla <= mall.gba, mall.mall);
    if (!mall.glaConfirmed) assert.equal(mall.brandDensity10kGla, null, mall.mall);
    if (mall.glaConfirmed) assert.ok(Math.abs(mall.brandDensity10kGla - mall.brandCount / mall.gla * 10000) < 1e-9, mall.mall);
  }
});

test('similarity uses Jaccard formula', () => {
  const brands = mall => new Set(data.rows.filter(row => row.mall === mall).map(row => row.brandNormalized));
  const sample = data.mallSimilarity.find(item => item.focus === 'Фантастика' && item.mall === 'Небо');
  const a = brands(sample.focus), b = brands(sample.mall);
  const intersection = [...a].filter(value => b.has(value)).length;
  const union = new Set([...a, ...b]).size;
  assert.ok(Math.abs(sample.jaccard - intersection / union) < 1e-12);
});

test('three uniqueness scopes are distinguishable', () => {
  const group = new Set(['Фантастика', 'Небо', 'Жар-Птица']);
  const globalUnique = Object.values(data.brandPresence)
    .filter(item => item.mallCount === 1 && item.malls.some(mall => group.has(mall)));
  const groupUnique = Object.values(data.brandPresence).filter(item => item.malls.filter(mall => group.has(mall)).length === 1);
  assert.ok(globalUnique.length > 0);
  assert.ok(groupUnique.length >= globalUnique.length);
});

test('group uniqueness changes with the selected comparison set', () => {
  const scopeCount = malls => Object.values(data.brandPresence)
    .filter(item => item.malls.filter(mall => malls.has(mall)).length === 1).length;
  const small = scopeCount(new Set(['Фантастика', 'Небо']));
  const large = scopeCount(new Set(['Фантастика', 'Небо', 'Жар-Птица', 'Океанис']));
  assert.notEqual(small, large);
});

test('publication workflow is gated by the quality job', () => {
  const workflow = fs.readFileSync('.github/workflows/pages.yml', 'utf8');
  assert.match(workflow, /deploy:\s+[\s\S]*needs: quality/);
  assert.match(workflow, /Validate source data/);
  assert.match(workflow, /Desktop, mobile and accessibility tests/);
});
