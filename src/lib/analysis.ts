import type { AnalysisContext, DashboardData, MallSliceStats, MallSummary, TenantRow } from '../types/dashboard';

export interface AnalysisFilters {
  focusMall: string;
  category: string;
  peerMalls?: string[];
}

const distinctBrands = (rows: TenantRow[]) => new Set(rows.map((row) => row.brandNormalized));

function buildMallStats(malls: MallSummary[], rows: TenantRow[]): MallSliceStats[] {
  return malls.map((mall) => {
    const mallRows = rows.filter((row) => row.mall === mall.mall);
    const brands = distinctBrands(mallRows);
    const categoryCounts = mallRows.reduce<Record<string, Set<string>>>((acc, row) => {
      (acc[row.category] ??= new Set()).add(row.brandNormalized);
      return acc;
    }, {});

    return {
      mall,
      brandCount: brands.size,
      density10kGla:
        mall.glaConfirmed && Number.isFinite(mall.gla) && (mall.gla ?? 0) > 0
          ? (brands.size / (mall.gla as number)) * 10_000
          : null,
      categoryCounts: Object.fromEntries(
        Object.entries(categoryCounts).map(([category, values]) => [category, values.size]),
      ),
    };
  });
}

export function createAnalysisContext(data: DashboardData, filters: AnalysisFilters): AnalysisContext {
  const focusMall = data.mallSummary.find((mall) => mall.mall === filters.focusMall) ?? data.mallSummary[0];
  if (!focusMall) throw new Error('В данных отсутствуют торговые центры');

  const peerMalls = data.mallSummary.filter(
    (mall) => mall.mall !== focusMall.mall && (!filters.peerMalls?.length || filters.peerMalls.includes(mall.mall)),
  );
  const displayMalls = [focusMall, ...peerMalls];
  const allowedMalls = new Set(displayMalls.map((mall) => mall.mall));
  const filteredRows = data.rows.filter(
    (row) => allowedMalls.has(row.mall) && (filters.category === 'Все категории' || row.category === filters.category),
  );

  return {
    focusMall,
    peerMalls,
    displayMalls,
    filteredRows,
    mallStats: buildMallStats(displayMalls, filteredRows),
    categories:
      filters.category === 'Все категории' ? data.categoryMatrix.categories : [filters.category],
  };
}

export function median(values: number[]): number | null {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[middle] ?? null;
  const left = sorted[middle - 1];
  const right = sorted[middle];
  return left === undefined || right === undefined ? null : (left + right) / 2;
}
