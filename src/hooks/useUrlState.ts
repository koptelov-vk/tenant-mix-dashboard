import { useEffect, useRef } from 'react';
import { defaultDashboardFilters, useDashboardStore, type DashboardFilters, type DashboardPage, type PeerGroupMode } from '../stores/dashboardStore';
import type { MetricMode, SourceQuality } from '../types/dashboard';

const pages: DashboardPage[] = ['overview', 'comparability', 'categories', 'brands', 'upcoming', 'quality', 'history'];
const metrics: MetricMode[] = ['absolute', 'share', 'density'];
const peerGroups: PeerGroupMode[] = ['same-class', 'all', 'custom'];
const qualities: SourceQuality[] = ['Высокая', 'Средняя', 'Низкая'];
const list = (params: URLSearchParams, key: string) => params.get(key)?.split(',').map((value) => value.trim()).filter(Boolean) ?? [];
const number = (params: URLSearchParams, key: string) => {
  const value = params.get(key);
  return value != null && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
};

function readUrl(): Partial<DashboardFilters> {
  const params = new URLSearchParams(window.location.search);
  const page = params.get('tab') as DashboardPage;
  const metric = params.get('metric') as MetricMode;
  const group = params.get('group') as PeerGroupMode;
  const categories = list(params, 'categories');
  const legacyCategory = params.get('category');
  const resolvedCategories = categories.length ? categories : legacyCategory && legacyCategory !== 'Все категории' ? [legacyCategory] : [];
  return {
    focusMall: params.get('focus') || defaultDashboardFilters.focusMall,
    category: resolvedCategories.length === 1 ? (resolvedCategories[0] ?? defaultDashboardFilters.category) : defaultDashboardFilters.category,
    categories: resolvedCategories,
    activePage: pages.includes(page) ? page : defaultDashboardFilters.activePage,
    metric: metrics.includes(metric) ? metric : defaultDashboardFilters.metric,
    peerGroup: peerGroups.includes(group) ? group : defaultDashboardFilters.peerGroup,
    selectedMalls: list(params, 'malls'), cities: list(params, 'cities'),
    sourceQualities: list(params, 'quality').filter((value): value is SourceQuality => qualities.includes(value as SourceQuality)),
    gapN: Math.max(1, Number(params.get('gapN')) || defaultDashboardFilters.gapN),
    glaMin: number(params, 'glaMin'), glaMax: number(params, 'glaMax'),
    gbaMin: number(params, 'gbaMin'), gbaMax: number(params, 'gbaMax'),
  };
}

function toUrl(state: DashboardFilters): string {
  const params = new URLSearchParams();
  const categories = state.categories ?? (state.category !== 'Все категории' ? [state.category] : []);
  params.set('focus', state.focusMall); params.set('tab', state.activePage); params.set('group', state.peerGroup); params.set('metric', state.metric);
  if (categories.length) params.set('categories', categories.join(','));
  if (state.selectedMalls.length) params.set('malls', state.selectedMalls.join(','));
  if (state.cities.length) params.set('cities', state.cities.join(','));
  if (state.sourceQualities.length) params.set('quality', state.sourceQualities.join(','));
  if (state.gapN !== defaultDashboardFilters.gapN) params.set('gapN', String(state.gapN));
  for (const key of ['glaMin', 'glaMax', 'gbaMin', 'gbaMax'] as const) if (state[key] != null) params.set(key, String(state[key]));
  return `${window.location.pathname}?${params.toString()}`;
}

export function useUrlState() {
  const hydrated = useRef(false);
  const restoringHistory = useRef(false);
  const state = useDashboardStore();

  useEffect(() => {
    state.hydrate(readUrl());
    hydrated.current = true;
    const onPopState = () => {
      restoringHistory.current = true;
      state.hydrate(readUrl());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    if (restoringHistory.current) {
      restoringHistory.current = false;
      return;
    }
    const next = toUrl(state);
    if (`${window.location.pathname}${window.location.search}` !== next) window.history.pushState(null, '', next);
  }, [state.focusMall, state.categories, state.metric, state.activePage, state.peerGroup, state.selectedMalls, state.cities, state.sourceQualities, state.gapN, state.glaMin, state.glaMax, state.gbaMin, state.gbaMax]);
}