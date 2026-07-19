import type { AnalysisContext } from '../types/dashboard';

/** Dense ranking for positive values. Zero is outside the ranking and returns null. */
export function denseRanks(values: number[]): Array<number | null> {
  const positions = new Map(
    [...new Set(values.filter((value) => Number.isFinite(value) && value > 0))]
      .sort((left, right) => right - left)
      .map((value, index) => [value, index + 1]),
  );
  return values.map((value) => value > 0 ? positions.get(value) ?? null : null);
}

/** Canonical PRODUCT-01 ranking contract applied to the complete AnalysisContext. */
export function applyRankingContract(context: AnalysisContext): AnalysisContext {
  const mallRanks = denseRanks(context.mallStats.map((item) => item.brandCount));
  const focusMallIndex = context.mallStats.findIndex((item) => item.mall.mall === context.focusMall.mall);
  const categoryStats = context.categoryStats.map((category) => {
    const ranks = denseRanks(category.values.map((value) => value.count));
    const focusIndex = category.values.findIndex((value) => value.mall === context.focusMall.mall);
    return { ...category, rank: focusIndex < 0 ? null : ranks[focusIndex] ?? null };
  });
  return {
    ...context,
    categoryStats,
    benchmark: {
      ...context.benchmark,
      rank: focusMallIndex < 0 ? null : mallRanks[focusMallIndex] ?? null,
    },
  };
}
