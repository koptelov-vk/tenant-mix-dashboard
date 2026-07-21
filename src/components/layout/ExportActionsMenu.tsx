import { Download, FileSpreadsheet, FileText, LoaderCircle, X } from 'lucide-react';
import { useRef, useState } from 'react';
import type { TenantRow } from '../../types/dashboard';
import { downloadCsv, downloadXlsx } from '../../lib/export/csv';
import { Button } from '../ui/Button';
import { PdfExportButton } from './PdfExportButton';
import { useControlledOverlay } from '../ui/OverlayController';

export function ExportActionsMenu({ rows, snapshotDate }: { rows: TenantRow[]; snapshotDate: string }) {
  const [open, setOpen] = useState(false);
  const [xlsxExporting, setXlsxExporting] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLElement>(null);
  const overlay = useControlledOverlay({ open, setOpen, triggerRef: trigger, contentRef: content });
  const exportXlsx = async () => { if (xlsxExporting) return; setXlsxExporting(true); try { await downloadXlsx(rows); overlay.close(false); } finally { setXlsxExporting(false); } };
  return <div className="export-actions-root" ref={root}><Button ref={trigger} className="export-menu-trigger" variant="ghost" onClick={overlay.toggle} aria-expanded={open} aria-controls={overlay.id} aria-haspopup="dialog" aria-label="Экспорт текущего среза"><Download size={18} aria-hidden="true" /><span className="desktop-label">Экспорт</span></Button>{open ? <section id={overlay.id} ref={content} data-pdf-exclude className="overlay-portal-layer export-actions-popover" role="dialog" aria-label="Экспорт текущего среза"><header><div><strong>Экспорт текущего среза</strong><small>{rows.length.toLocaleString('ru-RU')} строк в выбранном контексте</small></div><button className="export-close" onClick={() => overlay.close(true)} aria-label="Закрыть экспорт"><X size={18} aria-hidden="true" /></button></header><div className="export-action-grid"><PdfExportButton snapshotDate={snapshotDate} iconOnly /><Button variant="outline" onClick={() => { downloadCsv(rows); overlay.close(false); }} aria-label="Скачать текущий срез в CSV" title="CSV"><FileText size={19} aria-hidden="true" /></Button><Button variant="outline" onClick={() => void exportXlsx()} disabled={xlsxExporting} aria-label={xlsxExporting ? 'Формируется XLSX' : 'Скачать текущий срез в XLSX'} title="XLSX">{xlsxExporting ? <LoaderCircle className="spin" size={19} aria-hidden="true" /> : <FileSpreadsheet size={19} aria-hidden="true" />}</Button></div></section> : null}</div>;
}
