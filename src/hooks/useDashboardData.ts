import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import type { DashboardData } from '../types/dashboard';
import { adaptDashboardCities } from '../lib/cityMapping';

const sourceQualitySchema = z.enum(['Высокая', 'Средняя', 'Низкая']);
const tenantStatusSchema = z.enum(['active', 'upcoming', 'closed', 'unknown', 'conflicting']);

const tenantRowSchema = z.object({
  mall: z.string().min(1),
  city: z.string().optional().default(''),
  brand: z.string().min(1),
  brandNormalized: z.string().min(1),
  category: z.string().min(1),
  sourceUrl: z.string().optional().default(''),
  sourceType: z.string().optional().default(''),
  sourceQuality: sourceQualitySchema.optional(),
  checkedAt: z.string().nullable().optional(),
  rowStatus: z.string().optional(),
  confirmation: z.string().optional(),
  statusNormalized: tenantStatusSchema.optional(),
  originalCategory: z.string().optional(),
  manualReview: z.boolean().optional(),
}).passthrough();

const mallSchema = z.object({
  mall: z.string().min(1),
  city: z.string().min(1),
  mallClass: z.string().default('Нет данных'),
  gla: z.number().positive().nullable(),
  gba: z.number().positive().nullable(),
  glaConfirmed: z.boolean().default(false),
  areaSource: z.string().optional(),
  areaStatus: z.string().optional(),
  areaReliability: z.string().optional(),
  brandCount: z.number().nonnegative(),
  categoryCount: z.number().nonnegative().optional(),
  uniqueGlobalCount: z.number().nonnegative().optional(),
  uniqueGlobalShare: z.number().min(0).max(1).optional(),
  categoryCounts: z.record(z.number().nonnegative()),
}).passthrough().superRefine((mall, ctx) => {
  if (mall.gla != null && mall.gba != null && mall.gla > mall.gba) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'GLA cannot exceed GBA without a documented exception' });
  }
});

const brandSourceSchema = z.object({
  mall: z.string().min(1),
  url: z.string().default(''),
  type: z.string().default(''),
  quality: sourceQualitySchema,
  checkedAt: z.string().nullable().default(null),
});

const brandPresenceSchema = z.object({
  brand: z.string().min(1),
  brandNormalized: z.string().min(1),
  category: z.string().min(1),
  malls: z.array(z.string().min(1)),
  mallCount: z.number().nonnegative(),
  sources: z.array(brandSourceSchema),
});

const upcomingSchema = z.object({
  mall: z.string().min(1),
  brand: z.string().min(1),
  category: z.string().min(1),
  status: z.string(),
  basis: z.string(),
  announcementDate: z.string(),
  plannedDate: z.string(),
  sourceUrl: z.string(),
  checkedAt: z.string(),
  reliability: sourceQualitySchema,
  comment: z.string(),
});

const dataQualitySchema = z.object({
  snapshotDate: z.string(),
  rows: z.number().nonnegative(),
  malls: z.number().nonnegative(),
  brands: z.number().nonnegative(),
  emptyBrands: z.number().nonnegative(),
  emptyNormalizedBrands: z.number().nonnegative(),
  duplicateMallBrandPairs: z.number().nonnegative(),
  invalidUrls: z.number().nonnegative(),
  mallsWithoutGla: z.number().nonnegative(),
  manualReviewRows: z.number().nonnegative(),
}).passthrough();

export const dashboardSchema = z.object({
  meta: z.object({ version: z.string().optional(), snapshotDate: z.string() }).passthrough(),
  rows: z.array(tenantRowSchema),
  mallSummary: z.array(mallSchema).min(1),
  categoryMatrix: z.object({
    categories: z.array(z.string().min(1)),
    malls: z.array(z.string()).optional(),
    counts: z.record(z.record(z.number().nonnegative())).optional(),
  }).passthrough(),
  brandPresence: z.record(brandPresenceSchema),
  mallSimilarity: z.array(z.object({
    focus: z.string(), mall: z.string(), jaccard: z.number().min(0).max(1),
    common: z.number().nonnegative(), focusOnly: z.number().nonnegative(), competitorOnly: z.number().nonnegative(),
  })),
  brandGaps: z.record(z.array(z.string())),
  upcoming: z.array(upcomingSchema),
  dataQuality: dataQualitySchema,
}).superRefine((data, ctx) => {
  const pairs = new Set<string>();
  data.rows.forEach((row, index) => {
    const pair = `${row.mall}\u0000${row.brandNormalized}`;
    if (pairs.has(pair)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rows', index], message: 'Duplicate mall and normalized brand pair' });
    pairs.add(pair);
  });
});

// The mandatory build/test pipeline validates every source row with
// dashboardSchema. Repeating that full 6 MB validation in the browser delays
// first paint, so runtime loading validates the envelope and small reference
// collections before adapting the trusted build artifact.
const runtimeDashboardSchema = z.object({
  meta: z.object({ version: z.string().optional(), snapshotDate: z.string() }).passthrough(),
  rows: z.array(z.unknown()),
  mallSummary: z.array(mallSchema).min(1),
  categoryMatrix: z.object({
    categories: z.array(z.string().min(1)),
    malls: z.array(z.string()).optional(),
    counts: z.record(z.record(z.number().nonnegative())).optional(),
  }).passthrough(),
  brandPresence: z.record(z.unknown()),
  mallSimilarity: z.array(z.unknown()),
  brandGaps: z.record(z.array(z.string())),
  upcoming: z.array(upcomingSchema),
  dataQuality: dataQualitySchema,
}).passthrough();

export async function fetchDashboardData(): Promise<DashboardData> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/dashboard_data.json`, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Не удалось загрузить данные: HTTP ${response.status}`);
  const parsed = runtimeDashboardSchema.parse(await response.json()) as DashboardData;
  return adaptDashboardCities(parsed);
}

export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard-data'],
    queryFn: fetchDashboardData,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
