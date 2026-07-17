import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dashboardSchema } from '../hooks/useDashboardData';

describe('production dashboard data', () => {
  it('passes the typed Zod contract without losing production records', () => {
    const raw = JSON.parse(readFileSync('data/aggregates/dashboard_data.json', 'utf8')) as unknown;
    const data = dashboardSchema.parse(raw);
    expect(data.rows).toHaveLength(data.dataQuality.rows);
    expect(data.mallSummary).toHaveLength(data.dataQuality.malls);
    expect(Object.keys(data.brandPresence)).toHaveLength(data.dataQuality.brands);
    expect(data.rows.every((row) => row.brand.length > 0 && row.brandNormalized.length > 0)).toBe(true);
    const allCities = data.mallSummary.map((mall) => mall.city);
    expect(allCities).not.toContain('НН');
    expect(allCities).toContain('Нижний Новгород');
    expect(data.brandPresence['Мегафон']).toBeDefined();
    expect(data.brandPresence['мегафон yota']).toBeUndefined();
    expect(data.rows.filter((row) => row.mall === 'Фантастика' && row.brandNormalized === 'Мегафон')).toHaveLength(1);
    expect(data.rows.some((row) => row.checkedAt == null)).toBe(true);
  });
});
