import { describe, expect, it } from 'vitest';
import { buildCategoryProfiles, createAnalysisContext, normalizedStatus } from './analysis';
import type { DashboardData, MallSummary, TenantRow } from '../types/dashboard';

const malls: MallSummary[] = [
  { mall: 'A', city: 'НН', mallClass: 'Региональный', gla: 1, gba: 1, glaConfirmed: true, brandCount: 0, categoryCounts: {} },
  { mall: 'B', city: 'НН', mallClass: 'Региональный', gla: 1, gba: 1, glaConfirmed: true, brandCount: 0, categoryCounts: {} },
  { mall: 'C', city: 'НН', mallClass: 'Региональный', gla: 1, gba: 1, glaConfirmed: true, brandCount: 0, categoryCounts: {} },
];

const row = (mall: string, brand: string, category = 'Одежда', rowStatus?: string, normalized = brand.toLowerCase(), confirmation?: string): TenantRow => ({
  mall, city: 'НН', brand, brandNormalized: normalized, category, rowStatus, confirmation,
  sourceUrl: 'https://example.com', sourceType: 'официальный сайт', sourceQuality: 'Высокая',
});

const active = (mall: string, brand: string, category = 'Одежда', normalized = brand.toLowerCase()) => row(mall, brand, category, 'active', normalized);

const data = (rows: TenantRow[]): DashboardData => ({
  meta: { snapshotDate: '2026-07-18' }, rows, mallSummary: malls,
  categoryMatrix: { categories: ['Одежда', 'Обувь'] }, brandPresence: {}, mallSimilarity: [], brandGaps: {}, upcoming: [],
  dataQuality: { snapshotDate: '2026-07-18', rows: rows.length, malls: 3, brands: 0, emptyBrands: 0, emptyNormalizedBrands: 0, duplicateMallBrandPairs: 0, invalidUrls: 0, mallsWithoutGla: 0, manualReviewRows: 0 },
});

describe('canonical tenant status', () => {
  it('treats absence of rowStatus and confirmation as unknown', () => {
    expect(normalizedStatus(row('A', 'Missing'))).toBe('unknown');
  });

  it('accepts explicit active and confirmation OK', () => {
    expect(normalizedStatus(active('A', 'Active'))).toBe('active');
    expect(normalizedStatus(row('A', 'Confirmed', 'Одежда', undefined, 'confirmed', 'OK'))).toBe('active');
  });
});

describe('category profile exclusivity', () => {
  it('normalizes aliases through brandNormalized and excludes focus from peers', () => {
    const rows = [active('A', 'МегаФон', 'Одежда', 'мегафон'), active('A', 'Alpha'), active('B', 'MEGAFON', 'Одежда', 'мегафон')];
    const result = buildCategoryProfiles(data(rows), rows, malls[0]!, [malls[0]!, malls[1]!], ['Одежда'])[0]!;
    expect(result.totalBrands).toBe(2);
    expect([...result.exclusiveBrands]).toEqual(['alpha']);
  });

  it('recalculates when the comparison group changes', () => {
    const rows = [active('A', 'Alpha'), active('A', 'Beta'), active('B', 'Alpha'), active('C', 'Beta')];
    expect(buildCategoryProfiles(data(rows), rows, malls[0]!, [malls[1]!], ['Одежда'])[0]!.exclusiveCount).toBe(1);
    expect(buildCategoryProfiles(data(rows), rows, malls[0]!, [malls[1]!, malls[2]!], ['Одежда'])[0]!.exclusiveCount).toBe(0);
  });

  it('excludes upcoming, closed, unknown and conflicting statuses and reports quality limits', () => {
    const rows = [active('A', 'Active'), row('A', 'Soon', 'Одежда', 'upcoming'), row('A', 'Closed', 'Одежда', 'closed'), row('A', 'Unknown', 'Одежда', 'unknown'), row('A', 'Conflict', 'Одежда', 'conflicting')];
    const result = buildCategoryProfiles(data(rows), rows, malls[0]!, [malls[1]!], ['Одежда'])[0]!;
    expect(result.totalBrands).toBe(1);
    expect(result.excludedUnknownCount).toBe(1);
    expect(result.excludedConflictingCount).toBe(1);
  });

  it('does not include missing status in focus count or create exclusivity', () => {
    const rows = [row('A', 'Missing'), active('A', 'Active'), active('B', 'Active')];
    const result = buildCategoryProfiles(data(rows), rows, malls[0]!, [malls[1]!], ['Одежда'])[0]!;
    expect(result.totalBrands).toBe(1);
    expect(result.exclusiveCount).toBe(0);
    expect(result.excludedUnknownCount).toBe(1);
  });

  it('does not include missing status in peers', () => {
    const rows = [active('A', 'Alpha'), row('B', 'Alpha')];
    const result = buildCategoryProfiles(data(rows), rows, malls[0]!, [malls[1]!], ['Одежда'])[0]!;
    expect(result.exclusiveCount).toBe(1);
    expect(result.excludedUnknownCount).toBe(1);
  });

  it('supports mixed active and unknown rows', () => {
    const rows = [active('A', 'Alpha'), row('A', 'Unknown'), active('B', 'Beta')];
    const result = buildCategoryProfiles(data(rows), rows, malls[0]!, [malls[1]!], ['Одежда'])[0]!;
    expect(result.totalBrands).toBe(1);
    expect(result.exclusiveCount).toBe(1);
    expect(result.allRowsExcludedByQuality).toBe(false);
    expect(result.qualityIssues).toHaveLength(1);
  });

  it('marks a category when all rows are excluded due to quality', () => {
    const rows = [row('A', 'Unknown'), row('B', 'Conflict', 'Одежда', 'conflicting')];
    const result = buildCategoryProfiles(data(rows), rows, malls[0]!, [malls[1]!], ['Одежда'])[0]!;
    expect(result.totalBrands).toBe(0);
    expect(result.exactPercent).toBeNull();
    expect(result.allRowsExcludedByQuality).toBe(true);
    expect(result.excludedUnknownCount).toBe(1);
    expect(result.excludedConflictingCount).toBe(1);
  });

  it('returns a confirmed zero when peers cover all focus brands', () => {
    const rows = [active('A', 'Alpha'), active('A', 'Beta'), active('B', 'Alpha'), active('B', 'Beta')];
    const result = buildCategoryProfiles(data(rows), rows, malls[0]!, [malls[1]!], ['Одежда'])[0]!;
    expect(result.totalBrands).toBe(2);
    expect(result.exclusiveCount).toBe(0);
    expect(result.exactPercent).toBe(0);
    expect(result.displayPercent).toBe(0);
  });

  it('rounds only the displayed percentage and returns null for zero denominator', () => {
    const rows = [active('A', 'A'), active('A', 'B'), active('A', 'C'), active('B', 'C')];
    const result = buildCategoryProfiles(data(rows), rows, malls[0]!, [malls[1]!], ['Одежда'])[0]!;
    expect(result.exactPercent).toBeCloseTo(66.666, 2);
    expect(result.displayPercent).toBe(67);
    const empty = buildCategoryProfiles(data([]), [], malls[0]!, [malls[1]!], ['Обувь'])[0]!;
    expect(empty.exclusiveCount).toBe(0);
    expect(empty.exactPercent).toBeNull();
    expect(empty.displayPercent).toBeNull();
    expect(empty.allRowsExcludedByQuality).toBe(false);
  });

  it('matches the exclusive aggregate to the canonical brand list', () => {
    const rows = [active('A', 'Alpha'), active('A', 'Alpha duplicate', 'Одежда', 'alpha'), active('A', 'Beta'), active('B', 'Beta')];
    const result = buildCategoryProfiles(data(rows), rows, malls[0]!, [malls[1]!], ['Одежда'])[0]!;
    expect(result.exclusiveCount).toBe(result.exclusiveBrands.size);
    expect([...result.exclusiveBrands]).toEqual(['alpha']);
  });

  it('excludes unknown rows from live tenant-mix, intersections and similarity context', () => {
    const rows = [active('A', 'Alpha'), row('A', 'Unknown'), active('B', 'Alpha'), row('B', 'Unknown peer')];
    const context = createAnalysisContext(data(rows), { focusMall: 'A', category: 'Все категории', peerMalls: ['A', 'B'] });
    expect(context.mallStats.find((item) => item.mall.mall === 'A')?.brandCount).toBe(1);
    expect([...context.intersections.focusBrands]).toEqual(['alpha']);
    expect(context.similarities[0]?.jaccard).toBe(1);
  });
});
