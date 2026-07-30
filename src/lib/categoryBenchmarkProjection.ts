import type {
  CategoryBenchmarkComparisonState,
  CategoryBenchmarkDisplayProjection,
  CategoryBenchmarkMode,
  CategoryBenchmarkPayload,
} from '../types/dashboard';

export function deriveCategoryBenchmarkComparisonState(
  deviationRaw: number | null,
): CategoryBenchmarkComparisonState {
  if (deviationRaw == null) return 'unavailable';
  if (deviationRaw > 0) return 'above';
  if (deviationRaw < 0) return 'below';
  return 'equal';
}

export function normalizeCategoryBenchmarkDeviationRaw(
  deviationRaw: number | null,
): number | null {
  return Object.is(deviationRaw, -0) ? 0 : deviationRaw;
}

function formatMagnitude(value: number): string {
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 1 });
}

function countUnit(value: number): string {
  if (!Number.isInteger(value)) return 'бренда';
  const absolute = Math.abs(value);
  const mod10 = absolute % 10;
  const mod100 = absolute % 100;
  if (mod10 === 1 && mod100 !== 11) return 'бренд';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'бренда';
  return 'брендов';
}

function roundShareMagnitude(value: number): number {
  return Math.round((Math.abs(value) + Number.EPSILON) * 10) / 10;
}

export function createCategoryBenchmarkDisplayProjection(
  mode: CategoryBenchmarkMode,
  deviationRaw: number | null,
  comparisonState: CategoryBenchmarkComparisonState,
): CategoryBenchmarkDisplayProjection {
  const normalizedDeviationRaw = normalizeCategoryBenchmarkDeviationRaw(deviationRaw);
  const displayUnit: CategoryBenchmarkDisplayProjection['displayUnit'] =
    mode === 'count' ? 'brands' : 'percentage_points';
  const base = {
    mode,
    deviationRaw: normalizedDeviationRaw,
    comparisonState,
    displayUnit,
    cssState: comparisonState,
    consumerCalculations: [] as [],
  };

  if (comparisonState === 'unavailable') {
    return {
      ...base,
      displayDeviation: null,
      displayRelationText: 'Сравнение недоступно',
      accessibleRelationText: 'Сравнение недоступно.',
      glyph: null,
      boundaryApplied: false,
    };
  }

  if (comparisonState === 'equal') {
    return {
      ...base,
      displayDeviation: 0,
      displayRelationText: 'на уровне медианы',
      accessibleRelationText: 'Фокусный объект на уровне медианы.',
      glyph: '●',
      boundaryApplied: false,
    };
  }

  const direction = comparisonState === 'above' ? 'выше' : 'ниже';
  const glyph = comparisonState === 'above' ? '▲' : '▼';
  const absoluteRaw = Math.abs(normalizedDeviationRaw as number);
  const boundaryApplied = mode === 'share' && absoluteRaw > 0 && absoluteRaw < 0.05;
  if (boundaryApplied) {
    return {
      ...base,
      displayDeviation: null,
      displayRelationText: `${direction} медианы менее чем на 0,1 п.п.`,
      accessibleRelationText: `Фокусный объект ${direction} медианы менее чем на 0,1 процентного пункта.`,
      glyph,
      boundaryApplied,
    };
  }

  const displayDeviation = mode === 'count' ? absoluteRaw : roundShareMagnitude(absoluteRaw);
  const visibleUnit = mode === 'count' ? countUnit(displayDeviation) : 'п.п.';
  const accessibleUnit = mode === 'count' ? countUnit(displayDeviation) : 'процентного пункта';
  const magnitude = formatMagnitude(displayDeviation);
  return {
    ...base,
    displayDeviation,
    displayRelationText: `${direction} медианы на ${magnitude} ${visibleUnit}`,
    accessibleRelationText: `Фокусный объект ${direction} медианы на ${magnitude} ${accessibleUnit}.`,
    glyph,
    boundaryApplied: false,
  };
}

export function projectCategoryBenchmark(
  payload: CategoryBenchmarkPayload,
  mode: CategoryBenchmarkMode,
): CategoryBenchmarkDisplayProjection {
  const stats = mode === 'count' ? payload.count : payload.share;
  return createCategoryBenchmarkDisplayProjection(mode, stats.deviationRaw, stats.comparisonState);
}
