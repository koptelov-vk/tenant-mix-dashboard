import type { AnalysisContext, DashboardData } from '../../types/dashboard';

export interface ScenarioSimilarity {
  mall: string;
  jaccard: number;
  common: number;
  focusOnly: number;
  competitorOnly: number;
}

export interface ScenarioResult {
  totalBrands: number;
  categoryCounts: Record<string, number>;
  categoryShares: Record<string, number>;
  focusExclusive: number;
  intersections: number;
  similarities: ScenarioSimilarity[];
}

function calculateResult(
  brands: Set<string>,
  context: AnalysisContext,
  data: DashboardData,
): ScenarioResult {
  const categoryCounts: Record<string, number> = {};
  let focusExclusive = 0;
  let intersections = 0;

  brands.forEach((brand) => {
    const category = data.brandPresence[brand]?.category ?? 'Прочее';
    categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
    const peerPresence = context.intersections.presence.get(brand);
    const isPresentAtPeer = context.peerMalls.some((mall) => peerPresence?.has(mall.mall));
    if (isPresentAtPeer) intersections += 1;
    else focusExclusive += 1;
  });

  const categoryShares = Object.fromEntries(
    Object.entries(categoryCounts).map(([category, count]) => [category, brands.size ? count / brands.size : 0]),
  );

  const similarities = context.peerMalls.map((mall) => {
    const competitorBrands = new Set(
      [...context.intersections.presence]
        .filter(([, malls]) => malls.has(mall.mall))
        .map(([brand]) => brand),
    );
    const common = [...brands].filter((brand) => competitorBrands.has(brand)).length;
    const union = new Set([...brands, ...competitorBrands]).size;
    return {
      mall: mall.mall,
      jaccard: union ? common / union : 0,
      common,
      focusOnly: brands.size - common,
      competitorOnly: competitorBrands.size - common,
    };
  }).sort((a, b) => b.jaccard - a.jaccard || a.mall.localeCompare(b.mall, 'ru'));

  return {
    totalBrands: brands.size,
    categoryCounts,
    categoryShares,
    focusExclusive,
    intersections,
    similarities,
  };
}

export function calculateScenario(
  context: AnalysisContext,
  data: DashboardData,
  addedBrandIds: string[],
  removedBrandIds: string[],
): { baseline: ScenarioResult; scenario: ScenarioResult } {
  const baselineBrands = new Set(context.intersections.focusBrands);
  const scenarioBrands = new Set(baselineBrands);
  removedBrandIds.forEach((brand) => scenarioBrands.delete(brand));
  addedBrandIds.forEach((brand) => scenarioBrands.add(brand));

  return {
    baseline: calculateResult(baselineBrands, context, data),
    scenario: calculateResult(scenarioBrands, context, data),
  };
}
