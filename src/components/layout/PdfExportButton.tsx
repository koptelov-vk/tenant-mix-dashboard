import { Download, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { useDashboardStore } from '../../stores/dashboardStore';
import { Button } from '../ui/Button';

export function PdfExportButton({ snapshotDate }: { snapshotDate: string }) {
  const [exporting, setExporting] = useState(false);
  const focusMall = useDashboardStore((state) => state.focusMall);
  const exportPdf = async () => {
    const root = document.getElementById('main-content');
    if (!root || exporting) return;
    setExporting(true);
    try {
      const { exportDashboardPdf } = await import('../../lib/export/pdf');
      await exportDashboardPdf(root, { focusMall, snapshotDate });
    } finally {
      setExporting(false);
    }
  };
  return <Button variant="ghost" onClick={() => void exportPdf()} disabled={exporting} aria-label={exporting ? 'Формируется PDF' : 'Скачать текущий анализ в PDF'}>{exporting ? <LoaderCircle className="spin" size={17} /> : <Download size={17} />}<span className="desktop-label">PDF</span></Button>;
}
