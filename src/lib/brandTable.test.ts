import { describe, expect, it } from 'vitest';
import { buildBrandTableRows, selectPrimarySource } from './brandTable';
import type { AnalysisContext, DashboardData, TenantRow } from '../types/dashboard';

const row = (mall: string, brand: string, quality: 'Высокая' | 'Средняя' | 'Низкая' = 'Средняя', checkedAt = '2026-07-10'): TenantRow => ({ mall, city: mall, brand, brandNormalized: brand.toLocaleLowerCase('ru'), category: 'Одежда', sourceUrl: `https://${mall}.example/${brand}`, sourceType: 'Официальный сайт', sourceQuality: quality, checkedAt });

function fixture(rows: TenantRow[], globalCounts: Record<string, number>) {
  const mall = (name: string) => ({ mall: name, city: name, mallClass: 'Региональный', gla: 1, gba: 2, glaConfirmed: true, brandCount: 1, categoryCounts: {} });
  const malls = [...new Set(rows.map((item) => item.mall))].map(mall);
  const data = { rows, mallSummary: malls, brandPresence: Object.fromEntries([...new Set(rows.map((item) => item.brandNormalized))].map((key) => [key, { brand: rows.find((item) => item.brandNormalized === key)!.brand, brandNormalized: key, category: 'Одежда', malls: [], mallCount: globalCounts[key] ?? 1, sources: [] }])), categoryMatrix: { categories: ['Одежда'] }, mallSimilarity: [], brandGaps: {}, upcoming: [], dataQuality: {} as DashboardData['dataQuality'], meta: { snapshotDate: '2026-07-16' } } as DashboardData;
  const focusMall = malls.find((item) => item.mall === 'Фокус') ?? malls[0]!;
  const context = { focusMall, peerMalls: malls.filter((item) => item.mall !== focusMall.mall), displayMalls: malls, filteredRows: rows } as AnalysisContext;
  return { data, context };
}

describe('brand table aggregation', () => {
  it('creates one row per normalized brand and removes duplicate malls', () => {
    const rows = [row('Фокус', 'A'), row('Фокус', 'A'), row('Peer', 'A'), row('Peer', 'B')];
    const { data, context } = fixture(rows, { a: 2, b: 4 });
    const result = buildBrandTableRows(context, data);
    expect(result).toHaveLength(2);
    expect(result.find((item) => item.brand === 'A')?.malls).toEqual(['Фокус', 'Peer']);
  });

  it('applies focus exclusive, global unique, group unique and intersecting priority', () => {
    const rows = [row('Фокус', 'A'), row('Peer', 'B'), row('Peer', 'C'), row('Peer 2', 'C')];
    const { data, context } = fixture(rows, { a: 1, b: 3, c: 3 });
    const result = Object.fromEntries(buildBrandTableRows(context, data).map((item) => [item.brand, item.characteristic]));
    expect(result).toEqual({ A: 'focus-exclusive', B: 'group-unique', C: 'intersecting' });
  });

  it('marks a non-focus globally unique brand as global unique', () => {
    const rows = [row('Фокус', 'A'), row('Peer', 'B')];
    const { data, context } = fixture(rows, { a: 2, b: 1 });
    expect(buildBrandTableRows(context, data).find((item) => item.brand === 'B')?.characteristic).toBe('global-unique');
  });

  it('selects source by quality, freshness and official status', () => {
    const selected = selectPrimarySource([row('A', 'X', 'Средняя', '2026-07-16'), row('B', 'X', 'Высокая', '2026-01-01')]);
    expect(selected.mall).toBe('B');
    expect(selected.label).toBe('Официальный сайт');
  });

  it('sorts focus first and comparison objects alphabetically', () => {
    const rows = [row('Ярославль', 'A'), row('Фокус', 'A'), row('Архангельск', 'A')];
    const { data, context } = fixture(rows, { a: 3 });
    expect(buildBrandTableRows(context, data)[0]?.malls).toEqual(['Фокус', 'Архангельск', 'Ярославль']);
  });

  it('keeps the focus-exclusive status above global uniqueness', () => {
    const rows = [row('Фокус', 'A')];
    const { data, context } = fixture(rows, { a: 1 });
    expect(buildBrandTableRows(context, data)[0]?.characteristic).toBe('focus-exclusive');
  });
});
