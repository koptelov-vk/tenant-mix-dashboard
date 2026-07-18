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
  categories: string[];
  uniqueness: UniquenessStats;
  intersections: IntersectionStats;
  gaps: BrandGap[];
  similarities: MallSimilarity[];
  benchmark: BenchmarkStats;
  dataQuality: DataQualitySummary;
}
