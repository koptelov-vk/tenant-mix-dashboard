import { useEffect, useRef } from 'react';
import type { DashboardPage, PeerGroupMode } from '../stores/dashboardStore';
import { useDashboardStore } from '../stores/dashboardStore';
import type { MetricMode } from '../types/dashboard';

const pages: DashboardPage[] = ['overview', 'comparability', 'categories', 'brands', 'scenarios'];
const metrics: MetricMode[] = ['absolute', 'share', 'density'];
const peerGroups: PeerGroupMode[] = ['same-class', 'all'];

export function useUrlState() {
  const hydrated = useRef(false);
  const state = useDashboardStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const activePage = params.get('tab');
    const metric = params.get('metric');
    const peerGroup = params.get('group');

    state.hydrate({
      focusMall: params.get('focus') || state.focusMall,
      category: params.get('category') || state.category,
      activePage: pages.includes(activePage as DashboardPage) ? (activePage as DashboardPage) : state.activePage,
      metric: metrics.includes(metric as MetricMode) ? (metric as MetricMode) : state.metric,
      peerGroup: peerGroups.includes(peerGroup as PeerGroupMode) ? (peerGroup as PeerGroupMode) : state.peerGroup,
    });
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const params = new URLSearchParams();
    params.set('focus', state.focusMall);
    params.set('tab', state.activePage);
    params.set('group', state.peerGroup);
    params.set('metric', state.metric);
    if (state.category !== 'Все категории') params.set('category', state.category);
    const next = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', next);
  }, [state.focusMall, state.category, state.activePage, state.peerGroup, state.metric]);

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const activePage = params.get('tab');
      const metric = params.get('metric');
      const peerGroup = params.get('group');
      state.hydrate({
        focusMall: params.get('focus') || 'Фантастика',
        category: params.get('category') || 'Все категории',
        activePage: pages.includes(activePage as DashboardPage) ? (activePage as DashboardPage) : 'overview',
        metric: metrics.includes(metric as MetricMode) ? (metric as MetricMode) : 'absolute',
        peerGroup: peerGroups.includes(peerGroup as PeerGroupMode) ? (peerGroup as PeerGroupMode) : 'same-class',
      });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
}
