import { Building2, Copy, RefreshCw, RotateCcw } from 'lucide-react';
import type { DashboardData, TenantRow } from '../../types/dashboard';
import { useDashboardStore } from '../../stores/dashboardStore';
import { Button } from '../ui/Button';
import { Navigation } from './Navigation';
import { SavedViewsMenu } from './SavedViewsMenu';
import { ExportActionsMenu } from './ExportActionsMenu';

export function AppHeader({ data, rows, refreshing, onRefresh }: { data: DashboardData; rows: TenantRow[]; refreshing: boolean; onRefresh: () => void }) {
  const reset = useDashboardStore((state) => state.reset);
  const copyLink = async () => navigator.clipboard.writeText(window.location.href);
  return <header className="app-header"><div className="header-top"><div className="brand"><span className="brand-mark"><Building2 size={20} /></span><div><strong>Tenant Mix Analytics</strong><small>Срез данных: {data.meta.snapshotDate}</small></div></div><div className="header-actions"><SavedViewsMenu snapshotDate={data.meta.snapshotDate} /><ExportActionsMenu rows={rows} snapshotDate={data.meta.snapshotDate} /><Button variant="ghost" onClick={copyLink} aria-label="Скопировать ссылку"><Copy size={17} /><span className="desktop-label">Ссылка</span></Button><Button variant="ghost" onClick={reset} aria-label="Сбросить фильтры"><RotateCcw size={17} /></Button><Button variant="outline" onClick={onRefresh} disabled={refreshing} aria-label="Обновить данные"><RefreshCw size={17} className={refreshing ? 'spin' : ''} /><span className="desktop-label">Обновить</span></Button></div></div><Navigation /></header>;
}
