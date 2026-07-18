import { Download, FileSpreadsheet, Search, X } from 'lucide-react';
import fuzzysort from 'fuzzysort';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { AnalysisContext, DashboardData } from '../types/dashboard';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { downloadBrandCsv, downloadBrandXlsx } from '../lib/export/csv';
import { buildBrandTableRows, CHARACTERISTIC_DEFINITIONS, CHARACTERISTIC_LABELS, CHARACTERISTIC_ORDER, type BrandCharacteristic, type BrandTableRow } from '../lib/brandTable';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { BrandSheet } from '../components/details/BrandSheet';
import { TableColumnHeader } from '../components/ui/TableColumnHeader';
import { EMPTY_FILTER, matchesFilter, uniqueOptions } from '../components/ui/MultiFilter';
import { MultiFilter } from '../components/ui/MultiFilter';
import { ActiveTableFilters, type ActiveTableFilter } from '../components/table/ActiveTableFilters';
import { DataTableEmptyState } from '../components/table/DataTableEmptyState';

type SortKey = 'brand' | 'characteristic' | 'category' | 'malls';
const headers: Array<[SortKey, string]> = [['brand', 'Бренд'], ['characteristic', 'Характеристика'], ['category', 'Категория'], ['malls', 'Объекты']];

export default function BrandsPage({ context, data }: { context: AnalysisContext; data: DashboardData }) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'brand', direction: 'asc' });
  const [filters, setFilters] = useState<Record<SortKey, string[]>>(createEmptyFilters);
  const [brandKey, setBrandKey] = useState<string | null>(null);
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches);
  const debounced = useDebouncedValue(search);
  const baseRows = useMemo(() => buildBrandTableRows(context, data), [context, data]);
  const options = useMemo(() => ({
    brand: uniqueOptions(baseRows.map((row) => row.brand)),
    characteristic: CHARACTERISTIC_ORDER.map((key) => CHARACTERISTIC_LABELS[key]),
    category: uniqueOptions(baseRows.map((row) => row.category)),
    malls: uniqueOptions(baseRows.flatMap((row) => row.malls)),
  }), [baseRows]);
  const rows = useMemo(() => {
    let values = baseRows.filter((row) => matchesRowFilters(row, filters));
    if (debounced.trim()) values = fuzzysort.go(debounced, values, { keys: ['brand', 'brandNormalized', 'category', 'malls'], threshold: -10000 }).map((match: { obj: BrandTableRow }) => match.obj);
    return [...values].sort((left, right) => compareRows(left, right, sort));
  }, [baseRows, debounced, sort, filters]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtual = useVirtualizer({ count: rows.length, getScrollElement: () => scrollRef.current, estimateSize: () => mobile ? 224 : 60, overscan: mobile ? 5 : 12 });
  useEffect(() => { const media = window.matchMedia('(max-width: 768px)'); const update = () => setMobile(media.matches); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); virtual.measure(); }, [debounced, sort, filters, mobile, virtual]);
  const setColumnFilter = (key: SortKey, value: string[]) => setFilters((current) => ({ ...current, [key]: value }));
  const toggleSort = (key: SortKey) => setSort((current) => current.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' });
  const resetLocal = () => { setSearch(''); setFilters(createEmptyFilters()); setSort({ key: 'brand', direction: 'asc' }); };
  const activeFilters = useMemo(() => buildActiveFilters(filters), [filters]);
  const mallCount = new Set(rows.flatMap((row) => row.malls)).size;
  const categoryCount = new Set(rows.map((row) => row.category)).size;

  return <><div className="page-heading"><div><h1>Бренды</h1><p>{rows.length.toLocaleString('ru-RU')} брендов · {mallCount} объектов · {categoryCount} категорий</p></div><div className="page-actions"><Button variant="outline" onClick={() => downloadBrandCsv(rows)}><Download size={17} />CSV</Button><Button variant="outline" onClick={() => downloadBrandXlsx(rows)}><FileSpreadsheet size={17} />XLSX</Button></div></div>
    <Card className="registry brand-registry unified-table-panel"><div className="registry-toolbar"><label className="search-field"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск бренда, категории или объекта" aria-label="Поиск по брендам" />{search ? <button onClick={() => setSearch('')} aria-label="Очистить поиск"><X size={16} /></button> : null}</label><span className="registry-result-count" role="status" aria-live="polite"><strong>{rows.length.toLocaleString('ru-RU')}</strong> брендов</span></div>
      <div className="brand-mobile-controls" aria-label="Фильтры и сортировка брендов"><label><span>Сортировка</span><select value={sort.key} onChange={(event) => setSort({ key: event.target.value as SortKey, direction: sort.direction })}>{headers.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><Button variant="outline" onClick={() => setSort((current) => ({ ...current, direction: current.direction === 'asc' ? 'desc' : 'asc' }))}>{sort.direction === 'asc' ? 'По возрастанию' : 'По убыванию'}</Button>{headers.map(([key, label]) => <MultiFilter key={key} label={label} options={options[key]} value={filters[key]} onChange={(value) => setColumnFilter(key, value)} />)}</div>
      <ActiveTableFilters filters={activeFilters} onRemove={(key) => setColumnFilter(key as SortKey, [])} onReset={resetLocal} />
      <div className="registry-table-scroll" aria-label="Прокручиваемая таблица брендов"><div className="registry-table brand-table" role="table" aria-label="Реестр нормализованных брендов"><div className="registry-head" role="row">{headers.map(([key, label]) => <div key={key} role="columnheader" aria-sort={sort.key === key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}><TableColumnHeader label={label} direction={sort.key === key ? sort.direction : null} onSort={() => toggleSort(key)} options={options[key]} filterValue={filters[key]} onFilterChange={(value) => setColumnFilter(key, value)} /></div>)}</div>
        <div className="virtual-list" ref={scrollRef} role="rowgroup"><div style={{ height: `${virtual.getTotalSize()}px`, position: 'relative' }}>{virtual.getVirtualItems().map((item) => { const row = rows[item.index]; if (!row) return null; return <BrandRow key={row.brandNormalized} row={row} itemStart={item.start} itemSize={item.size} onOpen={() => setBrandKey(row.brandNormalized)} />; })}</div>{!rows.length ? <DataTableEmptyState>По текущим фильтрам бренды не найдены.</DataTableEmptyState> : null}</div></div></div>
    </Card>{brandKey ? <BrandSheet brandKey={brandKey} data={data} context={context} onClose={() => setBrandKey(null)} /> : null}</>;
}

function BrandRow({ row, itemStart, itemSize, onOpen }: { row: BrandTableRow; itemStart: number; itemSize: number; onOpen: () => void }) {
  return <div className="registry-row brand-registry-row" role="row" style={{ position: 'absolute', transform: `translateY(${itemStart}px)`, height: `${itemSize}px`, width: '100%' }}>
    <div role="cell" data-label="Бренд"><button className="brand-button" onClick={onOpen}>{row.brand}</button></div>
    <span role="cell" data-label="Характеристика"><span className={`brand-characteristic brand-characteristic-${row.characteristic}`} tabIndex={0} title={CHARACTERISTIC_DEFINITIONS[row.characteristic]}>{CHARACTERISTIC_LABELS[row.characteristic]}</span></span>
    <span role="cell" data-label="Категория">{row.category}</span>
    <span role="cell" data-label="Объекты"><MallList malls={row.malls} /></span>
  </div>;
}

function MallList({ malls }: { malls: string[] }) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const visible = malls.slice(0, 3);
  const close = () => setAnchor(null);
  useEffect(() => {
    if (!anchor) return;
    const dismiss = (event: Event) => { if (event.target instanceof Node && !buttonRef.current?.contains(event.target)) close(); };
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    document.addEventListener('pointerdown', dismiss);
    return () => { window.removeEventListener('resize', close); window.removeEventListener('scroll', close, true); document.removeEventListener('pointerdown', dismiss); };
  }, [anchor]);
  return <span className="brand-mall-list"><span>{visible.join('; ')}</span>{malls.length > visible.length ? <button ref={buttonRef} type="button" className="brand-mall-more" aria-expanded={Boolean(anchor)} onClick={() => setAnchor((current) => current ? null : buttonRef.current?.getBoundingClientRect() ?? null)}>Ещё {malls.length - visible.length}</button> : null}{anchor ? createPortal(<div className="brand-mall-popover" role="dialog" aria-label="Все объекты бренда" style={popoverPosition(anchor)}><strong>Объекты присутствия</strong><ul>{malls.map((mall) => <li key={mall}>{mall}</li>)}</ul></div>, document.body) : null}</span>;
}

function popoverPosition(anchor: DOMRect) {
  const width = Math.min(320, window.innerWidth - 24);
  const left = Math.max(12, Math.min(anchor.left, window.innerWidth - width - 12));
  const roomBelow = window.innerHeight - anchor.bottom;
  const top = roomBelow >= 220 ? anchor.bottom + 8 : Math.max(12, anchor.top - 228);
  return { left, top, width };
}

function createEmptyFilters() { return headers.reduce((result, [key]) => { result[key] = []; return result; }, {} as Record<SortKey, string[]>); }
function matchesRowFilters(row: BrandTableRow, filters: Record<SortKey, string[]>) {
  const mallsMatch = !filters.malls.length || (!filters.malls.includes(EMPTY_FILTER) && row.malls.some((mall) => filters.malls.includes(mall)));
  return matchesFilter(filters.brand, row.brand) && matchesFilter(filters.characteristic, CHARACTERISTIC_LABELS[row.characteristic]) && matchesFilter(filters.category, row.category) && mallsMatch;
}
function buildActiveFilters(filters: Record<SortKey, string[]>): ActiveTableFilter[] {
  return headers.flatMap(([key, label]) => filters[key].length ? [{ key, label, value: filters[key].includes(EMPTY_FILTER) ? 'ничего' : filters[key].length === 1 ? filters[key][0]! : `${filters[key].length} выбрано` }] : []);
}
function compareRows(left: BrandTableRow, right: BrandTableRow, sort: { key: SortKey; direction: 'asc' | 'desc' }) {
  let result = 0;
  if (sort.key === 'characteristic') result = CHARACTERISTIC_ORDER.indexOf(left.characteristic) - CHARACTERISTIC_ORDER.indexOf(right.characteristic);
  else if (sort.key === 'malls') result = left.malls.length - right.malls.length;
  else result = (sort.key === 'brand' ? left.brand : left.category).localeCompare(sort.key === 'brand' ? right.brand : right.category, 'ru', { numeric: true });
  return (sort.direction === 'asc' ? result : -result) || left.brand.localeCompare(right.brand, 'ru', { numeric: true });
}
