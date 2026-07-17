import { differenceInCalendarDays, parseISO } from 'date-fns';
import { ExternalLink, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AnalysisContext, DashboardData, UpcomingOpening } from '../types/dashboard';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TableColumnHeader } from '../components/ui/TableColumnHeader';
import { matchesFilter, uniqueOptions } from '../components/ui/MultiFilter';

const status = (plannedDate: string, explicit: string) => {
  if (!plannedDate) return explicit || 'анонсировано';
  const days = differenceInCalendarDays(parseISO(plannedDate), new Date());
  return days < 0 ? 'срок прошёл — требуется проверка' : 'ожидается';
};

type UpcomingRow = UpcomingOpening & { currentStatus: string };
type SortKey = 'mall' | 'brand' | 'category' | 'publication' | 'planned' | 'checked' | 'status' | 'source';
const headers: Array<[SortKey, string]> = [['mall', 'ТЦ'], ['brand', 'Бренд'], ['category', 'Категория'], ['publication', 'Публикация'], ['planned', 'Плановая дата'], ['checked', 'Проверено'], ['status', 'Статус'], ['source', 'Источник']];

export default function UpcomingPage({ context, data }: { context: AnalysisContext; data: DashboardData }) {
  const malls = new Set(context.displayMalls.map((mall) => mall.mall));
  const baseRows = useMemo<UpcomingRow[]>(() => data.upcoming.filter((item) => malls.has(item.mall)).map((item) => ({ ...item, currentStatus: status(item.plannedDate, item.status) })), [data.upcoming, context.displayMalls]);
  const [filters, setFilters] = useState<Record<SortKey, string[]>>(createEmptyFilters);
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'mall', direction: 'asc' });
  const options = useMemo(() => Object.fromEntries(headers.map(([key]) => [key, uniqueOptions(baseRows.map((item) => valueFor(item, key)))])) as Record<SortKey, string[]>, [baseRows]);
  const rows = useMemo(() => baseRows
    .filter((item) => headers.every(([key]) => matchesFilter(filters[key], valueFor(item, key))))
    .sort((left, right) => compareText(valueFor(left, sort.key), valueFor(right, sort.key), sort.direction)), [baseRows, filters, sort]);
  const activeFilters = Object.values(filters).filter((value) => value.length).length;
  const setColumnFilter = (key: SortKey, value: string[]) => setFilters((current) => ({ ...current, [key]: value }));
  const toggleSort = (key: SortKey) => setSort((current) => current.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' });
  const reset = () => { setFilters(createEmptyFilters()); setSort({ key: 'mall', direction: 'asc' }); };

  return <><div className="page-heading"><div><h1>Скоро открытие</h1><p>{rows.length} из {baseRows.length} подтверждённых анонсов в текущем срезе. Просроченная плановая дата не означает автоматическое открытие.</p></div></div>
    <Card className="upcoming-panel unified-table-panel"><div className="table-meta-bar"><span><strong>{rows.length}</strong> из {baseRows.length} анонсов</span>{activeFilters || sort.key !== 'mall' || sort.direction !== 'asc' ? <Button variant="ghost" onClick={reset}><RotateCcw size={16} />Сбросить</Button> : null}</div><div className="table-scroll"><table className="data-table upcoming-table unified-table"><caption className="sr-only">Анонсы будущих открытий по текущему срезу</caption><thead><tr>{headers.map(([key, label]) => <th key={key} aria-sort={sort.key === key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}><TableColumnHeader label={label} direction={sort.key === key ? sort.direction : null} onSort={() => toggleSort(key)} options={options[key]} filterValue={filters[key]} onFilterChange={(value) => setColumnFilter(key, value)} /></th>)}</tr></thead><tbody>{rows.map((item) => <tr key={`${item.mall}-${item.brand}-${item.sourceUrl}`}><td>{item.mall}</td><th>{item.brand}</th><td>{item.category}</td><td>{item.announcementDate || 'н/д'}</td><td>{item.plannedDate || 'н/д'}</td><td>{item.checkedAt || 'н/д'}</td><td><Badge tone={item.currentStatus.includes('требуется') ? 'warning' : 'info'}>{item.currentStatus}</Badge></td><td>{item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Источник <ExternalLink size={14} /></a> : 'Без ссылки'}</td></tr>)}</tbody></table></div>{!rows.length ? <p className="empty-state">По выбранным фильтрам анонсы не найдены.</p> : null}</Card></>;
}

function createEmptyFilters() { return headers.reduce((result, [key]) => { result[key] = []; return result; }, {} as Record<SortKey, string[]>); }
function valueFor(item: UpcomingRow, key: SortKey) {
  return ({ mall: item.mall, brand: item.brand, category: item.category, publication: item.announcementDate || 'н/д', planned: item.plannedDate || 'н/д', checked: item.checkedAt || 'н/д', status: item.currentStatus, source: item.sourceUrl ? 'Есть ссылка' : 'Без ссылки' })[key];
}
function compareText(left: string, right: string, direction: 'asc' | 'desc') {
  const result = left.localeCompare(right, 'ru', { numeric: true });
  return direction === 'asc' ? result : -result;
}
