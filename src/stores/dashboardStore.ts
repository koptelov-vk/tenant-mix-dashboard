import { create } from 'zustand';
import type { MetricMode } from '../types/dashboard';

interface DashboardState {
  focusMall: string;
  category: string;
  metric: MetricMode;
  activePage: 'overview' | 'comparability' | 'categories' | 'brands' | 'scenarios';
  setFocusMall: (mall: string) => void;
  setCategory: (category: string) => void;
  setMetric: (metric: MetricMode) => void;
  setActivePage: (page: DashboardState['activePage']) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  focusMall: 'Фантастика',
  category: 'Все категории',
  metric: 'absolute',
  activePage: 'overview',
  setFocusMall: (focusMall) => set({ focusMall }),
  setCategory: (category) => set({ category }),
  setMetric: (metric) => set({ metric }),
  setActivePage: (activePage) => set({ activePage }),
}));
