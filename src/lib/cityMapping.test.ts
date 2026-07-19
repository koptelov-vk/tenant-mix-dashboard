import { describe, expect, it } from 'vitest';
import type { MallSummary, TenantRow } from '../types/dashboard';
import { applyCanonicalCities, buildCanonicalCityMap, CityMappingError } from './cityMapping';
import { rowsToCsv, tenantExportValues } from './export/csv';

const mall = (name: string, city: string): MallSummary => ({
  mall: name,
  city,
  mallClass: 'Региональный',
  gla: null,
  gba: null,
  glaConfirmed: false,
  brandCount: 1,
  categoryCounts: {},
});

const row = (mallName: string, city = ''): TenantRow => ({
  mall: mallName,
  city,
  brand: `Бренд ${mallName}`,
  brandNormalized: `бренд ${mallName}`.toLowerCase(),
  category: 'Одежда',
  sourceUrl: 'https://example.com',
  sourceType: 'Официальный сайт',
});

describe('canonical object to city mapping', () => {
  const malls = [mall('Фантастика', 'Нижний Новгород'), mall('Тестовый объект', 'Казань')];

  it('fills missing cities by exact object name for multiple cities', () => {
    const result = applyCanonicalCities([row('Фантастика'), row('Тестовый объект')], malls);
    expect(result.map((item) => item.city)).toEqual(['Нижний Новгород', 'Казань']);
  });

  it('preserves a confirmed matching row city', () => {
    const source = row('Фантастика', 'Нижний Новгород');
    expect(applyCanonicalCities([source], malls)[0]).toBe(source);
  });

  it('does not guess an unknown object city', () => {
    expect(() => applyCanonicalCities([row('Неизвестный объект')], malls)).toThrow(CityMappingError);
  });

  it('rejects a row city conflicting with mallSummary', () => {
    expect(() => applyCanonicalCities([row('Фантастика', 'Казань')], malls)).toThrow(/City mismatch/);
  });

  it('rejects conflicting canonical mallSummary entries', () => {
    expect(() => buildCanonicalCityMap([mall('Фантастика', 'Нижний Новгород'), mall('Фантастика', 'Казань')])).toThrow(/Conflicting canonical cities/);
  });

  it('gives CSV and XLSX one shared city value contract', () => {
    const result = applyCanonicalCities([row('Фантастика'), row('Тестовый объект')], malls);
    expect(result.map((item) => tenantExportValues(item)[1])).toEqual(['Нижний Новгород', 'Казань']);
    const csv = rowsToCsv(result);
    expect(csv).toContain('Фантастика;Нижний Новгород');
    expect(csv).toContain('Тестовый объект;Казань');
  });
});
