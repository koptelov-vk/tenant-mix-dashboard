import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('data/aggregates/dashboard_data.json', 'utf8'));
const STATUSES = ['active', 'upcoming', 'closed', 'unknown', 'conflicting'];
const pairKey = (mall, brand) => `${mall}\u0000${brand}`;
const uniqueBrands = rows => new Set(rows.map(row => row.brandNormalized).filter(Boolean));
const rowsForMall = (rows, mall) => rows.filter(row => row.mall === mall);

const activeRows = data.rows.filter(row => row.statusNormalized === 'active');
const excludedRows = data.rows.filter(row => row.statusNormalized !== 'active');
const activeBrands = uniqueBrands(activeRows);
const computedStatusCounts = Object.fromEntries(
  STATUSES.map(status => [status, data.rows.filter(row => row.statusNormalized === status).length]),
);
const activePairs = new Set(activeRows.map(row => pairKey(row.mall, row.brandNormalized)));
const excludedOnlyPairs = new Set(
  excludedRows
    .map(row => pairKey(row.mall, row.brandNormalized))
    .filter(key => !activePairs.has(key)),
);

test('aggregate contract is complete and derived from canonical statuses', () => {
  assert.equal(data.dataQuality.rows, data.rows.length);
  assert.equal(data.dataQuality.activeRows, activeRows.length);
  assert.equal(data.dataQuality.excludedFromActiveAggregates, excludedRows.length);
  assert.equal(data.dataQuality.rows, activeRows.length + excludedRows.length);

  assert.deepEqual(data.dataQuality.statusCounts, computedStatusCounts);
  assert.equal(
    Object.values(data.dataQuality.statusCounts).reduce((sum, value) => sum + value, 0),
    data.dataQuality.rows,
  );
  assert.equal(
    data.dataQuality.excludedFromActiveAggregates,
    computedStatusCounts.upcoming + computedStatusCounts.closed + computedStatusCounts.unknown + computedStatusCounts.conflicting,
  );

  assert.equal(data.dataQuality.brands, activeBrands.size);
  assert.equal(data.dataQuality.brands, Object.keys(data.brandPresence).length);
  assert.deepEqual(new Set(Object.keys(data.brandPresence)), activeBrands);
  assert.equal(data.dataQuality.malls, data.mallSummary.length);
  assert.equal(data.dataQuality.emptyBrands, 0);
  assert.equal(data.dataQuality.emptyNormalizedBrands, 0);
  assert.equal(data.dataQuality.duplicateMallBrandPairs, 0);
});

test('brandPresence and tenant counts contain active mall-brand pairs only', () => {
  for (const [brand, presence] of Object.entries(data.brandPresence)) {
    const expectedMalls = [...new Set(activeRows.filter(row => row.brandNormalized === brand).map(row => row.mall))].sort();
    assert.deepEqual([...presence.malls].sort(), expectedMalls, brand);
    assert.equal(presence.mallCount, expectedMalls.length, brand);
  }

  for (const mall of data.mallSummary) {
    const expectedBrands = uniqueBrands(rowsForMall(activeRows, mall.mall));
    assert.equal(mall.brandCount, expectedBrands.size, mall.mall);
    for (const key of excludedOnlyPairs) {
      const [excludedMall, excludedBrand] = key.split('\u0000');
      if (excludedMall === mall.mall) assert.equal(expectedBrands.has(excludedBrand), false, `${mall.mall}: ${excludedBrand}`);
    }
  }
});

test('unknown and conflicting rows never enter active tenant sets', () => {
  assert.ok(computedStatusCounts.unknown + computedStatusCounts.conflicting > 0, 'quality-excluded status rows are required');

  for (const row of data.rows.filter(item => item.statusNormalized === 'unknown' || item.statusNormalized === 'conflicting')) {
    const key = pairKey(row.mall, row.brandNormalized);
    if (!activePairs.has(key)) {
      assert.equal(
        uniqueBrands(rowsForMall(activeRows, row.mall)).has(row.brandNormalized),
        false,
        `${row.statusNormalized} row leaked into active set: ${row.mall} / ${row.brandNormalized}`,
      );
    }
  }
});

test('GLA and GBA remain distinct and density only uses confirmed GLA', () => {
  for (const mall of data.mallSummary) {
    if (mall.gla && mall.gba) assert.ok(mall.gla <= mall.gba, mall.mall);
    if (!mall.glaConfirmed) assert.equal(mall.brandDensity10kGla, null, mall.mall);
    if (mall.glaConfirmed) assert.ok(Math.abs(mall.brandDensity10kGla - mall.brandCount / mall.gla * 10000) < 1e-9, mall.mall);
  }
});

test('similarity intersection, union and Jaccard use active brands only', () => {
  const brands = mall => uniqueBrands(rowsForMall(activeRows, mall));
  const sample = data.mallSimilarity.find(item => item.focus === 'Фантастика' && item.mall === 'Небо');
  assert.ok(sample, 'Фантастика / Небо similarity sample is required');

  const focusBrands = brands(sample.focus);
  const peerBrands = brands(sample.mall);
  const intersection = [...focusBrands].filter(value => peerBrands.has(value)).length;
  const union = new Set([...focusBrands, ...peerBrands]).size;
  const expectedJaccard = union ? intersection / union : 0;

  assert.equal(sample.intersection, intersection);
  assert.equal(sample.union, union);
  assert.ok(Math.abs(sample.jaccard - expectedJaccard) < 1e-12);

  for (const key of excludedOnlyPairs) {
    const [mall, brand] = key.split('\u0000');
    if (mall === sample.focus) assert.equal(focusBrands.has(brand), false, `excluded focus brand leaked: ${brand}`);
    if (mall === sample.mall) assert.equal(peerBrands.has(brand), false, `excluded peer brand leaked: ${brand}`);
  }
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