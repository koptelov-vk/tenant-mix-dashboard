import { describe, expect, it } from 'vitest';
import { buildCategoryProfiles } from './analysis';
import type { DashboardData, MallSummary, TenantRow } from '../types/dashboard';

const focus: MallSummary = { mall: 'Фокус', city: 'Город 1', mallClass: 'Региональный', gla: 10_000, gba: 15_000, glaConfirmed: true, brandCount: 0, categoryCounts: {} };
const peer: MallSummary = { mall: 'Конкурент', city: 'Город 2', mallClass: 'Региональный', gla: 12_000, gba: 18_000, glaConfirmed: true, brandCount: 0, categoryCounts: {} };

const row = (brand: string, status: 'active' | 'unknown' | 'conflicting', options: { mall?: string; manualReview?: boolean } = {}): TenantRow => ({
  mall: options.mall ?? focus.mall,
  city: options.mall === peer.mall ? peer.city : focus.city,
  brand,
  brandNormalized: brand.toLocaleLowerCase('ru'),
  category: 'Тестовая категория',
  sourceUrl: `https://example.com/${brand}`,
  sourceType: 'Официальный сайт',
  sourceQuality: 'Высокая',
  checkedAt: '2026-07-19',
  statusNormalized: status,
  manualReview: options.manualReview ?? false,
});

const dataFor = (rows: TenantRow[]): DashboardData => ({
  meta: { snapshotDate: '2026-07-16' },
  categoryMatrix: { categories: ['Тестовая категория'] },
  mallSummary: [focus, peer],
  rows,
  brandPresence: {},
  brandGaps: {},
  mallSimilarity: [],
  upcoming: [],
  dataQuality: { snapshotDate: '2026-07-16', rows: rows.length, malls: 2, brands: rows.length, emptyBrands: 0, emptyNormalizedBrands: 0, duplicateMallBrandPairs: 0, invalidUrls: 0, mallsWithoutGla: 0, manualReviewRows: rows.filter((item) => item.manualReview).length },
});

const profile = (rows: TenantRow[]) => buildCategoryProfiles(dataFor(rows), rows, focus, [peer], ['Тестовая категория'])[0]!;

describe('PRODUCT-01-UI-03 quality signal semantics', () => {
  it('keeps active manual-review rows in the calculation without excluded records', () => {
    const result = profile([row('A', 'active', { manualReview: true }), row('B', 'active', { mall: peer.mall })]);
    expect(result.manualReviewCount).toBe(1);
    expect(result.excludedUnknownCount + result.excludedConflictingCount).toBe(0);
    expect(result.totalBrands).toBe(1);
    expect(result.exclusiveCount).toBe(1);
    expect(result.displayPercent).toBe(100);
    expect(result.allRowsExcludedByQuality).toBe(false);
  });

  it('counts unknown records as excluded', () => {
    const result = profile([row('A', 'active'), row('U', 'unknown')]);
    expect(result.excludedUnknownCount).toBe(1);
    expect(result.excludedConflictingCount).toBe(0);
  });

  it('counts conflicting records as excluded', () => {
    const result = profile([row('A', 'active'), row('C', 'conflicting')]);
    expect(result.excludedUnknownCount).toBe(0);
    expect(result.excludedConflictingCount).toBe(1);
  });

  it('keeps excluded and included-review counts separate in a mixed set', () => {
    const result = profile([row('A', 'active', { manualReview: true }), row('U', 'unknown'), row('C', 'conflicting')]);
    expect(result.manualReviewCount).toBe(1);
    expect(result.excludedUnknownCount).toBe(1);
    expect(result.excludedConflictingCount).toBe(1);
    expect(result.totalBrands).toBe(1);
  });

  it('preserves the all-quality-excluded blocking state', () => {
    const result = profile([row('U', 'unknown'), row('C', 'conflicting')]);
    expect(result.totalBrands).toBe(0);
    expect(result.allRowsExcludedByQuality).toBe(true);
  });

  it('has no quality counts when no signals are present', () => {
    const result = profile([row('A', 'active'), row('B', 'active', { mall: peer.mall })]);
    expect(result.manualReviewCount).toBe(0);
    expect(result.excludedUnknownCount).toBe(0);
    expect(result.excludedConflictingCount).toBe(0);
  });

  it('does not change totals, exclusivity or percentage when manualReview is toggled on an active row', () => {
    const baseline = profile([row('A', 'active'), row('B', 'active'), row('A', 'active', { mall: peer.mall })]);
    const reviewed = profile([row('A', 'active', { manualReview: true }), row('B', 'active'), row('A', 'active', { mall: peer.mall })]);
    expect({ totalBrands: reviewed.totalBrands, exclusiveCount: reviewed.exclusiveCount, exactPercent: reviewed.exactPercent, displayPercent: reviewed.displayPercent })
      .toEqual({ totalBrands: baseline.totalBrands, exclusiveCount: baseline.exclusiveCount, exactPercent: baseline.exactPercent, displayPercent: baseline.displayPercent });
  });
});
