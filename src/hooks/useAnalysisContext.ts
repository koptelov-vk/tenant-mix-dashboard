import { useMemo } from 'react';
import { createAnalysisContext } from '../lib/analysis';
import { applyRankingContract } from '../lib/ranking';
import type { DashboardData, MallSummary } from '../types/dashboard';
import { useDashboardStore } from '../stores/dashboardStore';

function matchesArea(mall: MallSummary, minimum: number | null, maximum: number | null, key: 'gla' | 'gba') {
  const value = mall[key];
  if (minimum != null && (value == null || value < minimum)) return false;
  if (maximum != null && (value == null || value > maximum)) return false;
  return true;
}

export function useAnalysisContext(data: DashboardData) {
  const state = useDashboardStore();
  return useMemo(() => {
    const focus = data.mallSummary.find((mall) => mall.mall === state.focusMall) ?? data.mallSummary[0];
    const presetPeers = data.mallSummary
      .filter((mall) => state.peerGroup === 'all' || mall.mallClass === focus?.mallClass)
      .map((mall) => mall.mall);
    const constrainedPeers = state.peerGroup === 'custom' ? state.selectedMalls : presetPeers;
    const categorySet = new Set(state.categories);
    const scopedData = state.categories.length ? {
      ...data,
      rows: data.rows.filter((row) => categorySet.has(row.category)),
      categoryMatrix: { ...data.categoryMatrix, categories: data.categoryMatrix.categories.filter((category) => categorySet.has(category)) },
      brandPresence: Object.fromEntries(Object.entries(data.brandPresence).filter(([, brand]) => categorySet.has(brand.category))),
    } : data;
    const context = applyRankingContract(createAnalysisContext(scopedData, {
      focusMall: state.focusMall,
      category: 'Все категории',
      peerMalls: constrainedPeers,
      cities: state.cities,
      sourceQualities: state.sourceQualities,
      gapN: state.gapN,
      glaMin: state.glaMin,
      glaMax: state.glaMax,
      gbaMin: state.gbaMin,
      gbaMax: state.gbaMax,
      focusInSelectedGroup: constrainedPeers.includes(state.focusMall),
    }));
    const focusMatchesFilterCriteria = focus != null
      && (!state.cities.length || state.cities.includes(focus.city))
      && matchesArea(focus, state.glaMin, state.glaMax, 'gla')
      && matchesArea(focus, state.gbaMin, state.gbaMax, 'gba');
    return { ...context, focusMatchesPeerCriteria: focusMatchesFilterCriteria };
  }, [data, state.focusMall, state.categories, state.peerGroup, state.selectedMalls, state.cities, state.sourceQualities, state.gapN, state.glaMin, state.glaMax, state.gbaMin, state.gbaMax]);
}
