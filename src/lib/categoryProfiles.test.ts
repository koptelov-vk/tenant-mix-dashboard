import { describe, expect, it } from 'vitest';
import { buildCategoryProfiles } from './analysis';
import type { DashboardData, MallSummary, TenantRow } from '../types/dashboard';

const malls: MallSummary[] = [
  { mall: 'A', city: 'НН', mallClass: 'Региональный', gla: 1, gba: 1, glaConfirmed: true, brandCount: 0, categoryCounts: {} },
  { mall: 'B', city: 'НН', mallClass: 'Региональный', gla: 1, gba: 1, glaConfirmed: true, brandCount: 0, categoryCounts: {} },
  { mall: 'C', city: 'НН', mallClass: 'Региональный', gla: 1, gba: 1, glaConfirmed: true, brandCount: 0, categoryCounts: {} },
];

const row = (mall: string, brand: string, category = 'Одежда', rowStatus = 'active', normalized = brand.toLowerCase()): TenantRow => ({
  mall, city: 'НН', brand, brandNormalized: normalized, category, rowStatus,
  sourceUrl: 'https://example.com', sourceType: 'официальный сайт', sourceQuality: 'Высокая',
});

const data = (rows: TenantRow[]): DashboardData => ({
  meta: { snapshotDate: '2026-07-18' }, rows, mallSummary: malls,
  categoryMatrix: { categories: ['Одежда', 'Обувь'] }, brandPresence: {}, mallSimilarity: [], brandGaps: {}, upcoming: [],
  dataQuality: { snapshotDate: '2026-07-18', rows: rows.length, malls: 3, brands: 0, emptyBrands: 0, emptyNormalizedBrands: 0, duplicateMallBrandPairs: 0, invalidUrls: 0, mallsWithoutGla: 0, manualReviewRows: 0 },
});

describe('category profile exclusivity', () => {
  it('normalizes aliases through brandNormalized and excludes focus from peers', () => {
    const rows = [row('A', 'МегаФон', 'Одежда', 'active', 'мегафон'), row('A', 'Alpha'), row('B', 'MEGAFON', 'Одежда', 'active', 'мегафон')];
    const result = buildCategoryProfiles(data(rows), rows, malls[0]!, [malls[0]!, malls[1]!], ['Одежда'])[0]!;
    expect(result.totalBrands).toBe(2);
    expect([...result.exclusiveBrands]).toEqual(['alpha']);
  });

  it('recalculates when the comparison group changes', () => {
    const rows = [row('A', 'Alpha'), row('A', 'Beta'), row('B', 'Alpha'), row('C', 'Beta')];
    expect(buildCategoryProfiles(data(rows), rows, malls[0]!, [malls[1]!], ['Одежда'])[0]!.exclusiveCount).toBe(1);
    expect(buildCategoryProfiles(data(rows), rows, malls[0]!, [malls[1]!, malls[2]!], ['Одежда'])[0]!.exclusiveCount).toBe(0);
  });

  it('excludes upcoming, closed, unknown and conflicting statuses and reports quality limits', () => {
    const rows = [row('A', 'Active'), row('A', 'Soon', 'Одежда', 'upcoming'), row('A', 'Closed', 'Одежда', 'closed'), row('A', 'Unknown', 'Одежда', 'unknown'), row('A', 'Conflict', 'Одежда', 'conflicting')];
    const result = buildCategoryProfiles(data(rows), rows, malls[0]!, [malls[1]!], ['Одежда'])[0]!;
    expect(result.totalBrands).toBe(1);
    expect(result.excludedUnknownCount).toBe(1);
    expect(result.excludedConflictingCount).toBe(1);
  });

  it('rounds only the displayed percentage and returns null for zero denominator', () => {
    const rows = [row('A', 'A'), row('A', 'B'), row('A', 'C'), row('B', 'C')];
    const result = buildCategoryProfiles(data(rows), rows, malls[0]!, [malls[1]!], ['Одежда'])[0]!;
    expect(result.exactPercent).toBeCloseTo(66.666, 2);
    expect(result.displayPercent).toBe(67);
    const empty = buildCategoryProfiles(data([]), [], malls[0]!, [malls[1]!], ['Обувь'])[0]!;
    expect(empty.exactPercent).toBeNull();
    expect(empty.displayPercent).toBeNull();
  });

  it('matches the exclusive aggregate to the canonical brand list', () => {
    const rows = [row('A', 'Alpha'), row('A', 'Alpha duplicate', 'Одежда', 'active', 'alpha'), row('A', 'Beta'), row('B', 'Beta')];
    const result = buildCategoryProfiles(data(rows), rows, malls[0]!, [malls[1]!], ['Одежда'])[0]!;
    expect(result.exclusiveCount).toBe(result.exclusiveBrands.size);
    expect([...result.exclusiveBrands]).toEqual(['alpha']);
  });
});
