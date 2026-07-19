import { Building2 } from 'lucide-react';
import type { DashboardData } from '../../types/dashboard';
import { Navigation } from './Navigation';
import { PdfExportButton } from './PdfExportButton';
import { ShareLinkButton } from './ShareLinkButton';
import { TemplatesMenu } from './TemplatesMenu';

export function AppHeader({ data }: { data: DashboardData }) {
  return <header className="app-header">
    <div className="header-top">
      <div className="brand"><span className="brand-mark"><Building2 size={20} aria-hidden="true" /></span><div><strong>Tenant Mix Analytics</strong><small>Срез данных: {data.meta.snapshotDate}</small></div></div>
      <div className="header-actions" aria-label="Действия приложения">
        <PdfExportButton snapshotDate={data.meta.snapshotDate} />
        <ShareLinkButton />
        <TemplatesMenu />
      </div>
    </div>
    <Navigation />
  </header>;
}
