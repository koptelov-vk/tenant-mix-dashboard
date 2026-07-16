import { Building2, Copy, RefreshCw, RotateCcw } from 'lucide-react';
import type { DashboardData } from '../../types/dashboard';
import { useDashboardStore } from '../../stores/dashboardStore';
import { Button } from '../ui/Button';
import { Navigation } from './Navigation';

export function AppHeader({ data, refreshing, onRefresh }: { data: DashboardData; refreshing: boolean; onRefresh: () => void }) {
  const focus = useDashboardStore((state) => state.focusMall);
  const reset = useDashboardStore((state) => state.reset);
  const copyLink = async () => navigator.clipboard.writeText(window.location.href);
  return <header className="app-header">
    <div className="header-top">
      <div className="brand"><span className="brand-mark"><Building2 size={20} /></span><div><strong>Tenant Mix Analytics</strong><small>Срез {data.meta.snapshotDate} · {focus}</small></div></div>
      <div className="header-actions">
        <Button variant="ghost" onClick={copyLink} aria-label="Скопировать ссылку"><Copy size={17} /><span className="desktop-label">Ссылка</span></Button>
        <Button variant="ghost" onClick={reset} aria-label="Сбросить фильтры"><RotateCcw size={17} /></Button>
        <Button variant="outline" onClick={onRefresh} disabled={refreshing} aria-label="Обновить данные"><RefreshCw size={17} className={refreshing ? 'spin' : ''} /><span className="desktop-label">Обновить</span></Button>
      </div>
    </div>
    <Navigation />
  </header>;
}
