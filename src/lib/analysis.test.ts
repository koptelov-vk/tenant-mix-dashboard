import { describe, expect, it } from 'vitest';
import { createAnalysisContext, median } from './analysis';
import type { DashboardData, TenantRow } from '../types/dashboard';

const row = (mall: string, brand: string, category: string, quality: 'Высокая' | 'Средняя' = 'Высокая'): TenantRow => ({
  mall, city: 'НН', brand, brandNormalized: brand.toLocaleLowerCase('ru'), category,
  sourceUrl: `https://example.com/${brand}`, sourceType: 'официальный сайт', sourceQuality: quality, checkedAt: '2026-07-16', rowStatus: 'active',
});

const rows = [
  row('Фантастика', 'A', 'Одежда'), row('Фантастика', 'B', 'Одежда'), row('Фантастика', 'C', 'Обувь'),
  row('Конкурент', 'A', 'Одежда'), row('Конкурент', 'D', 'Обувь'),
  row('Вне группы', 'D', 'Обувь'), row('Вне группы', 'E', 'Одежда', 'Средняя'),
];

const brandPresence = Object.fromEntries(['A', 'B', 'C', 'D', 'E'].map((brand) => {
  const brandRows = rows.filter((item) => item.brand === brand);
  return [brand.toLowerCase(), {
    brand, brandNormalized: brand.toLowerCase(), category: brandRows[0]?.category ?? 'Прочее',
    malls: brandRows.map((item) => item.mall), mallCount: brandRows.length,
    sources: brandRows.map((item) => ({ mall: item.mall, url: item.sourceUrl, type: item.sourceType, quality: item.sourceQuality ?? 'Низкая', checkedAt: item.checkedAt ?? '' })),
  }];
}));

const data: DashboardData = {
  meta: { snapshotDate: '2026-07-16' },
  categoryMatrix: { categories: ['Одежда', 'Обувь'] },
  mallSummary: [
    { mall: 'Фантастика', city: 'НН', mallClass: 'Суперрегиональный', gla: 100_000, gba: 150_000, glaConfirmed: true, brandCount: 3, categoryCounts: {} },
    { mall: 'Конкурент', city: 'НН', mallClass: 'Суперрегиональный', gla: null, gba: 120_000, glaConfirmed: false, brandCount: 2, categoryCounts: {} },
    { mall: 'Вне группы', city: 'Москва', mallClass: 'Региональный', gla: 50_000, gba: 80_000, glaConfirmed: true, brandCount: 2, categoryCounts: {} },
  ],
  rows, brandPresence, brandGaps: {}, mallSimilarity: [], upcoming: [],
  dataQuality: { snapshotDate: '2026-07-16', rows: rows.length, malls: 3, brands: 5, emptyBrands: 0, emptyNormalizedBrands: 0, duplicateMallBrandPairs: 0, invalidUrls: 0, mallsWithoutGla: 1, manualReviewRows: 0 },
};

describe('unified analysis context', () => {
  it('uses the same category-filtered rows for KPI, medians and category statistics', () => {
    const context = createAnalysisContext(data, { focusMall: 'Фантастика', category: 'Одежда', peerMalls: ['Конкурент'] });
    expect(context.filteredRows).toHaveLength(3);
    expect(context.benchmark.focusBrandCount).toBe(2);
    expect(context.benchmark.peerMedian).toBe(1);
    expect(context.categoryStats[0]?.focus.count).toBe(2);
  });

  it('keeps focus visible but excludes it from peer criteria and peer median', () => {
    const context = createAnalysisContext(data, { focusMall: 'Фантастика', category: 'Все категории', cities: ['Москва'] });
    expect(context.focusMatchesPeerCriteria).toBe(false);
    expect(context.displayMalls.map((mall) => mall.mall)).toEqual(['Фантастика', 'Вне группы']);
    expect(context.peerMalls.map((mall) => mall.mall)).toEqual(['Вне группы']);
    expect(context.benchmark.peerMedian).toBe(2);
  });

  it('excludes missing GLA from a GLA filter and never substitutes GBA for density', () => {
    const context = createAnalysisContext(data, { focusMall: 'Фантастика', category: 'Все категории', glaMin: 1 });
    expect(context.peerMalls.map((mall) => mall.mall)).toEqual(['Вне группы']);
    const noGlaContext = createAnalysisContext(data, { focusMall: 'Конкурент', category: 'Все категории' });
    expect(noGlaContext.mallStats[0]?.density10kGla).toBeNull();
  });

  it('calculates global, group and focus-exclusive uniqueness separately', () => {
    const context = createAnalysisContext(data, { focusMall: 'Фантастика', category: 'Все категории', peerMalls: ['Конкурент'] });
    expect([...context.uniqueness.global].sort()).toEqual(['b', 'c']);
    expect([...context.uniqueness.group].sort()).toEqual(['b', 'c', 'd']);
    expect([...context.uniqueness.focusExclusive].sort()).toEqual(['b', 'c']);
    expect([...context.intersections.intersecting]).toEqual(['a']);
  });

  it('recalculates Jaccard and gap candidates from the current group', () => {
    const context = createAnalysisContext(data, { focusMall: 'Фантастика', category: 'Все категории', peerMalls: ['Конкурент', 'Вне группы'], gapN: 2 });
    expect(context.similarities.find((item) => item.mall.mall === 'Конкурент')?.jaccard).toBeCloseTo(0.25);
    expect(context.gaps.map((item) => item.brandNormalized)).toEqual(['d']);
  });
});

describe('median', () => {
  it('calculates even and odd medians', () => {
    expect(median([1, 3, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});
