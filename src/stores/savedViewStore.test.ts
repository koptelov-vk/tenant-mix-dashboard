import { describe, expect, it } from 'vitest';
import { parseSavedViews } from './savedViewStore';

const validView = {
  id: 'view-1', name: 'Обувь в регионах', createdAt: '2026-07-17T00:00:00.000Z', snapshotDate: '2026-07-16', schemaVersion: 1,
  filters: {
    focusMall: 'Фантастика', category: 'Обувь', metric: 'share', activePage: 'categories', peerGroup: 'same-class',
    selectedMalls: [], cities: ['Нижний Новгород'], sourceQualities: ['Высокая'], gapN: 3,
    glaMin: null, glaMax: null, gbaMin: 100_000, gbaMax: null, hideSmallCategories: true,
  },
};

describe('saved view schema', () => {
  it('accepts a reproducible dashboard state', () => {
    const [view] = parseSavedViews(validView);
    expect(view?.filters.focusMall).toBe('Фантастика');
    expect(view?.filters.category).toBe('Обувь');
    expect(view?.filters.gbaMin).toBe(100_000);
  });

  it('rejects unsupported schema versions and invalid filters', () => {
    expect(() => parseSavedViews({ ...validView, schemaVersion: 2 })).toThrow();
    expect(() => parseSavedViews({ ...validView, filters: { ...validView.filters, gapN: 0 } })).toThrow();
  });
});
