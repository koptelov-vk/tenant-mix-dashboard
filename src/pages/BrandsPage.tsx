import { Download, ExternalLink, FileSpreadsheet, Search, X } from 'lucide-react';
import fuzzysort from 'fuzzysort';
import { useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { AnalysisContext, DashboardData, TenantRow } from '../types/dashboard';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { downloadCsv, downloadXlsx } from '../lib/export/csv';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { BrandSheet } from '../components/details/BrandSheet';

export default function BrandsPage({ context, data }: { context: AnalysisContext; data: DashboardData }) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'brand' | 'mall' | 'category'>('brand');
  const [brandKey, setBrandKey] = useState<string | null>(null);
  const debounced = useDebouncedValue(search);
  const cityByMall = useMemo(() => new Map(data.mallSummary.map((mall) => [mall.mall, mall.city])), [data]);
  const rows = useMemo(() => {
    let values = context.filteredRows;
    if (debounced.trim()) {
      const matches = fuzzysort.go(debounced, values, { keys: ['brand', 'brandNormalized', 'mall', 'category'], threshold: -10000 });
      values = matches.map((match: { obj: TenantRow }) => match.obj);
    }
    return [...values].sort((a, b) => (sort === 'brand' ? a.brand.localeCompare(b.brand, 'ru') : sort === 'mall' ? a.mall.localeCompare(b.mall, 'ru') : a.category.localeCompare(b.category, 'ru')));
  }, [context.filteredRows, debounced, sort]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtual = useVirtualizer({ count: rows.length, getScrollElement: () => scrollRef.current, estimateSize: () => 54, overscan: 12 });
  return <><div className="page-heading"><div><h1>Бренды</h1><p>{rows.length.toLocaleString('ru-RU')} строк · {new Set(rows.map((row) => row.brandNormalized)).size.toLocaleString('ru-RU')} брендов текущего среза</p></div><div className="page-actions"><Button variant="outline" onClick={() => downloadCsv(rows)}><Download size={17} />CSV</Button><Button variant="outline" onClick={() => downloadXlsx(rows)}><FileSpreadsheet size={17} />XLSX</Button></div></div>
    <Card className="registry"><div className="registry-toolbar"><label className="search-field"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Бренд, ТЦ или категория" aria-label="Поиск по реестру" />{search ? <button onClick={() => setSearch('')} aria-label="Очистить поиск"><X size={16} /></button> : null}</label><label>Сортировка<select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="brand">Бренд</option><option value="mall">ТЦ</option><option value="category">Категория</option></select></label></div><div className="registry-head" aria-hidden="true"><span>Бренд</span><span>ТЦ</span><span>Категория</span><span>Источник</span></div><div className="virtual-list" ref={scrollRef}><div style={{ height: `${virtual.getTotalSize()}px`, position: 'relative' }}>{virtual.getVirtualItems().map((item) => { const row = rows[item.index] as TenantRow | undefined; if (!row) return null; return <div key={`${row.mall}-${row.brandNormalized}`} className="registry-row" style={{ position: 'absolute', transform: `translateY(${item.start}px)`, height: `${item.size}px`, width: '100%' }}><button className="brand-button" onClick={() => setBrandKey(row.brandNormalized)}>{row.brand}<small>{row.brandNormalized}</small></button><span>{row.mall}<small>{cityByMall.get(row.mall)}</small></span><span>{row.category}</span><span>{row.sourceUrl ? <a href={row.sourceUrl} target="_blank" rel="noopener noreferrer">Источник <ExternalLink size={14} /></a> : 'Без ссылки'}<small>{row.sourceQuality ?? 'н/д'} · {row.checkedAt ?? 'дата н/д'}</small></span></div>; })}</div>{!rows.length ? <p className="empty-state">По текущим фильтрам строки не найдены.</p> : null}</div></Card>{brandKey ? <BrandSheet brandKey={brandKey} data={data} context={context} onClose={() => setBrandKey(null)} /> : null}</>;
}
