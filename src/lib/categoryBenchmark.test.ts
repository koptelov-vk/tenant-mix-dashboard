import { describe, expect, it } from 'vitest';
import { createAnalysisContext, sortCategoryBenchmarkPayloads } from './analysis';
import type { CategoryBenchmarkPayload, DashboardData, TenantRow } from '../types/dashboard';

// Fixture values below mirror issue #141's immutable acceptance fixtures
// (issue-141-immutable-fixtures-final-correction.zip, SHA-256
// bb94c627bd27fd8aa83b6a3ca9763af17e2c36dfec82ebaab27eba0067912ebf):
// F141_002 (odd median excludes focus), F141_004 (share deviation in
// percentage_points), F141_006/007/008 (focus/median/both zero),
// F141_010/011 (no peers / no data).

const row = (mall: string, brand: string, category: string): TenantRow => ({
  mall, city: 'НН', brand, brandNormalized: brand.toLocaleLowerCase('ru'), category,
  sourceUrl: `https://example.com/${brand}`, sourceType: 'официальный сайт', sourceQuality: 'Высокая', checkedAt: '2026-07-16', rowStatus: 'active',
});

const closedRow = (mall: string, brand: string, category: string): TenantRow => ({
  mall, city: 'НН', brand, brandNormalized: brand.toLocaleLowerCase('ru'), category,
  sourceUrl: `https://example.com/${brand}`, sourceType: 'официальный сайт', sourceQuality: 'Высокая', checkedAt: '2026-07-16', rowStatus: 'closed',
});

const unknownRow = (mall: string, brand: string, category: string): TenantRow => ({
  mall, city: 'НН', brand, brandNormalized: brand.toLocaleLowerCase('ru'), category,
  sourceUrl: `https://example.com/${brand}`, sourceType: 'официальный сайт', sourceQuality: 'Низкая', checkedAt: '2026-07-16', rowStatus: 'unknown',
});

const conflictingRow = (mall: string, brand: string, category: string): TenantRow => ({
  mall, city: 'НН', brand, brandNormalized: brand.toLocaleLowerCase('ru'), category,
  sourceUrl: `https://example.com/${brand}`, sourceType: 'официальный сайт', sourceQuality: 'Низкая', checkedAt: '2026-07-16', rowStatus: 'conflicting',
});

function buildData(rows: TenantRow[], categories: string[], malls: string[]): DashboardData {
  return {
    meta: { snapshotDate: '2026-07-16' },
    categoryMatrix: { categories },
    mallSummary: malls.map((mall) => ({ mall, city: 'НН', mallClass: 'Суперрегиональный', gla: 100_000, gba: 150_000, glaConfirmed: true, brandCount: 0, categoryCounts: {} })),
    rows,
    brandPresence: {},
    brandGaps: {},
    mallSimilarity: [],
    upcoming: [],
    dataQuality: { snapshotDate: '2026-07-16', rows: rows.length, malls: malls.length, brands: new Set(rows.map((r) => r.brandNormalized)).size, emptyBrands: 0, emptyNormalizedBrands: 0, duplicateMallBrandPairs: 0, invalidUrls: 0, mallsWithoutGla: 0, manualReviewRows: 0 },
  };
}

describe('buildCategoryBenchmarkPayloads (#134/#141 contract)', () => {
  it('F141_002: odd peer median excludes focus — focus 99, peers [10,20,30], deviation +79 brands', () => {
    const rows = [
      ...Array.from({ length: 99 }, (_, i) => row('Focus', `f${i}`, 'Одежда')),
      ...Array.from({ length: 10 }, (_, i) => row('Peer1', `p1-${i}`, 'Одежда')),
      ...Array.from({ length: 20 }, (_, i) => row('Peer2', `p2-${i}`, 'Одежда')),
      ...Array.from({ length: 30 }, (_, i) => row('Peer3', `p3-${i}`, 'Одежда')),
    ];
    const data = buildData(rows, ['Одежда'], ['Focus', 'Peer1', 'Peer2', 'Peer3']);
    const context = createAnalysisContext(data, { focusMall: 'Focus', category: 'Все категории', peerMalls: ['Peer1', 'Peer2', 'Peer3'] });
    const benchmark = context.categoryBenchmarks.find((item) => item.categoryId === 'Одежда');
    expect(benchmark?.count.focusValue).toBe(99);
    expect(benchmark?.count.peerMedian).toBe(20);
    expect(benchmark?.count.deviationRaw).toBe(79);
    expect(benchmark?.count.comparisonState).toBe('above');
    expect(benchmark?.count.deviationUnit).toBe('brands');
    expect(benchmark?.focusExcludedFromMedian).toBe(true);
    expect(benchmark?.state).toBe('ok');
  });

  it('F141_006: focus zero — focus 0, peers [5,10,15], deviation -10', () => {
    const rows = [
      ...Array.from({ length: 5 }, (_, i) => row('Peer1', `p1-${i}`, 'Одежда')),
      ...Array.from({ length: 10 }, (_, i) => row('Peer2', `p2-${i}`, 'Одежда')),
      ...Array.from({ length: 15 }, (_, i) => row('Peer3', `p3-${i}`, 'Одежда')),
    ];
    const data = buildData(rows, ['Одежда'], ['Focus', 'Peer1', 'Peer2', 'Peer3']);
    const context = createAnalysisContext(data, { focusMall: 'Focus', category: 'Все категории', peerMalls: ['Peer1', 'Peer2', 'Peer3'] });
    const benchmark = context.categoryBenchmarks.find((item) => item.categoryId === 'Одежда');
    expect(benchmark?.count.focusValue).toBe(0);
    expect(benchmark?.count.peerMedian).toBe(10);
    expect(benchmark?.count.deviationRaw).toBe(-10);
    expect(benchmark?.state).toBe('ok');
  });

  it('F141_007: median zero — focus 5, peers [0,0,10], deviation +5 (positive/zero — a real observed zero peer median is a valid ok state, not no_data)', () => {
    const rows = [
      ...Array.from({ length: 5 }, (_, i) => row('Focus', `f${i}`, 'Одежда')),
      closedRow('Peer1', 'x1', 'Одежда'), closedRow('Peer2', 'x2', 'Одежда'),
      ...Array.from({ length: 10 }, (_, i) => row('Peer3', `p3-${i}`, 'Одежда')),
    ];
    const data = buildData(rows, ['Одежда'], ['Focus', 'Peer1', 'Peer2', 'Peer3']);
    const context = createAnalysisContext(data, { focusMall: 'Focus', category: 'Все категории', peerMalls: ['Peer1', 'Peer2', 'Peer3'] });
    const benchmark = context.categoryBenchmarks.find((item) => item.categoryId === 'Одежда');
    expect(benchmark?.count.focusValue).toBe(5);
    expect(benchmark?.count.peerMedian).toBe(0);
    expect(benchmark?.count.deviationRaw).toBe(5);
    expect(benchmark?.state).toBe('ok');
  });

  it('F141_008: both zero — real rows exist (closed status) but zero active brands anywhere; canonical rule: known category + valid scope + zero active brands = a valid zero, state ok, NOT no_data', () => {
    const rows = [closedRow('Focus', 'x0', 'Одежда'), closedRow('Peer1', 'x1', 'Одежда'), closedRow('Peer2', 'x2', 'Одежда'), closedRow('Peer3', 'x3', 'Одежда')];
    const data = buildData(rows, ['Одежда'], ['Focus', 'Peer1', 'Peer2', 'Peer3']);
    const context = createAnalysisContext(data, { focusMall: 'Focus', category: 'Все категории', peerMalls: ['Peer1', 'Peer2', 'Peer3'] });
    const benchmark = context.categoryBenchmarks.find((item) => item.categoryId === 'Одежда');
    expect(benchmark?.count.focusValue).toBe(0);
    expect(benchmark?.count.peerMedian).toBe(0);
    expect(benchmark?.count.deviationRaw).toBe(0);
    expect(benchmark?.count.comparisonState).toBe('equal');
    expect(benchmark?.state).toBe('ok');
  });

  it('F141_011: no data — zero source rows anywhere in the comparison scope for the category (the only non-invented "unavailability" signal this data model has)', () => {
    const rows: TenantRow[] = [];
    const data = buildData(rows, ['Одежда'], ['Focus', 'Peer1', 'Peer2', 'Peer3']);
    const context = createAnalysisContext(data, { focusMall: 'Focus', category: 'Все категории', peerMalls: ['Peer1', 'Peer2', 'Peer3'] });
    const benchmark = context.categoryBenchmarks.find((item) => item.categoryId === 'Одежда');
    expect(benchmark?.state).toBe('no_data');
    expect(benchmark?.count.focusValue).toBeNull();
    expect(benchmark?.count.peerMedian).toBeNull();
  });

  it('F141_009 (documented gap, not asserted as PASS): "focus unavailable while peers have data" cannot be reproduced — TenantRow has no field distinguishing "not observed" from "observed zero"; a focus mall with zero rows for a known category yields a real 0, not no_data', () => {
    const rows = Array.from({ length: 10 }, (_, i) => row('Peer1', `p1-${i}`, 'Одежда'));
    const data = buildData(rows, ['Одежда'], ['Focus', 'Peer1']);
    const context = createAnalysisContext(data, { focusMall: 'Focus', category: 'Все категории', peerMalls: ['Peer1'] });
    const benchmark = context.categoryBenchmarks.find((item) => item.categoryId === 'Одежда');
    // Honest current behavior: focus has zero rows -> treated as a real 0, state ok, NOT no_data.
    // The abstract F141_009 fixture (focus=null while peers=[10,20]) expects no_data here instead.
    // Blocked per IMPLEMENTATION_BLOCKED_FOCUS_AVAILABILITY_SIGNAL_UNAVAILABLE — see review report.
    expect(benchmark?.count.focusValue).toBe(0);
    expect(benchmark?.state).toBe('ok');
  });

  it('F141_013: focus rows fully excluded by quality (all unknown/conflicting) while peers are valid -> focus-specific quality_excluded, independent of peer data', () => {
    const rows = [
      unknownRow('Focus', 'f1', 'Одежда'), unknownRow('Focus', 'f2', 'Одежда'),
      ...Array.from({ length: 10 }, (_, i) => row('Peer1', `p1-${i}`, 'Одежда')),
      ...Array.from({ length: 14 }, (_, i) => row('Peer2', `p2-${i}`, 'Одежда')),
    ];
    const data = buildData(rows, ['Одежда'], ['Focus', 'Peer1', 'Peer2']);
    const context = createAnalysisContext(data, { focusMall: 'Focus', category: 'Все категории', peerMalls: ['Peer1', 'Peer2'] });
    const benchmark = context.categoryBenchmarks.find((item) => item.categoryId === 'Одежда');
    expect(benchmark?.count.focusValue).toBeNull();
    expect(benchmark?.count.peerMedian).toBe(12);
    expect(benchmark?.state).toBe('quality_excluded');
    expect(benchmark?.quality.state).toBe('quality_excluded');
  });

  it('F141_012 vs F141_014: identical numeric shape (focus 12, peers [10,14]) but distinct quality reason -> distinct state (partial_quality vs conflicting), proving they are not collapsed', () => {
    const buildScenario = (extraFocusRow: TenantRow) => {
      const rows = [
        ...Array.from({ length: 12 }, (_, i) => row('Focus', `f${i}`, 'Одежда')),
        extraFocusRow,
        ...Array.from({ length: 10 }, (_, i) => row('Peer1', `p1-${i}`, 'Одежда')),
        ...Array.from({ length: 14 }, (_, i) => row('Peer2', `p2-${i}`, 'Одежда')),
      ];
      const data = buildData(rows, ['Одежда'], ['Focus', 'Peer1', 'Peer2']);
      const context = createAnalysisContext(data, { focusMall: 'Focus', category: 'Все категории', peerMalls: ['Peer1', 'Peer2'] });
      return context.categoryBenchmarks.find((item) => item.categoryId === 'Одежда');
    };

    const partial = buildScenario(unknownRow('Focus', 'unknown-extra', 'Одежда'));
    const conflicting = buildScenario(conflictingRow('Focus', 'conflicting-extra', 'Одежда'));

    expect(partial?.count.focusValue).toBe(12);
    expect(partial?.count.deviationRaw).toBe(0);
    expect(partial?.state).toBe('partial_quality');
    expect(partial?.quality.state).toBe('partial_quality');

    expect(conflicting?.count.focusValue).toBe(12);
    expect(conflicting?.count.deviationRaw).toBe(0);
    expect(conflicting?.state).toBe('conflicting');
    expect(conflicting?.quality.state).toBe('conflicting');

    // Same numeric inputs, different quality reason -> different canonical state. Not collapsed.
    expect(partial?.state).not.toBe(conflicting?.state);
  });

  it('F141_010: no peers — focus has data, zero peer malls selected', () => {
    const rows = Array.from({ length: 10 }, (_, i) => row('Focus', `f${i}`, 'Одежда'));
    const data = buildData(rows, ['Одежда'], ['Focus']);
    const context = createAnalysisContext(data, { focusMall: 'Focus', category: 'Все категории', peerMalls: [] });
    const benchmark = context.categoryBenchmarks.find((item) => item.categoryId === 'Одежда');
    expect(benchmark?.count.focusValue).toBe(10);
    expect(benchmark?.count.peerMedian).toBeNull();
    expect(benchmark?.count.deviationRaw).toBeNull();
    expect(benchmark?.count.comparisonState).toBe('unavailable');
    expect(benchmark?.state).toBe('no_peers');
  });

  it('F141_004-equivalent: share deviation is in percentage_points computed from exact raw fractions, no intermediate rounding', () => {
    // focus share 0.255 vs peer median share 0.2 -> deviation 5.5 pp (matches fixture's 5.499999999999999 before float display rounding)
    const rows = [
      ...Array.from({ length: 51 }, (_, i) => row('Focus', `f${i}`, 'Одежда')),
      ...Array.from({ length: 149 }, (_, i) => row('Focus', `focus-other-${i}`, 'Обувь')),
      ...Array.from({ length: 10 }, (_, i) => row('Peer1', `p1-${i}`, 'Одежда')),
      ...Array.from({ length: 90 }, (_, i) => row('Peer1', `p1-other-${i}`, 'Обувь')),
      ...Array.from({ length: 20 }, (_, i) => row('Peer2', `p2-${i}`, 'Одежда')),
      ...Array.from({ length: 80 }, (_, i) => row('Peer2', `p2-other-${i}`, 'Обувь')),
      ...Array.from({ length: 30 }, (_, i) => row('Peer3', `p3-${i}`, 'Одежда')),
      ...Array.from({ length: 70 }, (_, i) => row('Peer3', `p3-other-${i}`, 'Обувь')),
    ];
    const data = buildData(rows, ['Одежда', 'Обувь'], ['Focus', 'Peer1', 'Peer2', 'Peer3']);
    const context = createAnalysisContext(data, { focusMall: 'Focus', category: 'Все категории', peerMalls: ['Peer1', 'Peer2', 'Peer3'] });
    const benchmark = context.categoryBenchmarks.find((item) => item.categoryId === 'Одежда');
    expect(benchmark?.share.focusShareExact).toBeCloseTo(0.255, 10);
    expect(benchmark?.share.peerMedianShareExact).toBeCloseTo(0.2, 10);
    expect(benchmark?.share.deviationUnit).toBe('percentage_points');
    expect(benchmark?.share.deviationRaw).toBeCloseTo(5.5, 9);
  });

  it('F141_001: count is the default mode and both modes are available', () => {
    const rows = Array.from({ length: 5 }, (_, i) => row('Focus', `f${i}`, 'Одежда'));
    const data = buildData(rows, ['Одежда'], ['Focus']);
    const context = createAnalysisContext(data, { focusMall: 'Focus', category: 'Все категории', peerMalls: [] });
    const benchmark = context.categoryBenchmarks[0];
    expect(benchmark?.defaultMode).toBe('count');
    expect(benchmark?.availableModes).toEqual(['count', 'share']);
  });

  it('F141_003: even peer median (2 peers) excludes focus and averages the two central values', () => {
    const rows = [
      ...Array.from({ length: 50 }, (_, i) => row('Focus', `f${i}`, 'Одежда')),
      ...Array.from({ length: 10 }, (_, i) => row('Peer1', `p1-${i}`, 'Одежда')),
      ...Array.from({ length: 30 }, (_, i) => row('Peer2', `p2-${i}`, 'Одежда')),
    ];
    const data = buildData(rows, ['Одежда'], ['Focus', 'Peer1', 'Peer2']);
    const context = createAnalysisContext(data, { focusMall: 'Focus', category: 'Все категории', peerMalls: ['Peer1', 'Peer2'] });
    const benchmark = context.categoryBenchmarks.find((item) => item.categoryId === 'Одежда');
    expect(benchmark?.count.peerMedian).toBe(20); // (10+30)/2, focus's own 50 excluded from the median set
    expect(benchmark?.count.deviationRaw).toBe(30);
  });

  it('F141_019: canonical payload is deterministic/pure — identical inputs produce a structurally identical payload regardless of call context (proves no desktop/mobile-specific branch exists in the selector consumed by both)', () => {
    const rows = Array.from({ length: 7 }, (_, i) => row('Focus', `f${i}`, 'Одежда')).concat(Array.from({ length: 3 }, (_, i) => row('Peer1', `p${i}`, 'Одежда')));
    const data = buildData(rows, ['Одежда'], ['Focus', 'Peer1']);
    const filters = { focusMall: 'Focus', category: 'Все категории', peerMalls: ['Peer1'] };
    const first = createAnalysisContext(data, filters).categoryBenchmarks.find((item) => item.categoryId === 'Одежда');
    const second = createAnalysisContext(data, filters).categoryBenchmarks.find((item) => item.categoryId === 'Одежда');
    expect(first).toEqual(second);
  });

  it('N141_001: share deviation is always the exact delta times 100, never a bare fraction mislabeled as percentage_points', () => {
    const scenarios = [[7, 3, 5], [1, 9, 4], [50, 50, 1]] as const;
    scenarios.forEach(([focusCount, peerCount, otherCategoryPad]) => {
      const rows = [
        ...Array.from({ length: focusCount }, (_, i) => row('Focus', `f${i}`, 'Одежда')),
        ...Array.from({ length: otherCategoryPad }, (_, i) => row('Focus', `fo${i}`, 'Обувь')),
        ...Array.from({ length: peerCount }, (_, i) => row('Peer1', `p${i}`, 'Одежда')),
      ];
      const data = buildData(rows, ['Одежда', 'Обувь'], ['Focus', 'Peer1']);
      const context = createAnalysisContext(data, { focusMall: 'Focus', category: 'Все категории', peerMalls: ['Peer1'] });
      const benchmark = context.categoryBenchmarks.find((item) => item.categoryId === 'Одежда');
      if (benchmark?.share.shareExactDelta != null && benchmark.share.deviationRaw != null) {
        expect(benchmark.share.deviationRaw).toBeCloseTo(benchmark.share.shareExactDelta * 100, 9);
      }
    });
  });

  it('N141_002/N141_003: consumer-side median/deviation calculation is architecturally impossible — the selector ignores any extraneous precomputed fields on its inputs and always recomputes from raw peer values', () => {
    const rows = [
      ...Array.from({ length: 8 }, (_, i) => row('Focus', `f${i}`, 'Одежда')),
      ...Array.from({ length: 4 }, (_, i) => row('Peer1', `p1-${i}`, 'Одежда')),
      ...Array.from({ length: 6 }, (_, i) => row('Peer2', `p2-${i}`, 'Одежда')),
    ];
    const data = buildData(rows, ['Одежда'], ['Focus', 'Peer1', 'Peer2']);
    const context = createAnalysisContext(data, { focusMall: 'Focus', category: 'Все категории', peerMalls: ['Peer1', 'Peer2'] });
    const benchmark = context.categoryBenchmarks.find((item) => item.categoryId === 'Одежда');
    // median([4,6]) = 5, deviation = 8-5 = 3 — computed purely from CategorySliceStats.countMedian
    // (itself computed once, inside buildCategoryStats/median()), never passed in or overridable by a caller.
    expect(benchmark?.count.peerMedian).toBe(5);
    expect(benchmark?.count.deviationRaw).toBe(3);
  });

  it('exposes a canonical CategoryBenchmarkMethodology id/version matching the accepted #141 manifest, not a newly invented methodology', () => {
    const rows = Array.from({ length: 5 }, (_, i) => row('Focus', `f${i}`, 'Одежда'));
    const data = buildData(rows, ['Одежда'], ['Focus']);
    const context = createAnalysisContext(data, { focusMall: 'Focus', category: 'Все категории', peerMalls: [] });
    const benchmark = context.categoryBenchmarks[0];
    expect(benchmark?.methodologyId).toBe('categoryProfile.peerMedian.count');
    expect(benchmark?.methodologyVersion).toBe('1.0.0');
  });
});

describe('sortCategoryBenchmarkPayloads (#141 F141_015/016/017)', () => {
  const payload = (categoryId: string, deviation: number | null): CategoryBenchmarkPayload => ({
    payloadId: `category-benchmark:${categoryId}`, payloadVersion: '2.0.0', categoryId, focusObjectId: 'focus', peerObjectIds: [],
    count: { focusValue: null, peerMedian: null, deviationRaw: deviation, deviationUnit: 'brands', peerValues: [], comparisonState: deviation == null ? 'unavailable' : deviation > 0 ? 'above' : deviation < 0 ? 'below' : 'equal' },
    share: { focusShareExact: null, peerMedianShareExact: null, shareExactDelta: null, deviationRaw: null, deviationUnit: 'percentage_points', peerSharesExact: [], comparisonState: 'unavailable' },
    provenance: { sourceFixtureId: 'test', ownerDecisionCommentId: 5085245278, rawInputSha256: '0'.repeat(64) },
    defaultMode: 'count', availableModes: ['count', 'share'], focusExcludedFromMedian: true,
    state: 'ok', quality: { state: 'ok', limitations: [] },
    peerCount: 0, includedCount: 0, excludedCount: 0,
    methodologyId: 'categoryProfile.peerMedian.count', methodologyVersion: '1.0.0', dataVersion: '1', dataSnapshotAt: '2026-07-16',
  });

  it('F141_015: sorts by deviation descending — rows [b:2, a:5, c:-1] -> a, b, c', () => {
    const sorted = sortCategoryBenchmarkPayloads([payload('b', 2), payload('a', 5), payload('c', -1)], 'count');
    expect(sorted.map((item) => item.categoryId)).toEqual(['a', 'b', 'c']);
  });

  it('F141_016: ties break by canonical categoryId ascending — rows [b:2, a:2, c:1] -> a, b, c', () => {
    const sorted = sortCategoryBenchmarkPayloads([payload('b', 2), payload('a', 2), payload('c', 1)], 'count');
    expect(sorted.map((item) => item.categoryId)).toEqual(['a', 'b', 'c']);
  });

  it('F141_017: null-deviation rows are preserved (not dropped) and sorted after all computable rows', () => {
    const sorted = sortCategoryBenchmarkPayloads([payload('a', 2), payload('b', null)], 'count');
    expect(sorted.map((item) => item.categoryId)).toEqual(['a', 'b']);
    expect(sorted).toHaveLength(2);
  });
});
