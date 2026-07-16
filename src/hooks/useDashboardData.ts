import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import type { DashboardData } from '../types/dashboard';

const tenantRowSchema = z.object({
  mall: z.string().min(1),
  city: z.string().default(''),
  brand: z.string().min(1),
  brandNormalized: z.string().min(1),
  category: z.string().min(1),
  sourceUrl: z.string().optional().default(''),
  sourceType: z.string().optional().default(''),
  sourceQuality: z.enum(['Высокая', 'Средняя', 'Низкая']).optional(),
}).passthrough();

const mallSchema = z.object({
  mall: z.string().min(1),
  city: z.string().default(''),
  mallClass: z.string().default('Нет данных'),
  gla: z.number().nullable(),
  gba: z.number().nullable(),
  glaConfirmed: z.boolean().default(false),
  brandCount: z.number().nonnegative(),
  categoryCounts: z.record(z.number().nonnegative()),
}).passthrough();

const dashboardSchema = z.object({
  meta: z.object({ snapshotDate: z.string() }).passthrough(),
  rows: z.array(tenantRowSchema),
  mallSummary: z.array(mallSchema).min(1),
  categoryMatrix: z.object({ categories: z.array(z.string()) }).passthrough(),
}).passthrough();

async function fetchDashboardData(): Promise<DashboardData> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/dashboard_data.json`, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Не удалось загрузить данные: HTTP ${response.status}`);
  return dashboardSchema.parse(await response.json()) as DashboardData;
}

export function useDashboardData() {
  return useQuery({ queryKey: ['dashboard-data'], queryFn: fetchDashboardData });
}
