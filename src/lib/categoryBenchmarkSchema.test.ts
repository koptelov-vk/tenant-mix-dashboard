import { describe, expect, it } from 'vitest';
import { createAnalysisContext, toCanonicalBenchmarkPayload, validateCanonicalPayload141 } from './analysis';
import type { CategoryBenchmarkPayload, DashboardData, TenantRow } from '../types/dashboard';

// Executable validation against the immutable, externally-supplied #141 contract:
// issue-141-immutable-fixtures-final-correction.zip, SHA-256
// bb94c627bd27fd8aa83b6a3ca9763af17e2c36dfec82ebaab27eba0067912ebf,
// schema/canonical-benchmark-payload.schema.json.
//
// That schema file (and the fixture package it ships in) has no reproducible
// CI-fetchable location — it lives only in the externally-supplied acceptance
// artifact — so it cannot be loaded at test time here. `validateCanonicalPayload141`
// in analysis.ts instead hand-encodes the exact same constraints (required keys,
// additionalProperties:false, const values), transcribed directly from the schema
// file's contents, and this file both unit-tests that validator against its own
// schema rules and runs it against every real production-calculation-path payload
// this implementation can produce, for every applicable positive fixture scenario.

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

function buildData(rows: TenantRow[], categories: string[], malls: string[]): DashboardData {
  return {
    meta: { snapshotDate: '2026-07-16' },
    categoryMatrix: { categories },
    mallSummary: malls.map((mall) => ({ mall, city: 'НН', mallClass: 'Суперрегиональный', gla: 100_000, gba: 150_000, glaConfirmed: true, brandCount: 0, categoryCounts: {} })),
    rows, brandPresence: {}, brandGaps: {}, mallSimilarity: [], upcoming: [],
    dataQuality: { snapshotDate: '2026-07-16', rows: rows.length, malls: malls.length, brands: new Set(rows.map((r) => r.brandNormalized)).size, emptyBrands: 0, emptyNormalizedBrands: 0, duplicateMallBrandPairs: 0, invalidUrls: 0, mallsWithoutGla: 0, manualReviewRows: 0 },
  };
}

function benchmarkFor(rows: TenantRow[], categories: string[], malls: string[], focusMall: string, peerMalls: string[]) {
  const data = buildData(rows, categories, malls);
  const context = createAnalysisContext(data, { focusMall, category: 'Все категории', peerMalls });
  const benchmark = context.categoryBenchmarks[0];
  if (!benchmark) throw new Error('no benchmark produced');
  return benchmark;
}

describe('validateCanonicalPayload141 — self-tests against the schema rules it encodes', () => {
  const valid = (): CategoryBenchmarkPayload => ({
    payloadId: 'category-benchmark:Одежда', payloadVersion: '1.0.0', categoryId: 'Одежда', focusObjectId: 'focus', peerObjectIds: ['p1'],
    count: { focusValue: 1, peerMedian: 1, deviation: 0, deviationUnit: 'brands', peerValues: [1] },
    share: { focusShareExact: 0.5, peerMedianShareExact: 0.5, shareExactDelta: 0, deviation: 0, deviationUnit: 'percentage_points', peerSharesExact: [0.5] },
    quality: { state: 'ok', limitations: [] },
    provenance: {},
    state: 'ok', defaultMode: 'count', availableModes: ['count', 'share'], focusExcludedFromMedian: true,
    peerCount: 1, includedCount: 1, excludedCount: 0,
    methodologyId: 'categoryProfile.peerMedian.count', methodologyVersion: '1.0.0', dataVersion: '1', dataSnapshotAt: '2026-07-16',
  });

  it('accepts a fully schema-compliant canonical payload', () => {
    expect(validateCanonicalPayload141(toCanonicalBenchmarkPayload(valid()))).toEqual([]);
  });

  it('rejects an extra top-level key (additionalProperties:false)', () => {
    const canonical = toCanonicalBenchmarkPayload(valid()) as unknown as Record<string, unknown>;
    const mutated = { ...canonical, unexpectedField: 'x' };
    expect(validateCanonicalPayload141(mutated)).toContain('additionalProperties:false violated by "unexpectedField"');
  });

  it('rejects a missing required key', () => {
    const canonical = toCanonicalBenchmarkPayload(valid()) as unknown as Record<string, unknown>;
    const { provenance: _drop, ...mutated } = canonical;
    expect(validateCanonicalPayload141(mutated)).toContain('missing required "provenance"');
  });

  it('rejects a wrong payloadVersion const', () => {
    const canonical = { ...toCanonicalBenchmarkPayload(valid()), payloadVersion: '2.0.0' };
    expect(validateCanonicalPayload141(canonical)).toContain('payloadVersion must const "1.0.0"');
  });

  it('rejects a wrong defaultMode const', () => {
    const canonical = { ...toCanonicalBenchmarkPayload(valid()), defaultMode: 'share' };
    expect(validateCanonicalPayload141(canonical)).toContain('defaultMode must const "count"');
  });

  it('rejects focusExcludedFromMedian !== true', () => {
    const canonical = { ...toCanonicalBenchmarkPayload(valid()), focusExcludedFromMedian: false };
    expect(validateCanonicalPayload141(canonical)).toContain('focusExcludedFromMedian must const true');
  });

  it('rejects availableModes not exactly ["count","share"]', () => {
    const canonical = { ...toCanonicalBenchmarkPayload(valid()), availableModes: ['share', 'count'] };
    expect(validateCanonicalPayload141(canonical).some((e) => e.includes('availableModes'))).toBe(true);
  });
});

describe('#141 fixture-derived production payloads validate against the canonical schema', () => {
  const cases: Array<[string, () => CategoryBenchmarkPayload]> = [
    ['F141_001 count default/share available', () => benchmarkFor(Array.from({ length: 5 }, (_, i) => row('Focus', `f${i}`, 'Одежда')), ['Одежда'], ['Focus'], 'Focus', [])],
    ['F141_002 odd median excludes focus', () => benchmarkFor([
      ...Array.from({ length: 99 }, (_, i) => row('Focus', `f${i}`, 'Одежда')),
      ...Array.from({ length: 10 }, (_, i) => row('Peer1', `p1-${i}`, 'Одежда')),
      ...Array.from({ length: 20 }, (_, i) => row('Peer2', `p2-${i}`, 'Одежда')),
      ...Array.from({ length: 30 }, (_, i) => row('Peer3', `p3-${i}`, 'Одежда')),
    ], ['Одежда'], ['Focus', 'Peer1', 'Peer2', 'Peer3'], 'Focus', ['Peer1', 'Peer2', 'Peer3'])],
    ['F141_003 even median excludes focus', () => benchmarkFor([
      ...Array.from({ length: 50 }, (_, i) => row('Focus', `f${i}`, 'Одежда')),
      ...Array.from({ length: 10 }, (_, i) => row('Peer1', `p1-${i}`, 'Одежда')),
      ...Array.from({ length: 30 }, (_, i) => row('Peer2', `p2-${i}`, 'Одежда')),
    ], ['Одежда'], ['Focus', 'Peer1', 'Peer2'], 'Focus', ['Peer1', 'Peer2'])],
    ['F141_006 focus zero', () => benchmarkFor([
      ...Array.from({ length: 5 }, (_, i) => row('Peer1', `p1-${i}`, 'Одежда')),
      ...Array.from({ length: 10 }, (_, i) => row('Peer2', `p2-${i}`, 'Одежда')),
      ...Array.from({ length: 15 }, (_, i) => row('Peer3', `p3-${i}`, 'Одежда')),
    ], ['Одежда'], ['Focus', 'Peer1', 'Peer2', 'Peer3'], 'Focus', ['Peer1', 'Peer2', 'Peer3'])],
    ['F141_007 median zero', () => benchmarkFor([
      ...Array.from({ length: 5 }, (_, i) => row('Focus', `f${i}`, 'Одежда')),
      closedRow('Peer1', 'x1', 'Одежда'), closedRow('Peer2', 'x2', 'Одежда'),
      ...Array.from({ length: 10 }, (_, i) => row('Peer3', `p3-${i}`, 'Одежда')),
    ], ['Одежда'], ['Focus', 'Peer1', 'Peer2', 'Peer3'], 'Focus', ['Peer1', 'Peer2', 'Peer3'])],
    ['F141_008 both zero', () => benchmarkFor([closedRow('Focus', 'x0', 'Одежда'), closedRow('Peer1', 'x1', 'Одежда'), closedRow('Peer2', 'x2', 'Одежда'), closedRow('Peer3', 'x3', 'Одежда')], ['Одежда'], ['Focus', 'Peer1', 'Peer2', 'Peer3'], 'Focus', ['Peer1', 'Peer2', 'Peer3'])],
    ['F141_009 (deferred; still structurally schema-valid even though state is `ok`, not `no_data`)', () => benchmarkFor(Array.from({ length: 10 }, (_, i) => row('Peer1', `p1-${i}`, 'Одежда')), ['Одежда'], ['Focus', 'Peer1'], 'Focus', ['Peer1'])],
    ['F141_010 no peers', () => benchmarkFor(Array.from({ length: 10 }, (_, i) => row('Focus', `f${i}`, 'Одежда')), ['Одежда'], ['Focus'], 'Focus', [])],
    ['F141_011 no data', () => benchmarkFor([], ['Одежда'], ['Focus', 'Peer1'], 'Focus', ['Peer1'])],
    ['F141_012 partial quality', () => benchmarkFor([
      ...Array.from({ length: 12 }, (_, i) => row('Focus', `f${i}`, 'Одежда')), unknownRow('Focus', 'u1', 'Одежда'),
      ...Array.from({ length: 10 }, (_, i) => row('Peer1', `p1-${i}`, 'Одежда')),
      ...Array.from({ length: 14 }, (_, i) => row('Peer2', `p2-${i}`, 'Одежда')),
    ], ['Одежда'], ['Focus', 'Peer1', 'Peer2'], 'Focus', ['Peer1', 'Peer2'])],
    ['F141_013 all quality excluded (focus-specific)', () => benchmarkFor([
      unknownRow('Focus', 'f1', 'Одежда'), unknownRow('Focus', 'f2', 'Одежда'),
      ...Array.from({ length: 10 }, (_, i) => row('Peer1', `p1-${i}`, 'Одежда')),
      ...Array.from({ length: 14 }, (_, i) => row('Peer2', `p2-${i}`, 'Одежда')),
    ], ['Одежда'], ['Focus', 'Peer1', 'Peer2'], 'Focus', ['Peer1', 'Peer2'])],
    ['F141_015 deterministic sorting (uses same payload shape)', () => benchmarkFor(Array.from({ length: 5 }, (_, i) => row('Focus', `f${i}`, 'Одежда')), ['Одежда'], ['Focus'], 'Focus', [])],
  ];

  it.each(cases)('%s -> canonical adapter output passes schema validation', (_label, build) => {
    const benchmark = build();
    const canonical = toCanonicalBenchmarkPayload(benchmark);
    const errors = validateCanonicalPayload141(canonical);
    expect(errors).toEqual([]);
    // The internal model's extra Issue #170 semantics (methodology identity, peer/inclusion
    // counts) must NOT leak into the canonical payload, since additionalProperties:false forbids them.
    expect(Object.keys(canonical)).not.toContain('methodologyId');
    expect(Object.keys(canonical)).not.toContain('peerCount');
  });

  it('N141_001/002/003: canonical payload never carries a consumer-computable-only field or a bare fraction mislabeled as percentage_points', () => {
    const benchmark = benchmarkFor([
      ...Array.from({ length: 7 }, (_, i) => row('Focus', `f${i}`, 'Одежда')),
      ...Array.from({ length: 3 }, (_, i) => row('Peer1', `p${i}`, 'Одежда')),
    ], ['Одежда'], ['Focus', 'Peer1'], 'Focus', ['Peer1']);
    const canonical = toCanonicalBenchmarkPayload(benchmark);
    expect(validateCanonicalPayload141(canonical)).toEqual([]);
    if (canonical.share.shareExactDelta != null && canonical.share.deviation != null) {
      expect(canonical.share.deviation).toBeCloseTo(canonical.share.shareExactDelta * 100, 9);
    }
  });
});
