export type MetricMode = 'absolute' | 'share' | 'density';

export interface TenantRow {
  mall: string;
  city: string;
  brand: string;
  brandNormalized: string;
  category: string;
  sourceUrl?: string;
  sourceType?: string;
  sourceQuality?: 'Высокая' | 'Средняя' | 'Низкая';
}

export interface MallSummary {
  mall: string;
  city: string;
  mallClass: string;
  gla: number | null;
  gba: number | null;
  glaConfirmed: boolean;
  brandCount: number;
  categoryCounts: Record<string, number>;
}

export interface DashboardData {
  meta: { snapshotDate: string };
  rows: TenantRow[];
  mallSummary: MallSummary[];
  categoryMatrix: { categories: string[] };
}

export interface MallSliceStats {
  mall: MallSummary;
  brandCount: number;
  density10kGla: number | null;
  categoryCounts: Record<string, number>;
}

export interface AnalysisContext {
  focusMall: MallSummary;
  peerMalls: MallSummary[];
  displayMalls: MallSummary[];
  filteredRows: TenantRow[];
  mallStats: MallSliceStats[];
  categories: string[];
}
