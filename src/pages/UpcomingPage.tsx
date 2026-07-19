import { differenceInCalendarDays, parseISO } from 'date-fns';
import { ExternalLink, RotateCcw, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AnalysisContext, DashboardData, UpcomingOpening } from '../types/dashboard';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TableColumnHeader } from '../components/ui/TableColumnHeader';
import { matchesFilter, MultiFilter, uniqueOptions } from '../components/ui/MultiFilter';
import { ActiveTableFilters, type ActiveTableFilter } from '../components/table/ActiveTableFilters';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

const status = (plannedDate: string, explicit: string) => {
  if (!plannedDate) return explicit || 'Скоро открытие';
  return differenceInCalendarDays(parseISO(plannedDate), new Date()) < 0 ? 'Срок прошёл — требуется проверка' : 'Скоро открытие';
};
type UpcomingRow = UpcomingOpening & { currentStatus: string };
type SortKey = 'mall' | 'brand' | 'category' | 'source';
const headers: Array<[SortKey, string]> = [['mall', 'Объект'], ['brand', 'Бренд'], ['category', 'Категория'], ['source', 'Источник']];

export default function UpcomingPage({ context, data }: { context: AnalysisContext; data: DashboardData }) {
  const malls = new Set(context.displayMalls.map((mall) => mall.mall));
  const baseRows = useMemo<UpcomingRow[]>(() => data.upcoming.filter((item) => malls.has(item.mall)).map((item) => ({ ...item, currentStatus: status(item.plannedDate, item.status) })), [data.upcoming, context.displayMalls]);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search);
  const [filters, setFilters] = useState<Record<SortKey, string[]>>(createEmptyFilters);
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'mall', direction: 'asc' });
  const options = useMemo(() => Object.fromEntries(headers.map(([key]) => [key, uniqueOptions(baseRows.map((item) => valueFor(item, key)))])) as Record<SortKey, string[]>, [baseRows]);
  const rows = useMemo(() => baseRows
    .filter((item) => !debounced.trim() || [item.mall, item.brand, item.category, item.currentStatus, item.comment, sourceLabel(item.sourceUrl)].join(' ').toLocaleLowerCase('ru').includes(debounced.trim().toLocaleLowerCase('ru')))
    .filter((item) => headers.every(([key]) => matchesFilter(filters[key], valueFor(item, key))))
    .sort((left, right) => compareText(valueFor(left, sort.key), valueFor(right, sort.key), sort.direction)), [baseRows, debounced, filters, sort]);
  const setColumnFilter = (key: SortKey, value: string[]) => setFilters((current) => ({ ...current, [key]: value }));
  const toggleSort = (key: SortKey) => setSort((current) => current.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' });
  const reset = () => { setSearch(''); setFilters(createEmptyFilters()); setSort({ key: 'mall', direction: 'asc' }); };
  const activeFilters = useMemo(() => buildActiveFilters(filters), [filters]);
  const hasChangedState = activeFilters.length > 0 || Boolean(search) || sort.key !== 'mall' || sort.direction !== 'asc';

  return <><div className="page-heading"><div><h1>Скоро открытие</h1><p>{rows.length} из {baseRows.length} подтверждённых анонсов в текущем срезе. Просроченная плановая дата не означает автоматическое открытие.</p></div></div>
    <Card className="upcoming-panel unified-table-panel"><div className="registry-toolbar upcoming-toolbar"><label className="search-field"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по объекту, бренду, категории или источнику" aria-label="Поиск в таблице скоро открытие" />{search ? <button onClick={() => setSearch('')} aria-label="Очистить поиск"><X size={16} /></button> : null}</label><span className="registry-result-count" role="status" aria-live="polite"><strong>{rows.length}</strong> анонсов</span></div>
      <div className="upcoming-mobile-controls" aria-label="Фильтры и сортировка скоро открытие"><label><span>Сортировка</span><select value={sort.key} onChange={(event) => setSort({ key: event.target.value as SortKey, direction: sort.direction })}>{headers.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><Button variant="outline" onClick={() => setSort((current) => ({ ...current, direction: current.direction === 'asc' ? 'desc' : 'asc' }))}>{sort.direction === 'asc' ? 'По возрастанию' : 'По убыванию'}</Button>{headers.map(([key, label]) => <MultiFilter key={key} label={label} options={options[key]} value={filters[key]} onChange={(value) => setColumnFilter(key, value)} />)}</div>
      <ActiveTableFilters filters={activeFilters} onRemove={(key) => setColumnFilter(key as SortKey, [])} onReset={reset} />
      <div className="table-meta-bar"><span><strong>{rows.length}</strong> из {baseRows.length} анонсов</span>{hasChangedState ? <Button variant="ghost" onClick={reset}><RotateCcw size={16} />Сбросить</Button> : null}</div>
      <div className="table-scroll upcoming-table-scroll" role="region" aria-label="Таблица будущих открытий. Доступна горизонтальная прокрутка" tabIndex={0}><table className="data-table upcoming-table unified-table"><caption className="sr-only">Анонсы будущих открытий: объект, бренд, категория и источник</caption><thead><tr>{headers.map(([key, label]) => <th key={key} scope="col" aria-sort={sort.key === key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}><TableColumnHeader label={label} direction={sort.key === key ? sort.direction : null} onSort={() => toggleSort(key)} options={options[key]} filterValue={filters[key]} onFilterChange={(value) => setColumnFilter(key, value)} /></th>)}</tr></thead><tbody>{rows.map((item) => <tr key={`${item.mall}-${item.brand}-${item.sourceUrl}`}><th scope="row">{item.mall}</th><td>{item.brand}</td><td>{item.category}</td><td>{item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`Открыть источник для ${item.brand}: ${sourceLabel(item.sourceUrl)}`}><span>{sourceLabel(item.sourceUrl)}</span><ExternalLink size={14} aria-hidden="true" /></a> : 'Без ссылки'}</td></tr>)}</tbody></table></div>{!rows.length ? <p className="empty-state">По выбранным фильтрам анонсы не найдены.</p> : null}</Card></>;
}
function createEmptyFilters() { return headers.reduce((result, [key]) => { result[key] = []; return result; }, {} as Record<SortKey, string[]>); }
function buildActiveFilters(filters: Record<SortKey, string[]>): ActiveTableFilter[] { return headers.flatMap(([key, label]) => filters[key].length ? [{ key, label, value: filters[key].length === 1 ? filters[key][0]! : `${filters[key].length} выбрано` }] : []); }
function valueFor(item: UpcomingRow, key: SortKey) { return ({ mall: item.mall, brand: item.brand, category: item.category, source: item.sourceUrl ? sourceLabel(item.sourceUrl) : 'Без ссылки' })[key]; }
function sourceLabel(value: string) { if (!value) return 'Без ссылки'; try { return new URL(value).hostname.replace(/^www\./, ''); } catch { return 'Источник'; } }
function compareText(left: string, right: string, direction: 'asc' | 'desc') { const result = left.localeCompare(right, 'ru', { numeric: true }); return direction === 'asc' ? result : -result; }
