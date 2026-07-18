import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('data/aggregates/dashboard_data.json', 'utf8'));

const activeRows = data.rows.filter(row => row.statusNormalized === 'active');
const activeBrands = new Set(activeRows.map(row => row.brandNormalized));

test('aggregate contract is complete', () => {
  assert.equal(data.dataQuality.rows, 4996);
  assert.equal(data.dataQuality.activeRows, activeRows.length);
  assert.equal(data.dataQuality.brands, activeBrands.size);
  assert.equal(data.dataQuality.brands, Object.keys(data.brandPresence).length);
  assert.equal(data.dataQuality.malls, 30);
  assert.equal(data.dataQuality.emptyBrands, 0);
  assert.equal(data.dataQuality.duplicateMallBrandPairs, 0);
  assert.equal(
    data.dataQuality.excludedFromActiveAggregates,
    data.dataQuality.rows - data.dataQuality.activeRows,
  );
});

test('GLA and GBA remain distinct and density only uses confirmed GLA', () => {
  for (const mall of data.mallSummary) {
    if (mall.gla && mall.gba) assert.ok(mall.gla <= mall.gba, mall.mall);
    if (!mall.glaConfirmed) assert.equal(mall.brandDensity10kGla, null, mall.mall);
    if (mall.glaConfirmed) assert.ok(Math.abs(mall.brandDensity10kGla - mall.brandCount / mall.gla * 10000) < 1e-9, mall.mall);
  }
});

test('similarity uses Jaccard formula for active brands only', () => {
  const brands = mall => new Set(
    activeRows
      .filter(row => row.mall === mall)
      .map(row => row.brandNormalized),
  );
  const sample = data.mallSimilarity.find(item => item.focus === 'Фантастика' && item.mall === 'Небо');
  assert.ok(sample, 'Фантастика / Небо similarity sample is required');
  const a = brands(sample.focus), b = brands(sample.mall);
  const intersection = [...a].filter(value => b.has(value)).length;
  const union = new Set([...a, ...b]).size;
  assert.equal(sample.intersection, intersection);
  assert.equal(sample.union, union);
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

test('publication workflow validates first and performs one atomic production deploy', () => {
  const workflow = fs.readFileSync('.github/workflows/pages.yml', 'utf8');
  const qualityJob = workflow.indexOf('\n  quality:');
  const deployJob = workflow.indexOf('\n  deploy:');

  assert.ok(qualityJob >= 0, 'quality job is required');
  assert.ok(deployJob > qualityJob, 'deploy must run after quality');
  assert.equal(workflow.includes('\n  maintenance:'), false, 'maintenance deploy must not exist');
  assert.equal(workflow.includes('\n  restore-previous:'), false, 'rollback rebuild must not exist');
  assert.ok(workflow.includes('Validate production artifact'));
  assert.ok(workflow.includes('Revalidate downloaded production artifact'));
  assert.ok(workflow.includes('needs: quality'));
  assert.ok(workflow.includes('Deploy verified dashboard once'));
  assert.equal((workflow.match(/actions\/deploy-pages@v4/g) || []).length, 1);
  assert.ok(workflow.includes('Desktop, mobile and accessibility tests'));
});
