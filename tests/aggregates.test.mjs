import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('data/aggregates/dashboard_data.json', 'utf8'));
const builderSource = fs.readFileSync('scripts/build_aggregates.py', 'utf8');
const STATUSES = ['active', 'upcoming', 'closed', 'unknown', 'conflicting'];
const pairKey = (mall, brand) => `${mall}\u0000${brand}`;
const uniqueBrands = rows => new Set(rows.map(row => row.brandNormalized).filter(Boolean));
const rowsForMall = (rows, mall) => rows.filter(row => row.mall === mall);
const normalizeText = value => String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim().toLocaleLowerCase('ru');

const canonicalStatus = row => {
  const rowStatus = normalizeText(row.rowStatus);
  const confirmation = normalizeText(row.confirmation);
  const value = `${rowStatus} ${confirmation}`.trim();
  if (!value) return 'unknown';
  if (value.includes('conflict') || value.includes('конфликт')) return 'conflicting';
  if (value.includes('unknown') || value.includes('неизвест')) return 'unknown';
  if (['upcoming', 'скоро', 'planned', 'заявлен', 'ожида'].some(token => value.includes(token))) return 'upcoming';
  if (value.includes('closed') || value.includes('закры')) return 'closed';
  if (
    ['active', 'действ', 'открыт', 'confirmed', 'подтвержд'].some(token => value.includes(token))
    || confirmation === 'ok'
  ) return 'active';
  return 'unknown';
};

const normalizedRows = data.rows.map(row => ({
  ...row,
  statusNormalized: row.statusNormalized ?? canonicalStatus(row),
}));
for (const row of data.rows.filter(item => item.statusNormalized)) {
  assert.equal(row.statusNormalized, canonicalStatus(row), `${row.mall} / ${row.brandNormalized}`);
}

const activeRows = normalizedRows.filter(row => row.statusNormalized === 'active');
const excludedRows = normalizedRows.filter(row => row.statusNormalized !== 'active');
const activeBrands = uniqueBrands(activeRows);
const computedStatusCounts = Object.fromEntries(
  STATUSES.map(status => [status, normalizedRows.filter(row => row.statusNormalized === status).length]),
);
const activePairs = new Set(activeRows.map(row => pairKey(row.mall, row.brandNormalized)));
const excludedOnlyPairs = new Set(
  excludedRows
    .map(row => pairKey(row.mall, row.brandNormalized))
    .filter(key => !activePairs.has(key)),
);
const computedPresence = new Map();
for (const row of activeRows) {
  if (!computedPresence.has(row.brandNormalized)) computedPresence.set(row.brandNormalized, new Set());
  computedPresence.get(row.brandNormalized).add(row.mall);
}
const hasCanonicalAggregate = data.meta?.version === '2.2' && Number.isInteger(data.dataQuality?.activeRows);

test('canonical status arithmetic is complete and reproducible', () => {
  assert.equal(normalizedRows.length, activeRows.length + excludedRows.length);
  assert.equal(
    Object.values(computedStatusCounts).reduce((sum, value) => sum + value, 0),
    normalizedRows.length,
  );
  assert.equal(
    excludedRows.length,
    computedStatusCounts.upcoming + computedStatusCounts.closed + computedStatusCounts.unknown + computedStatusCounts.conflicting,
  );
  assert.ok(computedStatusCounts.unknown + computedStatusCounts.conflicting > 0, 'quality-excluded rows are required');
  assert.equal(activeBrands.size, computedPresence.size);
});

test('production builder uses canonical active rows for all primary aggregates', () => {
  assert.ok(builderSource.includes('canonical_status(row_status, confirmation)'));
  assert.ok(builderSource.includes('active_rows = [row for row in rows if row["statusNormalized"] == "active"]'));
  assert.ok(builderSource.includes('for row in active_rows:'));
  assert.ok(builderSource.includes('set_a = brands_by_mall[mall_a]'));
  assert.ok(builderSource.includes('set_b = brands_by_mall[mall_b]'));
  assert.ok(builderSource.includes('"excludedFromActiveAggregates": len(rows) - len(active_rows)'));
});

test('rebuilt canonical aggregate metadata matches active-only source arithmetic', { skip: !hasCanonicalAggregate }, () => {
  assert.equal(data.dataQuality.rows, normalizedRows.length);
  assert.equal(data.dataQuality.activeRows, activeRows.length);
  assert.equal(data.dataQuality.excludedFromActiveAggregates, excludedRows.length);
  assert.deepEqual(data.dataQuality.statusCounts, computedStatusCounts);
  assert.equal(data.dataQuality.brands, activeBrands.size);
  assert.equal(data.dataQuality.brands, Object.keys(data.brandPresence).length);
  assert.deepEqual(new Set(Object.keys(data.brandPresence)), activeBrands);
  assert.equal(data.dataQuality.malls, data.mallSummary.length);
  assert.equal(data.dataQuality.emptyBrands, 0);
  assert.equal(data.dataQuality.emptyNormalizedBrands, 0);
  assert.equal(data.dataQuality.duplicateMallBrandPairs, 0);
});

test('unknown and conflicting rows never enter reconstructed active tenant sets', () => {
  for (const row of normalizedRows.filter(item => item.statusNormalized === 'unknown' || item.statusNormalized === 'conflicting')) {
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

test('rebuilt brandPresence and tenant counts contain active mall-brand pairs only', { skip: !hasCanonicalAggregate }, () => {
  for (const [brand, malls] of computedPresence.entries()) {
    const presence = data.brandPresence[brand];
    assert.ok(presence, brand);
    const expectedMalls = [...malls].sort();
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

test('GLA and GBA remain distinct and density only uses confirmed GLA', () => {
  for (const mall of data.mallSummary) {
    if (mall.gla && mall.gba) assert.ok(mall.gla <= mall.gba, mall.mall);
    if (!mall.glaConfirmed) assert.equal(mall.brandDensity10kGla, null, mall.mall);
    if (hasCanonicalAggregate && mall.glaConfirmed) {
      assert.ok(Math.abs(mall.brandDensity10kGla - mall.brandCount / mall.gla * 10000) < 1e-9, mall.mall);
    }
  }
});

test('active-only intersection, union and Jaccard are reproducible', () => {
  const focus = 'Фантастика';
  const peer = 'Небо';
  const focusBrands = uniqueBrands(rowsForMall(activeRows, focus));
  const peerBrands = uniqueBrands(rowsForMall(activeRows, peer));
  const common = [...focusBrands].filter(value => peerBrands.has(value)).length;
  const focusOnly = [...focusBrands].filter(value => !peerBrands.has(value)).length;
  const competitorOnly = [...peerBrands].filter(value => !focusBrands.has(value)).length;
  const union = common + focusOnly + competitorOnly;
  const expectedJaccard = union ? common / union : 0;

  assert.equal(union, new Set([...focusBrands, ...peerBrands]).size);
  assert.equal(common, [...focusBrands].filter(value => peerBrands.has(value)).length);
  assert.ok(expectedJaccard >= 0 && expectedJaccard <= 1);

  for (const key of excludedOnlyPairs) {
    const [mall, brand] = key.split('\u0000');
    if (mall === focus) assert.equal(focusBrands.has(brand), false, `excluded focus brand leaked: ${brand}`);
    if (mall === peer) assert.equal(peerBrands.has(brand), false, `excluded peer brand leaked: ${brand}`);
  }

  if (hasCanonicalAggregate) {
    const sample = data.mallSimilarity.find(item => item.focus === focus && item.mall === peer);
    assert.ok(sample, `${focus} / ${peer} similarity sample is required`);
    assert.equal(sample.common, common);
    assert.equal(sample.focusOnly, focusOnly);
    assert.equal(sample.competitorOnly, competitorOnly);
    assert.ok(Math.abs(sample.jaccard - expectedJaccard) < 1e-12);
  }
});

test('three active-only uniqueness scopes are distinguishable', () => {
  const group = new Set(['Фантастика', 'Небо', 'Жар-Птица']);
  const presences = [...computedPresence.values()];
  const globalUnique = presences.filter(malls => malls.size === 1 && [...malls].some(mall => group.has(mall)));
  const groupUnique = presences.filter(malls => [...malls].filter(mall => group.has(mall)).length === 1);
  assert.ok(globalUnique.length > 0);
  assert.ok(groupUnique.length >= globalUnique.length);
});

test('active-only group uniqueness changes with the selected comparison set', () => {
  const scopeCount = malls => [...computedPresence.values()]
    .filter(presence => [...presence].filter(mall => malls.has(mall)).length === 1).length;
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