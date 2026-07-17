import { describe, expect, it } from 'vitest';
import type { AnalysisContext, DashboardData } from '../../types/dashboard';
import { parseScenarioImport } from '../../stores/scenarioStore';
import { calculateScenario } from './scenarios';

const presence = new Map([
  ['a', new Set(['Фокус', 'Конкурент'])],
  ['b', new Set(['Фокус'])],
  ['c', new Set(['Конкурент'])],
]);

const context = {
  focusMall: { mall: 'Фокус' },
  peerMalls: [{ mall: 'Конкурент' }],
  intersections: { focusBrands: new Set(['a', 'b']), presence },
} as unknown as AnalysisContext;

const data = {
  brandPresence: {
    a: { brand: 'A', brandNormalized: 'a', category: 'Одежда' },
    b: { brand: 'B', brandNormalized: 'b', category: 'Обувь' },
    c: { brand: 'C', brandNormalized: 'c', category: 'Одежда' },
  },
} as unknown as DashboardData;

describe('scenario calculation', () => {
  it('recalculates categories, uniqueness, intersections and Jaccard without mutating baseline', () => {
    const result = calculateScenario(context, data, ['c'], ['b']);

    expect(result.baseline.totalBrands).toBe(2);
    expect(result.baseline.focusExclusive).toBe(1);
    expect(result.baseline.intersections).toBe(1);
    expect(result.baseline.similarities[0]?.jaccard).toBeCloseTo(1 / 3);

    expect(result.scenario.totalBrands).toBe(2);
    expect(result.scenario.categoryCounts).toEqual({ Одежда: 2 });
    expect(result.scenario.focusExclusive).toBe(0);
    expect(result.scenario.intersections).toBe(2);
    expect(result.scenario.similarities[0]?.jaccard).toBe(1);
    expect([...context.intersections.focusBrands]).toEqual(['a', 'b']);
  });
});

describe('scenario import', () => {
  const valid = {
    id: 'scenario-1', name: 'Контрольный сценарий', focusMallId: 'Фокус',
    createdAt: '2026-07-17T00:00:00.000Z', dataSnapshot: '2026-07-16',
    addedBrandIds: ['c'], removedBrandIds: ['b'], schemaVersion: 1,
  };

  it('accepts one scenario or an array', () => {
    expect(parseScenarioImport(valid)).toHaveLength(1);
    expect(parseScenarioImport([valid])).toHaveLength(1);
  });

  it('rejects an unsupported schema', () => {
    expect(() => parseScenarioImport({ ...valid, schemaVersion: 2 })).toThrow();
  });
});
