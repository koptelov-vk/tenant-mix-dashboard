import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { AnalysisContext, DashboardData } from '../types/dashboard';
import { formatArea, formatNumber, formatPercent } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { TenantMixStackedBar } from '../components/charts/TenantMixStackedBar';
import { MallSheet } from '../components/details/MallSheet';

export default function ComparabilityPage({ context, data }: { context: AnalysisContext; data: DashboardData }) {
  const [mode, setMode] = useState<'table' | 'cards'>('table');
  const [selectedMall, setSelectedMall] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
  const similarity = new Map(context.similarities.map((item) => [item.mall.mall, item]));
  const rows = useMemo(() => sort ? [...context.mallStats].sort((left, right) => compareValues(valueFor(left, sort.key, similarity), valueFor(right, sort.key, similarity), sort.direction)) : context.mallStats, [context.mallStats, context.similarities, sort]);
  const toggleSort = (key: SortKey) => setSort((current) => current?.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' });
  return <><div className="page-heading"><div><h1>Сопоставимость ТЦ</h1><p>Сравнение масштаба, состава брендов и структуры tenant mix текущего среза.</p></div><div className="segmented"><Button variant={mode === 'table' ? 'default' : 'outline'} onClick={() => setMode('table')}>Таблица</Button><Button variant={mode === 'cards' ? 'default' : 'outline'} onClick={() => setMode('cards')}>Карточки</Button></div></div>
    <Card>{mode === 'table' ? <div className="table-scroll"><table className="data-table"><thead><tr>{headers.map(([key, label]) => <th key={key} aria-sort={sort?.key === key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}><button className="sort-header" onClick={() => toggleSort(key)}>{label}{sort?.key === key ? (sort.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />) : <ArrowUpDown size={14} />}</button></th>)}</tr></thead><tbody>{rows.map((item) => { const sim = similarity.get(item.mall.mall); return <tr key={item.mall.mall} className={item.mall.mall === context.focusMall.mall ? 'focus-row' : ''}><th><button className="table-link" onClick={() => setSelectedMall(item.mall.mall)}>{item.mall.mall}</button>{item.mall.mall === context.focusMall.mall ? <small>Фокус</small> : null}</th><td>{item.mall.city}</td><td>{item.mall.mallClass}</td><td>{item.mall.glaConfirmed ? formatArea(item.mall.gla) : 'н/д'}</td><td>{formatArea(item.mall.gba)}</td><td>{item.brandCount}</td><td>{item.density10kGla == null ? 'н/д' : formatNumber.format(item.density10kGla)}</td><td>{sim ? formatPercent(sim.jaccard) : '—'}</td><td>{sim?.common ?? '—'}</td></tr>; })}</tbody></table></div> : <div className="mall-card-grid">{rows.map((item) => { const sim = similarity.get(item.mall.mall); return <article key={item.mall.mall} className={item.mall.mall === context.focusMall.mall ? 'mall-card focus' : 'mall-card'}><button className="mall-card-title" onClick={() => setSelectedMall(item.mall.mall)}>{item.mall.mall}</button><span>{item.mall.city} · {item.mall.mallClass}</span><dl><div><dt>Бренды</dt><dd>{item.brandCount}</dd></div><div><dt>GLA</dt><dd>{item.mall.glaConfirmed ? formatArea(item.mall.gla) : 'н/д'}</dd></div><div><dt>Жаккар</dt><dd>{sim ? formatPercent(sim.jaccard) : '—'}</dd></div></dl></article>; })}</div>}</Card>
    <Card><CardHeader eyebrow="Small multiples" title="Структура категорий объектов" /><TenantMixStackedBar context={context} /></Card>{selectedMall ? <MallSheet mallName={selectedMall} data={data} context={context} onClose={() => setSelectedMall(null)} /> : null}</>;
}

type SortKey = 'mall' | 'city' | 'class' | 'gla' | 'gba' | 'brands' | 'density' | 'jaccard' | 'common';
const headers: Array<[SortKey, string]> = [['mall', 'ТЦ'], ['city', 'Город'], ['class', 'Класс'], ['gla', 'GLA'], ['gba', 'GBA'], ['brands', 'Бренды'], ['density', 'На 10 000 м² GLA'], ['jaccard', 'Жаккар'], ['common', 'Общие бренды']];
function valueFor(item: AnalysisContext['mallStats'][number], key: SortKey, similarity: Map<string, AnalysisContext['similarities'][number]>) {
  const sim = similarity.get(item.mall.mall);
  return ({ mall: item.mall.mall, city: item.mall.city, class: item.mall.mallClass, gla: item.mall.glaConfirmed ? item.mall.gla : null, gba: item.mall.gba, brands: item.brandCount, density: item.density10kGla, jaccard: sim?.jaccard ?? null, common: sim?.common ?? null })[key];
}
function compareValues(left: string | number | null, right: string | number | null, direction: 'asc' | 'desc') {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  const result = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), 'ru', { numeric: true });
  return direction === 'asc' ? result : -result;
}
