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
import { MultiFilter, uniqueOptions } from '../components/ui/MultiFilter';

export default function BrandsPage({ context, data }: { context: AnalysisContext; data: DashboardData }) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'brand' | 'mall' | 'category'>('brand');
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');
  const [mallFilter, setMallFilter] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [qualityFilter, setQualityFilter] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<'all' | 'checked' | 'missing'>('all');
  const [brandKey, setBrandKey] = useState<string | null>(null);
  const debounced = useDebouncedValue(search);
  const cityByMall = useMemo(() => new Map(data.mallSummary.map((mall) => [mall.mall, mall.city])), [data]);
  const options = useMemo(() => ({ malls: uniqueOptions(context.filteredRows.map((row) => row.mall)), cities: uniqueOptions(context.filteredRows.map((row) => cityByMall.get(row.mall) ?? row.city)), categories: uniqueOptions(context.filteredRows.map((row) => row.category)), sources: uniqueOptions(context.filteredRows.map((row) => row.sourceType || 'н/д')), qualities: uniqueOptions(context.filteredRows.map((row) => row.sourceQuality || 'н/д')) }), [context.filteredRows, cityByMall]);
  const rows = useMemo(() => {
    let values = context.filteredRows;
    values = values.filter((row) => (!mallFilter.length || mallFilter.includes(row.mall)) && (!cityFilter.length || cityFilter.includes(cityByMall.get(row.mall) ?? row.city)) && (!categoryFilter.length || categoryFilter.includes(row.category)) && (!sourceFilter.length || sourceFilter.includes(row.sourceType || 'н/д')) && (!qualityFilter.length || qualityFilter.includes(row.sourceQuality || 'н/д')) && (dateFilter === 'all' || (dateFilter === 'checked' ? Boolean(row.checkedAt) : !row.checkedAt)));
    if (debounced.trim()) {
      const matches = fuzzysort.go(debounced, values, { keys: ['brand', 'brandNormalized', 'mall', 'category'], threshold: -10000 });
      values = matches.map((match: { obj: TenantRow }) => match.obj);
    }
    return [...values].sort((a, b) => (direction === 'asc' ? 1 : -1) * (sort === 'brand' ? a.brand.localeCompare(b.brand, 'ru') : sort === 'mall' ? a.mall.localeCompare(b.mall, 'ru') : a.category.localeCompare(b.category, 'ru')));
  }, [context.filteredRows, debounced, sort, direction, mallFilter, cityFilter, categoryFilter, sourceFilter, qualityFilter, dateFilter, cityByMall]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtual = useVirtualizer({ count: rows.length, getScrollElement: () => scrollRef.current, estimateSize: () => 54, overscan: 12 });
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0 }); }, [debounced, sort, direction, mallFilter, cityFilter, categoryFilter, sourceFilter, qualityFilter, dateFilter]);
  const activeFilters = mallFilter.length + cityFilter.length + categoryFilter.length + sourceFilter.length + qualityFilter.length + Number(dateFilter !== 'all');
  const resetLocal = () => { setSearch(''); setMallFilter([]); setCityFilter([]); setCategoryFilter([]); setSourceFilter([]); setQualityFilter([]); setDateFilter('all'); setSort('brand'); setDirection('asc'); };
  return <><div className="page-heading"><div><h1>Бренды</h1><p>{rows.length.toLocaleString('ru-RU')} строк · {new Set(rows.map((row) => row.brandNormalized)).size.toLocaleString('ru-RU')} брендов текущего среза</p></div><div className="page-actions"><Button variant="outline" onClick={() => downloadCsv(rows)}><Download size={17} />CSV</Button><Button variant="outline" onClick={() => downloadXlsx(rows)}><FileSpreadsheet size={17} />XLSX</Button></div></div>
    <Card className="registry"><div className="registry-toolbar"><label className="search-field"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Бренд, исходное название, ТЦ или категория" aria-label="Поиск по реестру" />{search ? <button onClick={() => setSearch('')} aria-label="Очистить поиск"><X size={16} /></button> : null}</label><label>Сортировка<select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="brand">Бренд</option><option value="mall">ТЦ</option><option value="category">Категория</option></select></label><label>Порядок<select value={direction} onChange={(event) => setDirection(event.target.value as typeof direction)}><option value="asc">По возрастанию</option><option value="desc">По убыванию</option></select></label>{activeFilters || search ? <Button variant="ghost" onClick={resetLocal}><RotateCcw size={16} />Сбросить</Button> : null}</div><div className="registry-local-filters" aria-label="Фильтры реестра"><MultiFilter label="ТЦ" options={options.malls} value={mallFilter} onChange={setMallFilter} /><MultiFilter label="Город" options={options.cities} value={cityFilter} onChange={setCityFilter} /><MultiFilter label="Категория" options={options.categories} value={categoryFilter} onChange={setCategoryFilter} /><MultiFilter label="Тип источника" options={options.sources} value={sourceFilter} onChange={setSourceFilter} /><MultiFilter label="Качество" options={options.qualities} value={qualityFilter} onChange={setQualityFilter} /><label className="registry-date-filter"><span>Дата проверки</span><select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as typeof dateFilter)}><option value="all">Все</option><option value="checked">Дата указана</option><option value="missing">Дата не указана</option></select></label></div><div className="registry-head" aria-hidden="true"><span>Бренд</span><span>ТЦ</span><span>Категория</span><span>Источник</span></div><div className="virtual-list" ref={scrollRef}><div style={{ height: `${virtual.getTotalSize()}px`, position: 'relative' }}>{virtual.getVirtualItems().map((item) => { const row = rows[item.index] as TenantRow | undefined; if (!row) return null; return <div key={`${row.mall}-${row.brandNormalized}`} className="registry-row" style={{ position: 'absolute', transform: `translateY(${item.start}px)`, height: `${item.size}px`, width: '100%' }}><button className="brand-button" onClick={() => setBrandKey(row.brandNormalized)}>{row.brand}<small>{row.brandNormalized}</small></button><span>{row.mall}<small>{cityByMall.get(row.mall)}</small></span><span>{row.category}</span><span>{row.sourceUrl ? <a href={row.sourceUrl} target="_blank" rel="noopener noreferrer">Источник <ExternalLink size={14} /></a> : 'Без ссылки'}<small>{row.sourceQuality ?? 'н/д'} · {row.checkedAt ?? 'дата н/д'}</small></span></div>; })}</div>{!rows.length ? <p className="empty-state">По текущим фильтрам строки не найдены.</p> : null}</div></Card>{brandKey ? <BrandSheet brandKey={brandKey} data={data} context={context} onClose={() => setBrandKey(null)} /> : null}</>;
}
