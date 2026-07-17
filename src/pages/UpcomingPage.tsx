import { differenceInCalendarDays, parseISO } from 'date-fns';
import { ExternalLink, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AnalysisContext, DashboardData } from '../types/dashboard';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MultiFilter, uniqueOptions } from '../components/ui/MultiFilter';

const status = (plannedDate: string, explicit: string) => {
  if (!plannedDate) return explicit || 'анонсировано';
  const days = differenceInCalendarDays(parseISO(plannedDate), new Date());
  return days < 0 ? 'срок прошёл — требуется проверка' : 'ожидается';
};

export default function UpcomingPage({ context, data }: { context: AnalysisContext; data: DashboardData }) {
  const malls = new Set(context.displayMalls.map((mall) => mall.mall));
  const baseRows = useMemo(() => data.upcoming.filter((item) => malls.has(item.mall)).map((item) => ({ ...item, currentStatus: status(item.plannedDate, item.status) })), [data.upcoming, context.displayMalls]);
  const [mallFilter, setMallFilter] = useState<string[]>([]);
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [publicationFilter, setPublicationFilter] = useState<string[]>([]);
  const [plannedFilter, setPlannedFilter] = useState<string[]>([]);
  const [checkedFilter, setCheckedFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const options = useMemo(() => ({
    malls: uniqueOptions(baseRows.map((item) => item.mall)), brands: uniqueOptions(baseRows.map((item) => item.brand)), categories: uniqueOptions(baseRows.map((item) => item.category)),
    publications: uniqueOptions(baseRows.map((item) => item.announcementDate || 'н/д')), planned: uniqueOptions(baseRows.map((item) => item.plannedDate || 'н/д')),
    checked: uniqueOptions(baseRows.map((item) => item.checkedAt || 'н/д')), statuses: uniqueOptions(baseRows.map((item) => item.currentStatus)), sources: uniqueOptions(baseRows.map((item) => item.sourceUrl ? 'Есть ссылка' : 'Без ссылки')),
  }), [baseRows]);
  const rows = useMemo(() => baseRows.filter((item) =>
    (!mallFilter.length || mallFilter.includes(item.mall)) && (!brandFilter.length || brandFilter.includes(item.brand)) && (!categoryFilter.length || categoryFilter.includes(item.category)) &&
    (!publicationFilter.length || publicationFilter.includes(item.announcementDate || 'н/д')) && (!plannedFilter.length || plannedFilter.includes(item.plannedDate || 'н/д')) &&
    (!checkedFilter.length || checkedFilter.includes(item.checkedAt || 'н/д')) && (!statusFilter.length || statusFilter.includes(item.currentStatus)) &&
    (!sourceFilter.length || sourceFilter.includes(item.sourceUrl ? 'Есть ссылка' : 'Без ссылки'))
  ), [baseRows, mallFilter, brandFilter, categoryFilter, publicationFilter, plannedFilter, checkedFilter, statusFilter, sourceFilter]);
  const activeFilters = mallFilter.length + brandFilter.length + categoryFilter.length + publicationFilter.length + plannedFilter.length + checkedFilter.length + statusFilter.length + sourceFilter.length;
  const reset = () => { setMallFilter([]); setBrandFilter([]); setCategoryFilter([]); setPublicationFilter([]); setPlannedFilter([]); setCheckedFilter([]); setStatusFilter([]); setSourceFilter([]); };
  return <><div className="page-heading"><div><h1>Скоро открытие</h1><p>{rows.length} из {baseRows.length} подтверждённых анонсов в текущем срезе. Просроченная плановая дата не означает автоматическое открытие.</p></div>{activeFilters ? <Button variant="outline" onClick={reset}><RotateCcw size={16} />Сбросить фильтры</Button> : null}</div><Card className="upcoming-panel"><div className="registry-local-filters upcoming-filters" aria-label="Фильтры таблицы скоро открытие"><MultiFilter label="ТЦ" options={options.malls} value={mallFilter} onChange={setMallFilter} /><MultiFilter label="Бренд" options={options.brands} value={brandFilter} onChange={setBrandFilter} /><MultiFilter label="Категория" options={options.categories} value={categoryFilter} onChange={setCategoryFilter} /><MultiFilter label="Публикация" options={options.publications} value={publicationFilter} onChange={setPublicationFilter} /><MultiFilter label="Плановая дата" options={options.planned} value={plannedFilter} onChange={setPlannedFilter} /><MultiFilter label="Проверено" options={options.checked} value={checkedFilter} onChange={setCheckedFilter} /><MultiFilter label="Статус" options={options.statuses} value={statusFilter} onChange={setStatusFilter} /><MultiFilter label="Источник" options={options.sources} value={sourceFilter} onChange={setSourceFilter} /></div><div className="table-scroll"><table className="data-table upcoming-table"><caption className="sr-only">Анонсы будущих открытий по текущему срезу</caption><thead><tr><th>ТЦ</th><th>Бренд</th><th>Категория</th><th>Публикация</th><th>Плановая дата</th><th>Проверено</th><th>Статус</th><th>Источник</th></tr></thead><tbody>{rows.map((item) => <tr key={`${item.mall}-${item.brand}-${item.sourceUrl}`}><td>{item.mall}</td><th>{item.brand}</th><td>{item.category}</td><td>{item.announcementDate || 'н/д'}</td><td>{item.plannedDate || 'н/д'}</td><td>{item.checkedAt || 'н/д'}</td><td><Badge tone={item.currentStatus.includes('требуется') ? 'warning' : 'info'}>{item.currentStatus}</Badge></td><td>{item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Источник <ExternalLink size={14} /></a> : 'Без ссылки'}</td></tr>)}</tbody></table></div>{!rows.length ? <p className="empty-state">По выбранным фильтрам анонсы не найдены.</p> : null}</Card></>;
}
