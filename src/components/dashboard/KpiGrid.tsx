import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { AnalysisContext } from '../../types/dashboard';
import { formatNumber, formatPercent } from '../../lib/utils';
import { Tooltip } from '../ui/Tooltip';

export function KpiGrid({ context }: { context: AnalysisContext }) {
  const [showGaps, setShowGaps] = useState(false);
  const [showMethod, setShowMethod] = useState(false);
  const focusCount = context.benchmark.focusBrandCount;
  const exclusiveCount = context.uniqueness.focusExclusive.size;
  const intersectionCount = context.intersections.intersecting.size;
  const rankAvailable = context.benchmark.rank != null;
  const items = [
    { label: 'Бренды фокусного объекта', value: formatNumber.format(focusCount), note: context.benchmark.peerMedian == null ? 'медиана н/д' : `медиана группы ${formatNumber.format(context.benchmark.peerMedian)}`, formula: 'Различные нормализованные бренды фокусного объекта в текущем срезе.' },
    { label: 'Позиция в группе', value: rankAvailable ? `${context.benchmark.rank}-е` : 'нет позиции', note: rankAvailable ? `из ${context.benchmark.totalInGroup} объектов` : 'нет учитываемых брендов', formula: 'Competition ranking по числу брендов текущего среза: одинаковые ненулевые значения получают одинаковое место, следующее место учитывает число предыдущих объектов. При нулевом значении позиция не рассчитывается.' },
    { label: 'Эксклюзивы', value: formatNumber.format(exclusiveCount), note: `${formatPercent(focusCount ? exclusiveCount / focusCount : 0)} брендов объекта`, formula: 'Бренд есть в фокусном объекте и отсутствует у всех объектов текущей группы сравнения.' },
    { label: 'Пересечение с группой', value: formatNumber.format(intersectionCount), note: `${formatPercent(focusCount ? intersectionCount / focusCount : 0)} брендов объекта`, formula: 'Бренды фокусного объекта, представленные хотя бы у одного выбранного конкурента.' },
    { label: 'Категории ниже медианы', value: formatNumber.format(context.benchmark.categoryGaps.length), note: context.benchmark.categoryGaps.length ? 'Показать полный список' : 'нет отклонений', formula: 'Категории, где число брендов фокусного объекта ниже медианы текущей группы сравнения.' },
  ];
  return <><section className="kpi-grid kpi-grid-five" aria-label="Управленческие показатели">{items.map((item, index) => <article className="kpi" key={item.label}><span>{item.label}<Tooltip label={item.formula} /></span><strong>{item.value}</strong>{index === items.length - 1 && context.benchmark.categoryGaps.length ? <button className="kpi-detail-button" onClick={() => setShowGaps(!showGaps)} aria-expanded={showGaps}>{item.note}{showGaps ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button> : <small>{item.note}</small>}</article>)}</section><button className="method-toggle" type="button" onClick={() => setShowMethod(!showMethod)} aria-expanded={showMethod}>{showMethod ? 'Скрыть методику' : 'Как рассчитаны уникальность и пересечения'}{showMethod ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button>{showMethod ? <section className="panel method-panel" aria-label="Методика расчёта уникальности и пересечений"><h2>Уникальность и пересечения</h2><p><strong>Эксклюзивы</strong> — нормализованные бренды фокусного объекта, которых нет ни в одном объекте текущей группы сравнения.</p><p><strong>Пересечение с группой</strong> — бренды фокусного объекта, присутствующие хотя бы в одном объекте текущей группы.</p><p>Доли рассчитываются от общего количества нормализованных брендов фокусного объекта. Результат меняется при изменении группы сравнения, географии, категорий и выбранных объектов.</p></section> : null}{showGaps ? <section className="panel kpi-gap-details"><div className="panel-title"><div><span className="eyebrow">Текущий срез</span><h2>Категории ниже медианы группы</h2></div><button className="button button-ghost" onClick={() => setShowGaps(false)}>Скрыть</button></div><div className="gap-chip-list">{context.benchmark.categoryGaps.map((category) => <span className="badge badge-warning" key={category}>{category}</span>)}</div></section> : null}</>;
}
