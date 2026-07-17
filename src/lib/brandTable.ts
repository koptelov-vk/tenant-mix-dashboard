import type { AnalysisContext, DashboardData, SourceQuality, TenantRow } from '../types/dashboard';

export type BrandCharacteristic = 'global-unique' | 'group-unique' | 'focus-exclusive' | 'intersecting';

export interface BrandTableSource {
  label: string;
  url: string | null;
  type: string | null;
  quality: SourceQuality | null;
  checkedAt: string | null;
  mall: string | null;
}

export interface BrandTableRow {
  brandNormalized: string;
  brand: string;
  characteristic: BrandCharacteristic;
  category: string;
  malls: string[];
  primarySource: BrandTableSource;
}

export const CHARACTERISTIC_LABELS: Record<BrandCharacteristic, string> = {
  'focus-exclusive': 'Эксклюзив фокусного объекта',
  'global-unique': 'Уникальный',
  'group-unique': 'Уникальный в группе',
  intersecting: 'Пересекающийся',
};

export const CHARACTERISTIC_DEFINITIONS: Record<BrandCharacteristic, string> = {
  'focus-exclusive': 'Бренд представлен в фокусном объекте и отсутствует у выбранных объектов сравнения.',
  'global-unique': 'Бренд представлен только в одном объекте во всей базе.',
  'group-unique': 'Бренд представлен только в одном объекте текущей группы, но может встречаться за ее пределами.',
  intersecting: 'Бренд представлен минимум в двух объектах текущего среза.',
};

export const CHARACTERISTIC_ORDER: BrandCharacteristic[] = ['focus-exclusive', 'global-unique', 'group-unique', 'intersecting'];

export function buildBrandTableRows(context: AnalysisContext, data: DashboardData): BrandTableRow[] {
  const grouped = new Map<string, TenantRow[]>();
  context.filteredRows.forEach((row) => grouped.set(row.brandNormalized, [...(grouped.get(row.brandNormalized) ?? []), row]));
  const peerNames = new Set(context.peerMalls.map((mall) => mall.mall));

  return [...grouped].map(([brandNormalized, rows]) => {
    const presence = data.brandPresence[brandNormalized];
    const malls = [...new Set(rows.map((row) => row.mall))].sort((left, right) => {
      if (left === context.focusMall.mall) return -1;
      if (right === context.focusMall.mall) return 1;
      if (peerNames.has(left) && !peerNames.has(right)) return -1;
      if (!peerNames.has(left) && peerNames.has(right)) return 1;
      return left.localeCompare(right, 'ru', { numeric: true });
    });
    const isFocusExclusive = malls.length === 1 && malls[0] === context.focusMall.mall;
    const isGlobalUnique = (presence?.mallCount ?? 0) === 1;
    const characteristic: BrandCharacteristic = isFocusExclusive
      ? 'focus-exclusive'
      : isGlobalUnique
        ? 'global-unique'
        : malls.length === 1
          ? 'group-unique'
          : 'intersecting';
    return {
      brandNormalized,
      brand: presence?.brand || rows[0]?.brand || brandNormalized,
      characteristic,
      category: presence?.category || rows[0]?.category || 'Прочее',
      malls,
      primarySource: selectPrimarySource(rows),
    };
  });
}

export function selectPrimarySource(rows: TenantRow[]): BrandTableSource {
  const candidates = rows.map((row) => ({
    label: sourceLabel(row.sourceType, row.sourceUrl),
    url: row.sourceUrl || null,
    type: row.sourceType || null,
    quality: row.sourceQuality ?? null,
    checkedAt: row.checkedAt ?? null,
    mall: row.mall || null,
  }));
  return candidates.sort((left, right) =>
    qualityRank(right.quality) - qualityRank(left.quality)
    || dateValue(right.checkedAt) - dateValue(left.checkedAt)
    || Number(isOfficial(right.type)) - Number(isOfficial(left.type))
    || (left.mall ?? '').localeCompare(right.mall ?? '', 'ru')
  )[0] ?? { label: 'Источник не указан', url: null, type: null, quality: null, checkedAt: null, mall: null };
}

export function sourceLabel(type: string | null | undefined, url: string | null | undefined) {
  if (!url && !type) return 'Источник не указан';
  const value = `${type ?? ''} ${url ?? ''}`.toLocaleLowerCase('ru');
  if (value.includes('common crawl')) return 'Официальный сайт через Common Crawl';
  if (value.includes('2гис') || value.includes('2gis')) return '2ГИС';
  if (value.includes('яндекс') || value.includes('yandex')) return 'Яндекс Карты';
  if (value.includes('официаль') && /(трц|тц|торгов|каталог)/.test(value)) return 'Сайт торгового центра';
  if (value.includes('официаль')) return 'Официальный сайт';
  if (value.includes('каталог')) return 'Профильный каталог';
  return type || (url ? 'Источник' : 'Источник не указан');
}

function qualityRank(value: SourceQuality | null) { return value === 'Высокая' ? 3 : value === 'Средняя' ? 2 : value === 'Низкая' ? 1 : 0; }
function dateValue(value: string | null) { const time = value ? Date.parse(value) : 0; return Number.isFinite(time) ? time : 0; }
function isOfficial(value: string | null) { return value?.toLocaleLowerCase('ru').includes('официаль') ?? false; }
