import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createAnalysisContext, toCanonicalBenchmarkPayload, validateCanonicalPayload141 } from './analysis';
import { validateAgainstSchema, type JsonSchema } from '../../tests/support/jsonSchema';
import type { CategoryBenchmarkPayload, DashboardData, TenantRow } from '../types/dashboard';

// Executable validation against the immutable, externally-supplied #141 acceptance
// contract (Issue #141, acceptance comment 5074664651,
// issue-141-immutable-fixtures-final-correction.zip, SHA-256
// bb94c627bd27fd8aa83b6a3ca9763af17e2c36dfec82ebaab27eba0067912ebf), versioned
// byte-for-byte as a test-only source under tests/fixtures/issue-141/ (see that
// directory's PROVENANCE.md). Nothing under src/ imports from that path — it is not
// a production runtime dependency. This file: (1) re-verifies the checksum of every
// committed file against the artifact's own manifest.json on every run, so any drift
// fails CI immediately; (2) loads the literal schema JSON and runs a generic JSON
// Schema evaluator (tests/support/jsonSchema.ts) against real production-calculation
// -path payloads and the fixture package's own expectedPayload values, rather than
// re-encoding the schema's rules as bespoke assertions.

const FIXTURE_ROOT = resolve(__dirname, '../../tests/fixtures/issue-141');
const manifest = JSON.parse(readFileSync(resolve(FIXTURE_ROOT, 'manifest.json'), 'utf8')) as {
  fileSha256: Record<string, string>;
  fixtureCount: number;
  positiveFixtureCount: number;
  negativeFixtureCount: number;
};
const canonicalPayloadSchema = JSON.parse(readFileSync(resolve(FIXTURE_ROOT, 'schema/canonical-benchmark-payload.schema.json'), 'utf8')) as JsonSchema;

describe('tests/fixtures/issue-141 — committed immutable contract integrity', () => {
  it('every file listed in manifest.json.fileSha256 matches its recorded checksum (143 files)', () => {
    const mismatches: string[] = [];
    const entries = Object.entries(manifest.fileSha256);
    for (const [relativePath, expectedSha] of entries) {
      const bytes = readFileSync(resolve(FIXTURE_ROOT, relativePath));
      const actualSha = createHash('sha256').update(bytes).digest('hex');
      if (actualSha !== expectedSha.toLowerCase()) mismatches.push(`${relativePath}: expected ${expectedSha}, got ${actualSha}`);
    }
    expect(entries.length).toBe(143);
    expect(mismatches).toEqual([]);
  });

  it('manifest declares the expected fixture composition (30 total: 26 positive incl. 6 IPC, 4 negative)', () => {
    expect(manifest.fixtureCount).toBe(30);
    expect(manifest.positiveFixtureCount).toBe(26);
    expect(manifest.negativeFixtureCount).toBe(4);
  });
});

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

describe('literal schema (tests/fixtures/issue-141/schema/canonical-benchmark-payload.schema.json) loaded and applied via a generic JSON Schema evaluator', () => {
  it('real production-calculation-path payloads validate against the literal schema object (not a hand-transcription)', () => {
    const benchmark = benchmarkFor([
      ...Array.from({ length: 99 }, (_, i) => row('Focus', `f${i}`, 'Одежда')),
      ...Array.from({ length: 10 }, (_, i) => row('Peer1', `p1-${i}`, 'Одежда')),
      ...Array.from({ length: 20 }, (_, i) => row('Peer2', `p2-${i}`, 'Одежда')),
      ...Array.from({ length: 30 }, (_, i) => row('Peer3', `p3-${i}`, 'Одежда')),
    ], ['Одежда'], ['Focus', 'Peer1', 'Peer2', 'Peer3'], 'Focus', ['Peer1', 'Peer2', 'Peer3']);
    const canonical = toCanonicalBenchmarkPayload(benchmark);
    expect(validateAgainstSchema(canonicalPayloadSchema, canonical)).toEqual([]);
  });

  it('literal schema rejects an extra top-level key exactly as additionalProperties:false requires', () => {
    const benchmark = benchmarkFor(Array.from({ length: 5 }, (_, i) => row('Focus', `f${i}`, 'Одежда')), ['Одежда'], ['Focus'], 'Focus', []);
    const canonical = toCanonicalBenchmarkPayload(benchmark) as unknown as Record<string, unknown>;
    const mutated = { ...canonical, methodologyId: 'leak' };
    const errors = validateAgainstSchema(canonicalPayloadSchema, mutated);
    expect(errors.some((e) => e.includes('additionalProperties:false violated by "methodologyId"'))).toBe(true);
  });

  it('literal schema rejects a missing required key', () => {
    const benchmark = benchmarkFor(Array.from({ length: 5 }, (_, i) => row('Focus', `f${i}`, 'Одежда')), ['Одежда'], ['Focus'], 'Focus', []);
    const canonical = toCanonicalBenchmarkPayload(benchmark) as unknown as Record<string, unknown>;
    const { state: _drop, ...mutated } = canonical;
    expect(validateAgainstSchema(canonicalPayloadSchema, mutated)).toContain('$: missing required property "state"');
  });

  it('literal schema rejects wrong const values (payloadVersion, defaultMode, focusExcludedFromMedian, availableModes)', () => {
    const benchmark = benchmarkFor(Array.from({ length: 5 }, (_, i) => row('Focus', `f${i}`, 'Одежда')), ['Одежда'], ['Focus'], 'Focus', []);
    const canonical = toCanonicalBenchmarkPayload(benchmark);
    expect(validateAgainstSchema(canonicalPayloadSchema, { ...canonical, payloadVersion: '9.9.9' }).length).toBeGreaterThan(0);
    expect(validateAgainstSchema(canonicalPayloadSchema, { ...canonical, defaultMode: 'share' }).length).toBeGreaterThan(0);
    expect(validateAgainstSchema(canonicalPayloadSchema, { ...canonical, focusExcludedFromMedian: false }).length).toBeGreaterThan(0);
    expect(validateAgainstSchema(canonicalPayloadSchema, { ...canonical, availableModes: ['share', 'count'] }).length).toBeGreaterThan(0);
  });

  it('every positive fixture\'s expectedPayload in the committed package validates against the literal schema', () => {
    const dir = resolve(FIXTURE_ROOT, 'fixtures');
    const files = readdirSync(dir).filter((name) => name.endsWith('.json'));
    expect(files.length).toBe(26);
    const failures: string[] = [];
    for (const file of files) {
      const fixture = JSON.parse(readFileSync(resolve(dir, file), 'utf8')) as { fixtureId: string; expectedPayload: unknown };
      const errors = validateAgainstSchema(canonicalPayloadSchema, fixture.expectedPayload);
      if (errors.length) failures.push(`${fixture.fixtureId}: ${errors.join('; ')}`);
    }
    expect(failures).toEqual([]);
  });
});

describe('exact fixture matrix classification (F141_001-020, N141_001-004)', () => {
  const positiveDir = resolve(FIXTURE_ROOT, 'fixtures');
  const negativeDir = resolve(FIXTURE_ROOT, 'negative-fixtures');
  const positiveIds = readdirSync(positiveDir).filter((n) => n.endsWith('.json')).map((n) => JSON.parse(readFileSync(resolve(positiveDir, n), 'utf8')).fixtureId as string);
  const negativeIds = readdirSync(negativeDir).filter((n) => n.endsWith('.json')).map((n) => JSON.parse(readFileSync(resolve(negativeDir, n), 'utf8')).fixtureId as string);

  const classification: Record<string, string> = {
    F141_001_count_default_share_available: 'EXECUTABLE_ASSERTION_PASS',
    F141_002_odd_median_excludes_focus: 'EXECUTABLE_ASSERTION_PASS',
    F141_003_even_median_excludes_focus: 'EXECUTABLE_ASSERTION_PASS',
    F141_004_share_percentage_points: 'EXECUTABLE_ASSERTION_PASS', // categoryBenchmark.test.ts
    F141_005_no_intermediate_rounding: 'EXECUTABLE_ASSERTION_PASS', // categoryBenchmark.test.ts
    F141_006_focus_zero: 'EXECUTABLE_ASSERTION_PASS',
    F141_007_median_zero: 'EXECUTABLE_ASSERTION_PASS',
    F141_008_both_zero: 'EXECUTABLE_ASSERTION_PASS',
    F141_009_null: 'DEFERRED_WITH_OWNER_DECISION',
    F141_010_no_peers: 'EXECUTABLE_ASSERTION_PASS',
    F141_011_no_data: 'EXECUTABLE_ASSERTION_PASS',
    F141_012_partial_quality: 'EXECUTABLE_ASSERTION_PASS',
    F141_013_all_quality_excluded: 'EXECUTABLE_ASSERTION_PASS',
    F141_014_conflicting: 'EXECUTABLE_ASSERTION_PASS', // categoryBenchmark.test.ts
    F141_015_sorting_by_deviation: 'EXECUTABLE_ASSERTION_PASS',
    F141_016_tie_break: 'EXECUTABLE_ASSERTION_PASS', // categoryBenchmark.test.ts
    F141_017_preserve_null_rows: 'EXECUTABLE_ASSERTION_PASS', // categoryBenchmark.test.ts
    F141_018_exclusivity_unchanged: 'EXECUTABLE_ASSERTION_PASS', // categoryProfiles.test.ts (pre-existing, untouched)
    F141_019_semantic_parity: 'EXECUTABLE_ASSERTION_PASS', // CategoryProfileBenchmark.test.tsx
    F141_020_accessibility_pdf: 'EXECUTABLE_ASSERTION_PASS', // CategoryProfileBenchmark.test.tsx + pdf-quality-summary spec
    F141_IPC_001_browser_measurements: 'NOT_APPLICABLE_WITH_EXACT_CONTRACT_REASON',
    F141_IPC_002_fold: 'NOT_APPLICABLE_WITH_EXACT_CONTRACT_REASON',
    F141_IPC_003_back_restoration: 'IMPLEMENTATION_PHASE_GATE_DEFINED', // covered by real Playwright Back-restoration spec
    F141_IPC_004_real_bounding_boxes: 'NOT_APPLICABLE_WITH_EXACT_CONTRACT_REASON',
    F141_IPC_005_production_identity: 'NOT_APPLICABLE_WITH_EXACT_CONTRACT_REASON',
    F141_IPC_006_physical_device: 'NOT_APPLICABLE_WITH_EXACT_CONTRACT_REASON',
    N141_001_fraction_marked_percentage_points: 'EXECUTABLE_ASSERTION_PASS',
    N141_002_consumer_median: 'EXECUTABLE_ASSERTION_PASS',
    N141_003_consumer_deviation: 'EXECUTABLE_ASSERTION_PASS',
    N141_004_implementation_evidence_claim: 'NOT_APPLICABLE_WITH_EXACT_CONTRACT_REASON',
  };

  it('every exact fixture ID present in the committed package has an assigned classification, and every classified ID actually exists in the package', () => {
    const allIds = [...positiveIds, ...negativeIds];
    expect(allIds.length).toBe(30);
    for (const id of allIds) expect(classification[id], `${id} has no classification entry`).toBeDefined();
    for (const id of Object.keys(classification)) expect(allIds, `classification entry "${id}" does not exist in the committed package`).toContain(id);
  });

  it('F141_009 is explicitly deferred, never a synthetic PASS', () => {
    expect(classification.F141_009_null).toBe('DEFERRED_WITH_OWNER_DECISION');
  });
});
