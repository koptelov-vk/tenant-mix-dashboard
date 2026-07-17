import { Download, ExternalLink, FileSpreadsheet, RotateCcw, Search, X } from 'lucide-react';
import fuzzysort from 'fuzzysort';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { AnalysisContext, DashboardData, TenantRow } from '../types/dashboard';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { downloadCsv, downloadXlsx } from '../lib/export/csv';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { BrandSheet } from '../components/details/BrandSheet';
import { TableColumnHeader } from '../components/ui/TableColumnHeader';
import { matchesFilter, uniqueOptions } from '../components/ui/MultiFilter';

type SortKey = 'brand' | 'mall' | 'city' | 'category' | 'source' | 'quality' | 'checked';
const headers: Array<[SortKey, string]> = [['brand', 'Бренд'], ['mall', 'ТЦ'], ['city', 'Город'], ['category', 'Категория'], ['source', 'Тип источника'], ['quality', 'Качество'], ['checked', 'Проверено']];

export default function BrandsPage({ context, data }: { context: AnalysisContext; data: DashboardData }) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'brand', direction: 'asc' });
  const [filters, setFilters] = useState<Record<SortKey, string[]>>(createEmptyFilters);
  const [brandKey, setBrandKey] = useState<string | null>(null);
  const debounced = useDebouncedValue(search);
  const cityByMall = useMemo(() => new Map(data.mallSummary.map((mall) => [mall.mall, mall.city])), [data.mallSummary]);
  const options = useMemo(() => Object.fromEntries(headers.map(([key]) => [key, uniqueOptions(context.filteredRows.map((row) => valueFor(row, key, cityByMall)))])) as Record<SortKey, string[]>, [context.filteredRows, cityByMall]);
  const rows = useMemo(() => {
    let values = context.filteredRows.filter((row) => headers.every(([key]) => matchesFilter(filters[key], valueFor(row, key, cityByMall))));
    if (debounced.trim()) {
      const matches = fuzzysort.go(debounced, values, { keys: ['brand', 'brandNormalized', 'mall', 'city', 'category'], threshold: -10000 });
      values = matches.map((match: { obj: TenantRow }) => match.obj);
    }
    return [...values].sort((left, right) => compareText(valueFor(left, sort.key, cityByMall), valueFor(right, sort.key, cityByMall), sort.direction));
  }, [context.filteredRows, debounced, sort, filters, cityByMall]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtual = useVirtualizer({ count: rows.length, getScrollElement: () => scrollRef.current, estimateSize: () => 58, overscan: 12 });
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [debounced, sort, filters]);
  const activeFilters = Object.values(filters).filter((value) => value.length).length;
  const setColumnFilter = (key: SortKey, value: string[]) => setFilters((current) => ({ ...current, [key]: value }));
  const toggleSort = (key: SortKey) => setSort((current) => current.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' });
  const resetLocal = () => { setSearch(''); setFilters(createEmptyFilters()); setSort({ key: 'brand', direction: 'asc' }); };

  return <><div className="page-heading"><div><h1>Бренды</h1><p>{rows.length.toLocaleString('ru-RU')} строк · {new Set(rows.map((row) => row.brandNormalized)).size.toLocaleString('ru-RU')} брендов текущего среза</p></div><div className="page-actions"><Button variant="outline" onClick={() => downloadCsv(rows)}><Download size={17} />CSV</Button><Button variant="outline" onClick={() => downloadXlsx(rows)}><FileSpreadsheet size={17} />XLSX</Button></div></div>
    <Card className="registry unified-table-panel"><div className="registry-toolbar"><label className="search-field"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Бренд, исходное название, ТЦ или категория" aria-label="Поиск по реестру" />{search ? <button onClick={() => setSearch('')} aria-label="Очистить поиск"><X size={16} /></button> : null}</label><span className="registry-result-count"><strong>{rows.length.toLocaleString('ru-RU')}</strong> строк</span>{activeFilters || search || sort.key !== 'brand' || sort.direction !== 'asc' ? <Button variant="ghost" onClick={resetLocal}><RotateCcw size={16} />Сбросить</Button> : null}</div><div className="registry-table-scroll"><div className="registry-table" role="table" aria-label="Реестр брендов"><div className="registry-head" role="row">{headers.map(([key, label]) => <div key={key} role="columnheader" aria-sort={sort.key === key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}><TableColumnHeader label={label} direction={sort.key === key ? sort.direction : null} onSort={() => toggleSort(key)} options={options[key]} filterValue={filters[key]} onFilterChange={(value) => setColumnFilter(key, value)} /></div>)}</div><div className="virtual-list" ref={scrollRef} role="rowgroup"><div style={{ height: `${virtual.getTotalSize()}px`, position: 'relative' }}>{virtual.getVirtualItems().map((item) => { const row = rows[item.index] as TenantRow | undefined; if (!row) return null; return <div key={`${row.mall}-${row.brandNormalized}`} className="registry-row" role="row" style={{ position: 'absolute', transform: `translateY(${item.start}px)`, height: `${item.size}px`, width: '100%' }}><div role="cell"><button className="brand-button" onClick={() => setBrandKey(row.brandNormalized)}>{row.brand}<small>{row.brandNormalized}</small></button></div><span role="cell">{row.mall}</span><span role="cell">{cityByMall.get(row.mall) ?? row.city}</span><span role="cell">{row.category}</span><span role="cell">{row.sourceUrl ? <a href={row.sourceUrl} target="_blank" rel="noopener noreferrer">{row.sourceType || 'Источник'} <ExternalLink size={14} /></a> : row.sourceType || 'Без ссылки'}</span><span role="cell">{row.sourceQuality ?? 'н/д'}</span><span role="cell">{row.checkedAt ?? 'н/д'}</span></div>; })}</div>{!rows.length ? <p className="empty-state">По текущим фильтрам строки не найдены.</p> : null}</div></div></div></Card>{brandKey ? <BrandSheet brandKey={brandKey} data={data} context={context} onClose={() => setBrandKey(null)} /> : null}</>;
}

function createEmptyFilters() { return headers.reduce((result, [key]) => { result[key] = []; return result; }, {} as Record<SortKey, string[]>); }
function valueFor(row: TenantRow, key: SortKey, cityByMall: Map<string, string>) {
  return ({ brand: row.brand, mall: row.mall, city: cityByMall.get(row.mall) ?? row.city, category: row.category, source: row.sourceType || 'н/д', quality: row.sourceQuality || 'н/д', checked: row.checkedAt || 'н/д' })[key];
}
function compareText(left: string, right: string, direction: 'asc' | 'desc') {
  const result = left.localeCompare(right, 'ru', { numeric: true });
  return direction === 'asc' ? result : -result;
}
