import { create } from 'zustand';
import type { MetricMode } from '../types/dashboard';

export type DashboardPage = 'overview' | 'comparability' | 'categories' | 'brands' | 'scenarios';
export type PeerGroupMode = 'same-class' | 'all';

interface DashboardState {
  focusMall: string;
  category: string;
  metric: MetricMode;
  activePage: DashboardPage;
  peerGroup: PeerGroupMode;
  setFocusMall: (mall: string) => void;
  setCategory: (category: string) => void;
  setMetric: (metric: MetricMode) => void;
  setActivePage: (page: DashboardPage) => void;
  setPeerGroup: (peerGroup: PeerGroupMode) => void;
  hydrate: (state: Partial<Pick<DashboardState, 'focusMall' | 'category' | 'metric' | 'activePage' | 'peerGroup'>>) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  focusMall: 'Фантастика',
  category: 'Все категории',
  metric: 'absolute',
  activePage: 'overview',
  peerGroup: 'same-class',
  setFocusMall: (focusMall) => set({ focusMall }),
  setCategory: (category) => set({ category }),
  setMetric: (metric) => set({ metric }),
  setActivePage: (activePage) => set({ activePage }),
  setPeerGroup: (peerGroup) => set({ peerGroup }),
  hydrate: (state) => set(state),
}));
