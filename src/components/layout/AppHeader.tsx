import { useLayoutEffect, useRef } from 'react';
import { Building2, Copy, RefreshCw, RotateCcw } from 'lucide-react';
import type { DashboardData, TenantRow } from '../../types/dashboard';
import { useDashboardStore } from '../../stores/dashboardStore';
import { Button } from '../ui/Button';
import { Navigation } from './Navigation';
import { SavedViewsMenu } from './SavedViewsMenu';
import { ExportActionsMenu } from './ExportActionsMenu';
import { useOverlayController } from '../ui/OverlayController';

export function AppHeader({ data, rows, refreshing, onRefresh }: { data: DashboardData; rows: TenantRow[]; refreshing: boolean; onRefresh: () => void }) {
  const headerRef = useRef<HTMLElement>(null);
  const reset = useDashboardStore((state) => state.reset);
  const setActivePage = useDashboardStore((state) => state.setActivePage);
  const overlays = useOverlayController();
  const copyLink = async () => navigator.clipboard.writeText(window.location.href);
  const openOverview = () => {
    overlays.close({ restoreFocus: false });
    setActivePage('overview');
  };

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const root = document.documentElement;
    let frame = 0;
    const syncOffset = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const usesMobileHeaderOffset = window.innerWidth <= 760 || window.innerHeight <= 500;
        const offset = usesMobileHeaderOffset ? Math.ceil(header.getBoundingClientRect().height) : 0;
        root.style.setProperty('--mobile-header-offset', `${offset}px`);
      });
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(syncOffset);
    observer?.observe(header);
    window.addEventListener('resize', syncOffset);
    syncOffset();

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', syncOffset);
      window.cancelAnimationFrame(frame);
      root.style.removeProperty('--mobile-header-offset');
    };
  }, []);

  return <header className="app-header" ref={headerRef}>
    <div className="header-top">
      <button type="button" className="brand brand-home-action" aria-label="Tenant Mix Analytics" onClick={openOverview}><span className="brand-mark" aria-hidden="true"><Building2 size={20} /></span><span className="brand-copy" aria-hidden="true"><strong>Tenant Mix Analytics</strong><small>Срез данных: {data.meta.snapshotDate}</small></span></button>
      <div className="header-actions">
        <SavedViewsMenu snapshotDate={data.meta.snapshotDate} />
        <ExportActionsMenu rows={rows} snapshotDate={data.meta.snapshotDate} />
        <Button variant="ghost" onClick={copyLink} aria-label="Скопировать ссылку"><Copy size={17} /><span className="desktop-label">Ссылка</span></Button>
        <Button variant="ghost" onClick={reset} aria-label="Сбросить фильтры"><RotateCcw size={17} /></Button>
        <Button variant="outline" onClick={onRefresh} disabled={refreshing} aria-label="Обновить данные"><RefreshCw size={17} className={refreshing ? 'spin' : ''} /><span className="desktop-label">Обновить</span></Button>
      </div>
    </div>
    <Navigation />
  </header>;
}
