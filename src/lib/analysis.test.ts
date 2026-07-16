import { describe, expect, it } from 'vitest';
import { createAnalysisContext, median } from './analysis';
import type { DashboardData } from '../types/dashboard';

const data: DashboardData = {
  meta: { snapshotDate: '2026-07-16' },
  categoryMatrix: { categories: ['Одежда', 'Обувь'] },
  mallSummary: [
    { mall: 'Фантастика', city: 'НН', mallClass: 'Суперрегиональный', gla: 100_000, gba: 150_000, glaConfirmed: true, brandCount: 3, categoryCounts: {} },
    { mall: 'Конкурент', city: 'НН', mallClass: 'Суперрегиональный', gla: null, gba: 120_000, glaConfirmed: false, brandCount: 2, categoryCounts: {} },
  ],
  rows: [
    { mall: 'Фантастика', city: 'НН', brand: 'A', brandNormalized: 'a', category: 'Одежда' },
    { mall: 'Фантастика', city: 'НН', brand: 'B', brandNormalized: 'b', category: 'Одежда' },
    { mall: 'Фантастика', city: 'НН', brand: 'C', brandNormalized: 'c', category: 'Обувь' },
    { mall: 'Конкурент', city: 'НН', brand: 'A', brandNormalized: 'a', category: 'Одежда' },
    { mall: 'Конкурент', city: 'НН', brand: 'D', brandNormalized: 'd', category: 'Обувь' },
  ],
};

describe('createAnalysisContext', () => {
  it('uses the same category-filtered rows for KPI and mall statistics', () => {
    const context = createAnalysisContext(data, { focusMall: 'Фантастика', category: 'Одежда' });
    expect(context.filteredRows).toHaveLength(3);
    expect(context.mallStats.find((item) => item.mall.mall === 'Фантастика')?.brandCount).toBe(2);
    expect(context.mallStats.find((item) => item.mall.mall === 'Конкурент')?.brandCount).toBe(1);
  });

  it('does not calculate density without confirmed GLA', () => {
    const context = createAnalysisContext(data, { focusMall: 'Фантастика', category: 'Все категории' });
    expect(context.mallStats.find((item) => item.mall.mall === 'Конкурент')?.density10kGla).toBeNull();
  });
});

describe('median', () => {
  it('calculates even and odd medians', () => {
    expect(median([1, 3, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});
