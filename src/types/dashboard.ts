export type MetricMode = 'absolute' | 'share' | 'density';
export type SourceQuality = 'Высокая' | 'Средняя' | 'Низкая';
export type TenantStatus = 'active' | 'upcoming' | 'closed' | 'unknown' | 'conflicting';

export interface TenantRow {
  mall: string;
  city: string;
  brand: string;
  brandNormalized: string;
  category: string;
  sourceUrl: string;
  sourceType: string;
  sourceQuality?: SourceQuality;
  checkedAt?: string | null;
  rowStatus?: string;
  confirmation?: string;
  statusNormalized?: TenantStatus;
  originalCategory?: string;
  manualReview?: boolean;
}

export interface MallSummary {
  mall: string;
  city: string;
  mallClass: string;
  gla: number | null;
  gba: number | null;
  glaConfirmed: boolean;
  areaSource?: string;
  areaStatus?: string;
  areaReliability?: string;
  brandCount: number;
  categoryCount?: number;
  uniqueGlobalCount?: number;
  uniqueGlobalShare?: number;
  categoryCounts: Record<string, number>;
}

export interface BrandSource {
  mall: string;
  url: string;
  type: string;
  quality: SourceQuality;
  checkedAt: string | null;
}

export interface BrandPresence {
  brand: string;
  brandNormalized: string;
  category: string;
  malls: string[];
  mallCount: number;
  sources: BrandSource[];
}

export interface UpcomingOpening {
  mall: string;
  brand: string;
  category: string;
  status: string;
  basis: string;
  announcementDate: string;
  plannedDate: string;
  sourceUrl: string;
  checkedAt: string;
  reliability: SourceQuality;
  comment: string;
}

export interface DataQualitySummary {
  snapshotDate: string;
  rows: number;
  activeRows?: number;
  malls: number;
  brands: number;
  emptyBrands: number;
  emptyNormalizedBrands: number;
  duplicateMallBrandPairs: number;
  invalidUrls: number;
  mallsWithoutGla: number;
  manualReviewRows: number;
  statusCounts?: Record<TenantStatus, number>;
  missingBothStatusFields?: number;
  excludedFromActiveAggregates?: number;
}

export interface DashboardData {
  meta: { version?: string; snapshotDate: string };
  rows: TenantRow[];
  mallSummary: MallSummary[];
  categoryMatrix: { categories: string[]; malls?: string[]; counts?: Record<string, Record<string, number>> };
  brandPresence: Record<string, BrandPresence>;
  mallSimilarity: Array<{ focus: string; mall: string; jaccard: number; common: number; focusOnly: number; competitorOnly: number }>;
  brandGaps: Record<string, string[]>;
  upcoming: UpcomingOpening[];
  dataQuality: DataQualitySummary;
}

export interface MallSliceStats {
  mall: MallSummary;
  brandCount: number;
  categoryCount: number;
  density10kGla: number | null;
  categoryCounts: Record<string, number>;
}

export interface CategoryMallValue {
  mall: string;
  count: number;
  share: number;
  density: number | null;
}

export interface CategorySliceStats {
  category: string;
  values: CategoryMallValue[];
  focus: CategoryMallValue;
  countMedian: number | null;
  shareMedian: number | null;
  densityMedian: number | null;
  min: number;
  max: number;
  rank: number | null;
}

export interface CategoryProfileStats {
  category: string;
  totalBrands: number;
  exclusiveBrands: Set<string>;
  exclusiveCount: number;
  exactPercent: number | null;
  displayPercent: number | null;
  upcomingCount: number;
  excludedUnknownCount: number;
  excludedConflictingCount: number;
  manualReviewCount: number;
  qualityIssues: string[];
  sourceRowCount: number;
  allRowsExcludedByQuality: boolean;
}

export interface UniquenessStats {
  global: Set<string>;
  group: Set<string>;
  focusExclusive: Set<string>;
  scopeLabel: string;
}

export interface IntersectionStats {
  focusBrands: Set<string>;
  intersecting: Set<string>;
  presence: Map<string, Set<string>>;
}

export interface BrandGap {
  brand: string;
  brandNormalized: string;
  category: string;
  malls: string[];
  mallCount: number;
  share: number;
  source: BrandSource;
}

export interface MallSimilarity {
  mall: MallSummary;
  jaccard: number;
  common: number;
  focusOnly: number;
  competitorOnly: number;
}

export interface BenchmarkStats {
  focusBrandCount: number;
  peerMedian: number | null;
  rank: number | null;
  totalInGroup: number;
  categoryGaps: string[];
}

/** Comparison/data/quality state shared by count and share modes — matches the accepted #141 contract's `state`/`quality.state` values. */
export type CategoryBenchmarkState = 'ok' | 'no_peers' | 'no_data' | 'partial_quality' | 'quality_excluded' | 'conflicting';
export type CategoryBenchmarkMode = 'count' | 'share';
export type CategoryBenchmarkComparisonState = 'above' | 'below' | 'equal' | 'unavailable';

export interface CategoryBenchmarkCountStats {
  focusValue: number | null;
  peerMedian: number | null;
  deviationRaw: number | null;
  deviationUnit: 'brands';
  peerValues: number[];
  comparisonState: CategoryBenchmarkComparisonState;
}

export interface CategoryBenchmarkShareStats {
  focusShareExact: number | null;
  peerMedianShareExact: number | null;
  shareExactDelta: number | null;
  deviationRaw: number | null;
  deviationUnit: 'percentage_points';
  peerSharesExact: number[];
  comparisonState: CategoryBenchmarkComparisonState;
}

/**
 * Exact runtime contract accepted for Issue #172. The historical #141 v1
 * fixture package remains test evidence only; production has one v2 payload.
 */
export interface CanonicalCategoryBenchmarkPayload172 {
  payloadId: string;
  payloadVersion: '2.0.0';
  categoryId: string;
  focusObjectId: string;
  peerObjectIds: string[];
  count: CategoryBenchmarkCountStats;
  share: CategoryBenchmarkShareStats;
  quality: { state: CategoryBenchmarkState; limitations: string[] };
  provenance: {
    sourceFixtureId: string;
    ownerDecisionCommentId: 5085245278;
    rawInputSha256: string;
  };
  state: CategoryBenchmarkState;
  defaultMode: 'count';
  availableModes: CategoryBenchmarkMode[];
  focusExcludedFromMedian: true;
}

/**
 * Internal calculation model — a strict superset of CanonicalCategoryBenchmarkPayload172.
 * Carries additional metadata (methodology identity, peer/inclusion counts) that
 * Issue #170's minimum-fields contract requires as semantics, but which the immutable
 * #172 schema's `additionalProperties:false` does not allow as top-level payload keys.
 * `toCanonicalBenchmarkPayload()` is the one pure adapter that strips this down to the
 * exact v2 schema shape.
 */
export interface CategoryBenchmarkPayload extends CanonicalCategoryBenchmarkPayload172 {
  peerCount: number;
  includedCount: number;
  excludedCount: number;
  methodologyId: string;
  methodologyVersion: string;
  dataVersion: string;
  dataSnapshotAt: string;
}

export interface CategoryBenchmarkDisplayProjection {
  mode: CategoryBenchmarkMode;
  deviationRaw: number | null;
  comparisonState: CategoryBenchmarkComparisonState;
  displayDeviation: number | null;
  displayRelationText: string;
  displayUnit: 'brands' | 'percentage_points';
  accessibleRelationText: string;
  glyph: '▲' | '▼' | '●' | null;
  cssState: CategoryBenchmarkComparisonState;
  boundaryApplied: boolean;
  consumerCalculations: [];
}

/** One row of the PDF/export quality summary — built only from real per-category canonical states, no invented metrics. */
export interface CategoryBenchmarkExportRow {
  categoryId: string;
  mode: CategoryBenchmarkMode;
  focusValueRaw: number | null;
  peerMedianRaw: number | null;
  deviationRaw: number | null;
  deviationUnit: 'brands' | 'percentage_points';
  state: CategoryBenchmarkState;
  limitations: string[];
  projection: CategoryBenchmarkDisplayProjection;
}

/** Category counts by state — the PDF quality summary is rendered directly from this, never a separately-invented metric. */
export interface CategoryBenchmarkQualitySummary {
  totalCategories: number;
  fullData: number;
  partialQuality: number;
  conflicting: number;
  qualityExcluded: number;
  noData: number;
  noPeers: number;
  excludedRecordCount: number;
}

export interface CategoryBenchmarkExportManifest {
  mode: CategoryBenchmarkMode;
  dataVersion: string;
  dataSnapshotAt: string;
  methodologyId: string;
  methodologyVersion: string;
  categories: CategoryBenchmarkExportRow[];
  qualitySummary: CategoryBenchmarkQualitySummary;
}

export interface AnalysisContext {
  focusMall: MallSummary;
  peerMalls: MallSummary[];
  displayMalls: MallSummary[];
  focusMatchesPeerCriteria: boolean;
  focusInSelectedGroup: boolean;
  filteredRows: TenantRow[];
  mallStats: MallSliceStats[];
  categoryStats: CategorySliceStats[];
  categoryProfiles: CategoryProfileStats[];
  categoryBenchmarks: CategoryBenchmarkPayload[];
  categories: string[];
  uniqueness: UniquenessStats;
  intersections: IntersectionStats;
  gaps: BrandGap[];
  similarities: MallSimilarity[];
  benchmark: BenchmarkStats;
  dataQuality: DataQualitySummary;
}
