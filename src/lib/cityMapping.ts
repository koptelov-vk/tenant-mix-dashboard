import type { DashboardData, MallSummary, TenantRow } from '../types/dashboard';

export class CityMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CityMappingError';
  }
}

export function buildCanonicalCityMap(malls: MallSummary[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const mall of malls) {
    const objectName = mall.mall.trim();
    const city = mall.city.trim();
    if (!objectName || !city) throw new CityMappingError('mallSummary must contain non-empty object and city values');
    const existing = result.get(objectName);
    if (existing && existing !== city) {
      throw new CityMappingError(`Conflicting canonical cities for object "${objectName}": "${existing}" and "${city}"`);
    }
    result.set(objectName, city);
  }
  return result;
}

export function applyCanonicalCities(rows: TenantRow[], malls: MallSummary[]): TenantRow[] {
  const canonicalCities = buildCanonicalCityMap(malls);
  return rows.map((row, index) => {
    const canonicalCity = canonicalCities.get(row.mall);
    if (!canonicalCity) {
      throw new CityMappingError(`Unknown object in tenant row ${index}: "${row.mall}"`);
    }
    const sourceCity = row.city?.trim() ?? '';
    if (sourceCity && sourceCity !== canonicalCity) {
      throw new CityMappingError(`City mismatch for object "${row.mall}": row="${sourceCity}", canonical="${canonicalCity}"`);
    }
    return sourceCity === canonicalCity ? row : { ...row, city: canonicalCity };
  });
}

export function adaptDashboardCities(data: DashboardData): DashboardData {
  return { ...data, rows: applyCanonicalCities(data.rows, data.mallSummary) };
}
