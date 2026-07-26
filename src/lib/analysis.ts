import type {
  AnalysisContext,
  BenchmarkStats,
  BrandGap,
  CategoryBenchmarkPayload,
  CategoryBenchmarkState,
  CategoryProfileStats,
  CategorySliceStats,
  DashboardData,
  IntersectionStats,
  MallSimilarity,
  MallSliceStats,
  MallSummary,
  SourceQuality,
  TenantRow,
  UniquenessStats,
} from '../types/dashboard';

/** Static methodology identity for the category peer-benchmark — matches issue #141 manifest's `methodologyIds`/`methodologyVersions` exactly; not a new methodology decision. */
export const CATEGORY_BENCHMARK_METHODOLOGY = {
  count: { id: 'categoryProfile.peerMedian.count', version: '1.0.0' },
  share: { id: 'categoryProfile.peerMedian.share', version: '1.0.0' },
} as const;

export interface AnalysisFilters {
  focusMall: string;
  category: string;
  peerMalls?: string[];
  cities?: string[];
  brands?: string[];
  tenants?: string[];
  sourceTypes?: string[];
  sourceQualities?: SourceQuality[];
  glaMin?: number | null;
  glaMax?: number | null;
  gbaMin?: number | null;
  gbaMax?: number | null;
  gapN?: number;
  focusInSelectedGroup?: boolean;
}

export type TenantStatus = 'active' | 'upcoming' | 'closed' | 'unknown' | 'conflicting';

const ALL_CATEGORIES = 'Все категории';
const distinctBrands = (rows: TenantRow[]) => new Set(rows.map((row) => row.brandNormalized));

export function median(values: number[]): number | null {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[middle] ?? null;
  const left = sorted[middle - 1];
  const right = sorted[middle];
  return left === undefined || right === undefined ? null : (left + right) / 2;
}

export function normalizedStatus(row: TenantRow): TenantStatus {
  const explicit = row.statusNormalized?.trim().toLocaleLowerCase('ru');
  if (explicit === 'active' || explicit === 'upcoming' || explicit === 'closed' || explicit === 'unknown' || explicit === 'conflicting') return explicit;

  const rowStatus = (row.rowStatus ?? '').trim().toLocaleLowerCase('ru');
  const confirmation = (row.confirmation ?? '').trim().toLocaleLowerCase('ru');
  const value = `${rowStatus} ${confirmation}`.trim();
  if (!value) return 'unknown';
  if (value.includes('conflict') || value.includes('конфликт')) return 'conflicting';
  if (value.includes('unknown') || value.includes('неизвест')) return 'unknown';
  if (value.includes('upcoming') || value.includes('скоро') || value.includes('planned') || value.includes('заявлен') || value.includes('ожида')) return 'upcoming';
  if (value.includes('closed') || value.includes('закры')) return 'closed';
  if (
    value.includes('active') || value.includes('действ') || value.includes('открыт') ||
    value.includes('confirmed') || value.includes('подтвержд') || confirmation === 'ok'
  ) return 'active';
  return 'unknown';
}

const activeRows = (rows: TenantRow[]) => rows.filter((row) => normalizedStatus(row) === 'active');

function hasFiniteArea(value: number | null): value is number {
  return Number.isFinite(value) && (value ?? 0) > 0;
}

function matchesArea(mall: MallSummary, filters: AnalysisFilters): boolean {
  if (filters.glaMin != null && (!hasFiniteArea(mall.gla) || mall.gla < filters.glaMin)) return false;
  if (filters.glaMax != null && (!hasFiniteArea(mall.gla) || mall.gla > filters.glaMax)) return false;
  if (filters.gbaMin != null && (!hasFiniteArea(mall.gba) || mall.gba < filters.gbaMin)) return false;
  if (filters.gbaMax != null && (!hasFiniteArea(mall.gba) || mall.gba > filters.gbaMax)) return false;
  return true;
}

function matchesPeerCriteria(mall: MallSummary, filters: AnalysisFilters): boolean {
  return (!filters.peerMalls?.length || filters.peerMalls.includes(mall.mall))
    && (!filters.cities?.length || filters.cities.includes(mall.city))
    && matchesArea(mall, filters);
}

function matchesRow(row: TenantRow, filters: AnalysisFilters): boolean {
  return (filters.category === ALL_CATEGORIES || row.category === filters.category)
    && (!filters.brands?.length || filters.brands.includes(row.brandNormalized))
    && (!filters.tenants?.length || filters.tenants.includes(row.brand))
    && (!filters.sourceTypes?.length || filters.sourceTypes.includes(row.sourceType))
    && (!filters.sourceQualities?.length || (row.sourceQuality != null && filters.sourceQualities.includes(row.sourceQuality)));
}

function buildMallStats(malls: MallSummary[], rows: TenantRow[]): MallSliceStats[] {
  const rowsByMall = new Map<string, TenantRow[]>();
  rows.forEach((row) => {
    const values = rowsByMall.get(row.mall) ?? [];
    values.push(row);
    rowsByMall.set(row.mall, values);
  });
  return malls.map((mall) => {
    const mallRows = rowsByMall.get(mall.mall) ?? [];
    const brands = distinctBrands(mallRows);
    const categorySets = new Map<string, Set<string>>();
    mallRows.forEach((row) => {
      const set = categorySets.get(row.category) ?? new Set<string>();
      set.add(row.brandNormalized);
      categorySets.set(row.category, set);
    });
    const categoryCounts = Object.fromEntries([...categorySets].map(([category, values]) => [category, values.size]));
    return {
      mall,
      brandCount: brands.size,
      categoryCount: Object.keys(categoryCounts).length,
      density10kGla: mall.glaConfirmed && hasFiniteArea(mall.gla) ? (brands.size / mall.gla) * 10_000 : null,
      categoryCounts,
    };
  });
}

function buildCategoryStats(categories: string[], mallStats: MallSliceStats[], focusMall: MallSummary, peerMalls: MallSummary[]): CategorySliceStats[] {
  const peerNames = new Set(peerMalls.map((mall) => mall.mall));
  return categories.map((category) => {
    const values = mallStats.map((stats) => {
      const count = stats.categoryCounts[category] ?? 0;
      return {
        mall: stats.mall.mall,
        count,
        share: stats.brandCount > 0 ? count / stats.brandCount : 0,
        density: stats.mall.glaConfirmed && hasFiniteArea(stats.mall.gla) ? (count / stats.mall.gla) * 10_000 : null,
      };
    });
    const focus = values.find((value) => value.mall === focusMall.mall) ?? { mall: focusMall.mall, count: 0, share: 0, density: null };
    const peers = values.filter((value) => peerNames.has(value.mall));
    const ranked = [...values].sort((a, b) => b.count - a.count || a.mall.localeCompare(b.mall, 'ru'));
    const rankIndex = ranked.findIndex((value) => value.mall === focusMall.mall);
    return {
      category,
      values,
      focus,
      countMedian: median(peers.map((value) => value.count)),
      shareMedian: median(peers.map((value) => value.share)),
      densityMedian: median(peers.flatMap((value) => value.density == null ? [] : [value.density])),
      min: peers.length ? Math.min(...peers.map((value) => value.count)) : focus.count,
      max: peers.length ? Math.max(...peers.map((value) => value.count)) : focus.count,
      rank: rankIndex < 0 ? null : rankIndex + 1,
    };
  });
}

export function buildCategoryProfiles(
  data: DashboardData,
  rows: TenantRow[],
  focusMall: MallSummary,
  peerMalls: MallSummary[],
  categories: string[],
): CategoryProfileStats[] {
  const peerNames = new Set(peerMalls.map((mall) => mall.mall));
  const allowedMalls = new Set([focusMall.mall, ...peerNames]);
  const scopedRows = rows.filter((row) => allowedMalls.has(row.mall));

  return categories.map((category) => {
    const categoryRows = scopedRows.filter((row) => row.category === category);
    const focusBrands = new Set<string>();
    const peerBrands = new Set<string>();
    let excludedUnknownCount = 0;
    let excludedConflictingCount = 0;
    let manualReviewCount = 0;

    categoryRows.forEach((row) => {
      const status = normalizedStatus(row);
      if (status === 'unknown') {
        excludedUnknownCount += 1;
        return;
      }
      if (status === 'conflicting') {
        excludedConflictingCount += 1;
        return;
      }
      if (status !== 'active') return;
      if (row.manualReview) manualReviewCount += 1;
      if (row.mall === focusMall.mall) focusBrands.add(row.brandNormalized);
      else if (peerNames.has(row.mall)) peerBrands.add(row.brandNormalized);
    });

    const exclusiveBrands = new Set([...focusBrands].filter((brand) => !peerBrands.has(brand)));
    const totalBrands = focusBrands.size;
    const exclusiveCount = exclusiveBrands.size;
    const exactPercent = totalBrands ? (exclusiveCount / totalBrands) * 100 : null;
    const qualityIssues = [
      excludedUnknownCount ? `${excludedUnknownCount} записей с неизвестным статусом исключено` : '',
      excludedConflictingCount ? `${excludedConflictingCount} конфликтующих записей исключено` : '',
      manualReviewCount ? `${manualReviewCount} записей требуют ручной проверки` : '',
    ].filter(Boolean);
    const upcomingCount = new Set(data.upcoming
      .filter((item) => item.mall === focusMall.mall && item.category === category)
      .map((item) => item.brand.toLocaleLowerCase('ru'))).size;

    return {
      category,
      totalBrands,
      exclusiveBrands,
      exclusiveCount,
      exactPercent,
      displayPercent: exactPercent == null ? null : Math.round(exactPercent),
      upcomingCount,
      excludedUnknownCount,
      excludedConflictingCount,
      manualReviewCount,
      qualityIssues,
      sourceRowCount: categoryRows.length,
      allRowsExcludedByQuality: categoryRows.length > 0 && totalBrands === 0 && (excludedUnknownCount + excludedConflictingCount) === categoryRows.length,
    };
  }).sort((a, b) => b.totalBrands - a.totalBrands || a.category.localeCompare(b.category, 'ru'));
}

/**
 * Focus-specific quality signal, computed independently of buildCategoryProfiles's category-wide
 * (focus+peers combined) allRowsExcludedByQuality — the benchmark's `quality_excluded` state must
 * reflect whether the FOCUS object's own rows are excluded, not the whole comparison group's.
 * `focusRowCount === 0` is deliberately NOT treated as evidence of unavailability (see stop condition
 * in the analysis notes / #170 corrective review): a focus mall having zero rows for a known category
 * is a valid, real zero, not a signal that the value is unknown. No upstream field in TenantRow
 * distinguishes "confirmed absent" from "not observed", so that distinction is not fabricated here.
 */
function focusQualitySignal(categoryRows: TenantRow[], focusMall: MallSummary): { focusRowCount: number; focusExcludedCount: number; focusFullyExcludedByQuality: boolean } {
  const focusRows = categoryRows.filter((row) => row.mall === focusMall.mall);
  let focusActiveCount = 0;
  let focusExcludedCount = 0;
  focusRows.forEach((row) => {
    const status = normalizedStatus(row);
    if (status === 'unknown' || status === 'conflicting') { focusExcludedCount += 1; return; }
    if (status === 'active') focusActiveCount += 1;
  });
  return {
    focusRowCount: focusRows.length,
    focusExcludedCount,
    focusFullyExcludedByQuality: focusRows.length > 0 && focusActiveCount === 0 && focusExcludedCount === focusRows.length,
  };
}

function categoryBenchmarkState(sourceRowCount: number, focusFullyExcludedByQuality: boolean, excludedConflictingCount: number, hasOtherExclusions: boolean, peerCount: number): CategoryBenchmarkState {
  if (sourceRowCount === 0) return 'no_data';
  if (focusFullyExcludedByQuality) return 'quality_excluded';
  if (excludedConflictingCount > 0) return 'conflicting';
  if (hasOtherExclusions) return 'partial_quality';
  if (peerCount === 0) return 'no_peers';
  return 'ok';
}

/**
 * Joins CategorySliceStats (raw peer values/medians) with CategoryProfileStats (quality state) into
 * the canonical CategoryBenchmarkPayload per the accepted #141 contract. Deviation is computed here
 * from raw exact values only — no consumer-side median, no intermediate rounding.
 */
export function buildCategoryBenchmarkPayloads(
  categoryStats: CategorySliceStats[],
  categoryProfiles: CategoryProfileStats[],
  scopedRows: TenantRow[],
  focusMall: MallSummary,
  peerMalls: MallSummary[],
  dataVersion: string,
  dataSnapshotAt: string,
): CategoryBenchmarkPayload[] {
  const profileByCategory = new Map(categoryProfiles.map((profile) => [profile.category, profile]));
  return categoryStats.map((stats) => {
    const profile = profileByCategory.get(stats.category);
    const sourceRowCount = profile?.sourceRowCount ?? 0;
    const excludedConflictingCount = profile?.excludedConflictingCount ?? 0;
    const excludedCount = (profile?.excludedUnknownCount ?? 0) + excludedConflictingCount;
    // Includes conflicting exclusions too; harmless because categoryBenchmarkState checks
    // excludedConflictingCount > 0 first, so 'conflicting' always wins over 'partial_quality'.
    const hasOtherExclusions = excludedCount > 0;
    const categoryRows = scopedRows.filter((row) => row.category === stats.category);
    const { focusFullyExcludedByQuality } = focusQualitySignal(categoryRows, focusMall);
    const peerValues = stats.values.filter((value) => value.mall !== focusMall.mall).map((value) => value.count);
    const peerSharesExact = stats.values.filter((value) => value.mall !== focusMall.mall).map((value) => value.share);
    const noData = sourceRowCount === 0;
    const state = categoryBenchmarkState(sourceRowCount, focusFullyExcludedByQuality, excludedConflictingCount, hasOtherExclusions, peerMalls.length);

    const focusValue = noData || focusFullyExcludedByQuality ? null : stats.focus.count;
    const peerMedian = noData ? null : stats.countMedian;
    const focusShareExact = noData || focusFullyExcludedByQuality ? null : stats.focus.share;
    const peerMedianShareExact = noData ? null : stats.shareMedian;
    const shareExactDelta = focusShareExact != null && peerMedianShareExact != null ? focusShareExact - peerMedianShareExact : null;

    return {
      payloadId: `category-benchmark:${stats.category}`,
      payloadVersion: '1.0.0',
      categoryId: stats.category,
      focusObjectId: focusMall.mall,
      peerObjectIds: peerMalls.map((mall) => mall.mall),
      count: {
        focusValue,
        peerMedian,
        deviation: focusValue != null && peerMedian != null ? focusValue - peerMedian : null,
        deviationUnit: 'brands',
        peerValues,
      },
      share: {
        focusShareExact,
        peerMedianShareExact,
        shareExactDelta,
        deviation: shareExactDelta != null ? shareExactDelta * 100 : null,
        deviationUnit: 'percentage_points',
        peerSharesExact,
      },
      defaultMode: 'count',
      availableModes: ['count', 'share'],
      focusExcludedFromMedian: true,
      state,
      quality: { state, limitations: profile?.qualityIssues ?? [] },
      peerCount: peerMalls.length,
      includedCount: sourceRowCount - excludedCount,
      excludedCount,
      methodologyId: CATEGORY_BENCHMARK_METHODOLOGY.count.id,
      methodologyVersion: CATEGORY_BENCHMARK_METHODOLOGY.count.version,
      dataVersion,
      dataSnapshotAt,
    };
  });
}

/**
 * Deterministic sort: by deviation (in the active mode) descending, rows with a null deviation
 * sorted after all computable rows, ties (including all-null groups) broken by categoryId ascending.
 */
export function sortCategoryBenchmarkPayloads(payloads: CategoryBenchmarkPayload[], mode: 'count' | 'share'): CategoryBenchmarkPayload[] {
  return [...payloads].sort((a, b) => {
    const deviationA = mode === 'count' ? a.count.deviation : a.share.deviation;
    const deviationB = mode === 'count' ? b.count.deviation : b.share.deviation;
    if (deviationA == null && deviationB == null) return a.categoryId.localeCompare(b.categoryId, 'ru');
    if (deviationA == null) return 1;
    if (deviationB == null) return -1;
    if (deviationA !== deviationB) return deviationB - deviationA;
    return a.categoryId.localeCompare(b.categoryId, 'ru');
  });
}

function buildIntersections(rows: TenantRow[], focusMall: MallSummary): IntersectionStats {
  const presence = new Map<string, Set<string>>();
  rows.forEach((row) => {
    const malls = presence.get(row.brandNormalized) ?? new Set<string>();
    malls.add(row.mall);
    presence.set(row.brandNormalized, malls);
  });
  const focusBrands = distinctBrands(rows.filter((row) => row.mall === focusMall.mall));
  return {
    focusBrands,
    presence,
    intersecting: new Set([...focusBrands].filter((brand) => (presence.get(brand)?.size ?? 0) > 1)),
  };
}

function buildUniqueness(allActiveRows: TenantRow[], intersections: IntersectionStats, displayMalls: MallSummary[]): UniquenessStats {
  const globalPresence = new Map<string, Set<string>>();
  allActiveRows.forEach((row) => {
    const malls = globalPresence.get(row.brandNormalized) ?? new Set<string>();
    malls.add(row.mall);
    globalPresence.set(row.brandNormalized, malls);
  });
  const group = new Set([...intersections.presence].filter(([, malls]) => malls.size === 1).map(([brand]) => brand));
  const focusExclusive = new Set([...intersections.focusBrands].filter((brand) => intersections.presence.get(brand)?.size === 1));
  const global = new Set([...intersections.focusBrands].filter((brand) => globalPresence.get(brand)?.size === 1));
  return { global, group, focusExclusive, scopeLabel: `Уникальность рассчитана внутри группы из ${displayMalls.length} объектов` };
}

function buildSimilarities(rows: TenantRow[], focusMall: MallSummary, peerMalls: MallSummary[]): MallSimilarity[] {
  const brandsByMall = new Map<string, Set<string>>();
  rows.forEach((row) => {
    const brands = brandsByMall.get(row.mall) ?? new Set<string>();
    brands.add(row.brandNormalized);
    brandsByMall.set(row.mall, brands);
  });
  const focusBrands = brandsByMall.get(focusMall.mall) ?? new Set<string>();
  return peerMalls.map((mall) => {
    const competitorBrands = brandsByMall.get(mall.mall) ?? new Set<string>();
    const common = [...focusBrands].filter((brand) => competitorBrands.has(brand)).length;
    const union = new Set([...focusBrands, ...competitorBrands]).size;
    return { mall, jaccard: union ? common / union : 0, common, focusOnly: focusBrands.size - common, competitorOnly: competitorBrands.size - common };
  }).sort((a, b) => b.jaccard - a.jaccard || a.mall.mall.localeCompare(b.mall.mall, 'ru'));
}

function buildGaps(data: DashboardData, filters: AnalysisFilters, peerMalls: MallSummary[], intersections: IntersectionStats): BrandGap[] {
  const peerNames = new Set(peerMalls.map((mall) => mall.mall));
  const threshold = Math.max(1, filters.gapN ?? 3);
  const activePresence = new Map<string, Set<string>>();
  activeRows(data.rows).forEach((row) => {
    const malls = activePresence.get(row.brandNormalized) ?? new Set<string>();
    malls.add(row.mall);
    activePresence.set(row.brandNormalized, malls);
  });

  return Object.values(data.brandPresence).flatMap((brand) => {
    if (intersections.focusBrands.has(brand.brandNormalized)) return [];
    if (filters.category !== ALL_CATEGORIES && brand.category !== filters.category) return [];
    const malls = [...(activePresence.get(brand.brandNormalized) ?? [])].filter((mall) => peerNames.has(mall));
    const sources = brand.sources.filter((source) => malls.includes(source.mall) && source.url);
    const source = sources.filter((item) => !filters.sourceQualities?.length || filters.sourceQualities.includes(item.quality)).sort((a, b) => qualityRank(b.quality) - qualityRank(a.quality))[0];
    if (malls.length < threshold || !source) return [];
    return [{ brand: brand.brand, brandNormalized: brand.brandNormalized, category: brand.category, malls, mallCount: malls.length, share: peerMalls.length ? malls.length / peerMalls.length : 0, source }];
  }).sort((a, b) => b.mallCount - a.mallCount || a.brand.localeCompare(b.brand, 'ru'));
}

function qualityRank(quality: SourceQuality): number {
  return quality === 'Высокая' ? 3 : quality === 'Средняя' ? 2 : 1;
}

function buildBenchmark(focusMall: MallSummary, mallStats: MallSliceStats[], peerMalls: MallSummary[], categoryStats: CategorySliceStats[]): BenchmarkStats {
  const focusStats = mallStats.find((stats) => stats.mall.mall === focusMall.mall);
  const peerNames = new Set(peerMalls.map((mall) => mall.mall));
  const peers = mallStats.filter((stats) => peerNames.has(stats.mall.mall));
  const ranked = [focusStats, ...peers].filter((value): value is MallSliceStats => value != null).sort((a, b) => b.brandCount - a.brandCount || a.mall.mall.localeCompare(b.mall.mall, 'ru'));
  const rankIndex = ranked.findIndex((value) => value.mall.mall === focusMall.mall);
  return { focusBrandCount: focusStats?.brandCount ?? 0, peerMedian: median(peers.map((stats) => stats.brandCount)), rank: rankIndex < 0 ? null : rankIndex + 1, totalInGroup: ranked.length, categoryGaps: categoryStats.filter((stats) => stats.countMedian != null && stats.focus.count < stats.countMedian).map((stats) => stats.category) };
}

export function createAnalysisContext(data: DashboardData, filters: AnalysisFilters): AnalysisContext {
  const focusMall = data.mallSummary.find((mall) => mall.mall === filters.focusMall) ?? data.mallSummary[0];
  if (!focusMall) throw new Error('В данных отсутствуют объекты');

  const focusMatchesPeerCriteria = matchesPeerCriteria(focusMall, filters);
  const peerMalls = data.mallSummary.filter((mall) => mall.mall !== focusMall.mall && matchesPeerCriteria(mall, filters));
  const displayMalls = [focusMall, ...peerMalls];
  const allowedMalls = new Set(displayMalls.map((mall) => mall.mall));
  const scopedRows = data.rows.filter((row) => allowedMalls.has(row.mall) && matchesRow(row, filters));
  const filteredRows = activeRows(scopedRows);
  const categories = filters.category === ALL_CATEGORIES ? data.categoryMatrix.categories : [filters.category];
  const mallStats = buildMallStats(displayMalls, filteredRows);
  const categoryStats = buildCategoryStats(categories, mallStats, focusMall, peerMalls);
  const categoryProfiles = buildCategoryProfiles(data, scopedRows, focusMall, peerMalls, categories);
  const categoryBenchmarks = buildCategoryBenchmarkPayloads(categoryStats, categoryProfiles, scopedRows, focusMall, peerMalls, data.meta.version ?? 'unknown', data.dataQuality.snapshotDate);
  const intersections = buildIntersections(filteredRows, focusMall);
  const uniqueness = buildUniqueness(activeRows(data.rows), intersections, displayMalls);

  return {
    focusMall,
    peerMalls,
    displayMalls,
    focusMatchesPeerCriteria,
    focusInSelectedGroup: filters.focusInSelectedGroup ?? true,
    filteredRows,
    mallStats,
    categoryStats,
    categoryProfiles,
    categoryBenchmarks,
    categories,
    uniqueness,
    intersections,
    gaps: buildGaps(data, filters, peerMalls, intersections),
    similarities: buildSimilarities(filteredRows, focusMall, peerMalls),
    benchmark: buildBenchmark(focusMall, mallStats, peerMalls, categoryStats),
    dataQuality: data.dataQuality,
  };
}
