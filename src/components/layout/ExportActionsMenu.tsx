import { Download, FileSpreadsheet, FileText, LoaderCircle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { TenantRow } from '../../types/dashboard';
import { downloadCsv, downloadXlsx } from '../../lib/export/csv';
import { Button } from '../ui/Button';
import { PdfExportButton } from './PdfExportButton';

export function ExportActionsMenu({ rows, snapshotDate }: { rows: TenantRow[]; snapshotDate: string }) {
  const [open, setOpen] = useState(false);
  const [xlsxExporting, setXlsxExporting] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const restoreTriggerFocus = () => window.requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>('.export-menu-trigger')?.focus());
  const close = (restoreFocus = false) => { setOpen(false); if (restoreFocus) restoreTriggerFocus(); };
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key !== 'Escape') return; event.preventDefault(); close(true); };
    const closeOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) close(false); };
    window.addEventListener('keydown', closeOnEscape); window.addEventListener('pointerdown', closeOutside);
    return () => { window.removeEventListener('keydown', closeOnEscape); window.removeEventListener('pointerdown', closeOutside); };
  }, [open]);
  const exportXlsx = async () => { if (xlsxExporting) return; setXlsxExporting(true); try { await downloadXlsx(rows); close(false); } finally { setXlsxExporting(false); } };
  return <div className="export-actions-root" ref={root}><Button className="export-menu-trigger" variant="ghost" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="dialog" aria-label="Экспорт текущего среза"><Download size={18} aria-hidden="true" /><span className="desktop-label">Экспорт</span></Button>{open ? <section className="export-actions-popover" role="dialog" aria-label="Экспорт текущего среза"><header><div><strong>Экспорт текущего среза</strong><small>{rows.length.toLocaleString('ru-RU')} строк в выбранном контексте</small></div><button className="export-close" onClick={() => close(true)} aria-label="Закрыть экспорт"><X size={18} aria-hidden="true" /></button></header><div className="export-action-grid"><PdfExportButton snapshotDate={snapshotDate} iconOnly /><Button variant="outline" onClick={() => { downloadCsv(rows); close(false); }} aria-label="Скачать текущий срез в CSV" title="CSV"><FileText size={19} aria-hidden="true" /></Button><Button variant="outline" onClick={() => void exportXlsx()} disabled={xlsxExporting} aria-label={xlsxExporting ? 'Формируется XLSX' : 'Скачать текущий срез в XLSX'} title="XLSX">{xlsxExporting ? <LoaderCircle className="spin" size={19} aria-hidden="true" /> : <FileSpreadsheet size={19} aria-hidden="true" />}</Button></div></section> : null}</div>;
}
