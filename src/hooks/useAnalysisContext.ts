import { useMemo } from 'react';
import { createAnalysisContext } from '../lib/analysis';
import type { DashboardData } from '../types/dashboard';
import { useDashboardStore } from '../stores/dashboardStore';

export function useAnalysisContext(data: DashboardData) {
  const state = useDashboardStore();
  return useMemo(() => {
    const focus = data.mallSummary.find((mall) => mall.mall === state.focusMall) ?? data.mallSummary[0];
    const peerMalls = data.mallSummary
      .filter((mall) => state.peerGroup === 'all' || mall.mallClass === focus?.mallClass)
      .map((mall) => mall.mall);
    const constrainedPeers = state.selectedMalls.length
      ? peerMalls.filter((mall) => state.selectedMalls.includes(mall))
      : peerMalls;
    return createAnalysisContext(data, {
      focusMall: state.focusMall,
      category: state.category,
      peerMalls: constrainedPeers,
      cities: state.cities,
      sourceQualities: state.sourceQualities,
      gapN: state.gapN,
      glaMin: state.glaMin,
      glaMax: state.glaMax,
      gbaMin: state.gbaMin,
      gbaMax: state.gbaMax,
    });
  }, [data, state.focusMall, state.category, state.peerGroup, state.selectedMalls, state.cities, state.sourceQualities, state.gapN, state.glaMin, state.glaMax, state.gbaMin, state.gbaMax]);
}
