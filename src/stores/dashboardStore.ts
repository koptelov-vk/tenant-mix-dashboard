import { create } from 'zustand';
import type { MetricMode, SourceQuality } from '../types/dashboard';

export type DashboardPage = 'overview' | 'comparability' | 'categories' | 'brands' | 'scenarios' | 'upcoming' | 'quality' | 'history';
export type PeerGroupMode = 'same-class' | 'all';

export interface DashboardFilters {
  focusMall: string;
  category: string;
  metric: MetricMode;
  activePage: DashboardPage;
  peerGroup: PeerGroupMode;
  selectedMalls: string[];
  cities: string[];
  sourceQualities: SourceQuality[];
  gapN: number;
  glaMin: number | null;
  glaMax: number | null;
  gbaMin: number | null;
  gbaMax: number | null;
  hideSmallCategories: boolean;
}

interface DashboardState extends DashboardFilters {
  setFocusMall: (mall: string) => void;
  setCategory: (category: string) => void;
  setMetric: (metric: MetricMode) => void;
  setActivePage: (page: DashboardPage) => void;
  setPeerGroup: (peerGroup: PeerGroupMode) => void;
  setSelectedMalls: (malls: string[]) => void;
  setCities: (cities: string[]) => void;
  setSourceQualities: (qualities: SourceQuality[]) => void;
  setGapN: (value: number) => void;
  setAreaFilter: (key: 'glaMin' | 'glaMax' | 'gbaMin' | 'gbaMax', value: number | null) => void;
  setHideSmallCategories: (value: boolean) => void;
  hydrate: (state: Partial<DashboardFilters>) => void;
  reset: () => void;
}

export const defaultDashboardFilters: DashboardFilters = {
  focusMall: 'Фантастика', category: 'Все категории', metric: 'absolute', activePage: 'overview', peerGroup: 'same-class',
  selectedMalls: [], cities: [], sourceQualities: [], gapN: 3,
  glaMin: null, glaMax: null, gbaMin: null, gbaMax: null, hideSmallCategories: true,
};

export const useDashboardStore = create<DashboardState>((set) => ({
  ...defaultDashboardFilters,
  setFocusMall: (focusMall) => set({ focusMall }),
  setCategory: (category) => set({ category }),
  setMetric: (metric) => set({ metric }),
  setActivePage: (activePage) => set({ activePage }),
  setPeerGroup: (peerGroup) => set({ peerGroup }),
  setSelectedMalls: (selectedMalls) => set({ selectedMalls }),
  setCities: (cities) => set({ cities }),
  setSourceQualities: (sourceQualities) => set({ sourceQualities }),
  setGapN: (gapN) => set({ gapN: Math.max(1, Math.round(gapN)) }),
  setAreaFilter: (key, value) => set({ [key]: value }),
  setHideSmallCategories: (hideSmallCategories) => set({ hideSmallCategories }),
  hydrate: (state) => set(state),
  reset: () => set(defaultDashboardFilters),
}));
