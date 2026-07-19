import { Building2 } from 'lucide-react';
import type { DashboardData, TenantRow } from '../../types/dashboard';
import { Navigation } from './Navigation';
import { PdfExportButton } from './PdfExportButton';
import { ShareLinkButton } from './ShareLinkButton';
import { TemplatesMenu } from './TemplatesMenu';
import { SavedViewsMenu } from './SavedViewsMenu';
import { ExportActionsMenu } from './ExportActionsMenu';

export function AppHeader({ data, rows }: { data: DashboardData; rows: TenantRow[] }) {
  return <header className="app-header">
    <div className="header-top">
      <div className="brand"><span className="brand-mark"><Building2 size={20} aria-hidden="true" /></span><div><strong>Tenant Mix Analytics</strong><small>Срез данных: {data.meta.snapshotDate}</small></div></div>
      <div className="header-actions" aria-label="Действия приложения">
        <PdfExportButton snapshotDate={data.meta.snapshotDate} />
        <ShareLinkButton />
        <TemplatesMenu />
      </div>
    </div>
    <Navigation utilities={<><SavedViewsMenu snapshotDate={data.meta.snapshotDate} triggerRole="menuitem" /><ExportActionsMenu rows={rows} snapshotDate={data.meta.snapshotDate} triggerRole="menuitem" /></>} />
  </header>;
}
