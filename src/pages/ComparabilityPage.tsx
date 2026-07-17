import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import type { AnalysisContext, DashboardData } from '../types/dashboard';
import { formatArea, formatNumber, formatPercent } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { TableColumnHeader } from '../components/ui/TableColumnHeader';
import { matchesFilter, uniqueOptions } from '../components/ui/MultiFilter';
import { TenantMixStackedBar } from '../components/charts/TenantMixStackedBar';
import { MallSheet } from '../components/details/MallSheet';

export default function ComparabilityPage({ context, data }: { context: AnalysisContext; data: DashboardData }) {
  const [mode, setMode] = useState<'table' | 'cards'>('table');
  const [selectedMall, setSelectedMall] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState<Record<SortKey, string[]>>(createEmptyFilters);
  const similarity = useMemo(() => new Map(context.similarities.map((item) => [item.mall.mall, item])), [context.similarities]);
  const options = useMemo(() => Object.fromEntries(headers.map(([key]) => [key, uniqueOptions(context.mallStats.map((item) => filterValue(item, key, similarity)))])) as Record<SortKey, string[]>, [context.mallStats, similarity]);
  const rows = useMemo(() => {
    const focus = context.mallStats.find((item) => item.mall.mall === context.focusMall.mall);
    const peers = context.mallStats.filter((item) => item.mall.mall !== context.focusMall.mall && headers.every(([key]) => matchesFilter(filters[key], filterValue(item, key, similarity))));
    if (sort) peers.sort((left, right) => compareValues(valueFor(left, sort.key, similarity), valueFor(right, sort.key, similarity), sort.direction));
    return focus ? [focus, ...peers] : peers;
  }, [context.mallStats, context.focusMall.mall, similarity, sort, filters]);
  const activeFilters = Object.values(filters).filter((value) => value.length).length;
  const toggleSort = (key: SortKey) => setSort((current) => current?.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' });
  const setColumnFilter = (key: SortKey, value: string[]) => setFilters((current) => ({ ...current, [key]: value }));
  const resetTable = () => { setFilters(createEmptyFilters()); setSort(null); };

  return <><div className="page-heading"><div><h1>Сопоставимость объектов</h1><p>Сравнение масштаба, состава брендов и структуры tenant mix текущего среза.</p></div><div className="segmented"><Button variant={mode === 'table' ? 'default' : 'outline'} onClick={() => setMode('table')}>Таблица</Button><Button variant={mode === 'cards' ? 'default' : 'outline'} onClick={() => setMode('cards')}>Карточки</Button></div></div>
    <Card className="comparison-table-panel">{mode === 'table' ? <><div className="table-meta-bar"><span><strong>{rows.length}</strong> объектов на экране · {context.peerMalls.length} в группе сравнения</span>{activeFilters || sort ? <Button variant="ghost" onClick={resetTable}><RotateCcw size={16} />Сбросить</Button> : null}</div><div className="table-scroll"><table className="data-table comparison-table unified-table"><caption className="sr-only">Сравнение характеристик и состава брендов объектов</caption><thead><tr>{headers.map(([key, label, unit]) => <th key={key} className={numericKeys.has(key) ? 'numeric-column' : ''} aria-sort={sort?.key === key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}><TableColumnHeader label={label} unit={unit} numeric={numericKeys.has(key)} direction={sort?.key === key ? sort.direction : null} onSort={() => toggleSort(key)} options={options[key]} filterValue={filters[key]} onFilterChange={(value) => setColumnFilter(key, value)} /></th>)}</tr></thead><tbody>{rows.map((item) => { const sim = similarity.get(item.mall.mall); const isFocus = item.mall.mall === context.focusMall.mall; return <tr key={item.mall.mall} className={isFocus ? 'focus-row' : ''}><th><button className="table-link" onClick={() => setSelectedMall(item.mall.mall)}>{item.mall.mall}</button>{isFocus ? <small>Фокусный объект</small> : null}</th><td>{item.mall.city}</td><td><span className="class-label">{item.mall.mallClass}</span></td><td className="numeric-column">{item.mall.glaConfirmed ? formatArea(item.mall.gla) : 'н/д'}</td><td className="numeric-column">{formatArea(item.mall.gba)}</td><td className="numeric-column"><strong>{item.brandCount}</strong></td><td className="numeric-column">{item.density10kGla == null ? 'н/д' : formatNumber.format(item.density10kGla)}</td><td className="numeric-column">{sim ? formatPercent(sim.jaccard) : '—'}</td><td className="numeric-column">{sim?.common ?? '—'}</td></tr>; })}</tbody></table></div>{rows.length <= 1 && context.mallStats.length > 1 ? <p className="empty-state">По выбранным фильтрам объекты сравнения не найдены. Фокусный объект сохранен в таблице.</p> : null}</> : <div className="mall-card-grid">{rows.map((item) => { const sim = similarity.get(item.mall.mall); return <article key={item.mall.mall} className={item.mall.mall === context.focusMall.mall ? 'mall-card focus' : 'mall-card'}><button className="mall-card-title" onClick={() => setSelectedMall(item.mall.mall)}>{item.mall.mall}</button><span>{item.mall.city} · {item.mall.mallClass}</span><dl><div><dt>Бренды</dt><dd>{item.brandCount}</dd></div><div><dt>GLA</dt><dd>{item.mall.glaConfirmed ? formatArea(item.mall.gla) : 'н/д'}</dd></div><div><dt>Жаккар</dt><dd>{sim ? formatPercent(sim.jaccard) : '—'}</dd></div></dl></article>; })}</div>}</Card>
    <Card><CardHeader eyebrow="Small multiples" title="Структура категорий объектов" /><TenantMixStackedBar context={context} /></Card>{selectedMall ? <MallSheet mallName={selectedMall} data={data} context={context} onClose={() => setSelectedMall(null)} /> : null}</>;
}

type SortKey = 'mall' | 'city' | 'class' | 'gla' | 'gba' | 'brands' | 'density' | 'jaccard' | 'common';
const headers: Array<[SortKey, string, string?]> = [['mall', 'Объект'], ['city', 'Город'], ['class', 'Класс'], ['gla', 'GLA', 'м²'], ['gba', 'GBA', 'м²'], ['brands', 'Бренды'], ['density', 'Плотность', 'на 10 000 м² GLA'], ['jaccard', 'Сходство', 'индекс Жаккара'], ['common', 'Общие бренды']];
const numericKeys = new Set<SortKey>(['gla', 'gba', 'brands', 'density', 'jaccard', 'common']);
function createEmptyFilters() { return headers.reduce((result, [key]) => { result[key] = []; return result; }, {} as Record<SortKey, string[]>); }
function valueFor(item: AnalysisContext['mallStats'][number], key: SortKey, similarity: Map<string, AnalysisContext['similarities'][number]>) {
  const sim = similarity.get(item.mall.mall);
  return ({ mall: item.mall.mall, city: item.mall.city, class: item.mall.mallClass, gla: item.mall.glaConfirmed ? item.mall.gla : null, gba: item.mall.gba, brands: item.brandCount, density: item.density10kGla, jaccard: sim?.jaccard ?? null, common: sim?.common ?? null })[key];
}
function filterValue(item: AnalysisContext['mallStats'][number], key: SortKey, similarity: Map<string, AnalysisContext['similarities'][number]>) {
  const value = valueFor(item, key, similarity);
  if (value == null) return 'н/д';
  if (key === 'gla' || key === 'gba') return formatArea(value as number);
  if (key === 'density') return formatNumber.format(value as number);
  if (key === 'jaccard') return formatPercent(value as number);
  return String(value);
}
function compareValues(left: string | number | null, right: string | number | null, direction: 'asc' | 'desc') {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  const result = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), 'ru', { numeric: true });
  return direction === 'asc' ? result : -result;
}
