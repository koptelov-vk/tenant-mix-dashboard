import { CircleHelp } from 'lucide-react';
import type { AnalysisContext } from '../../types/dashboard';
import { formatNumber, formatPercent } from '../../lib/utils';
import { Tooltip } from '../ui/Tooltip';

export function KpiGrid({ context }: { context: AnalysisContext }) {
  const focusCount = context.benchmark.focusBrandCount;
  const exclusiveCount = context.uniqueness.focusExclusive.size;
  const intersectionCount = context.intersections.intersecting.size;
  const items = [
    { label: 'Бренды фокусного ТЦ', value: formatNumber.format(focusCount), note: context.benchmark.peerMedian == null ? 'медиана н/д' : `медиана группы ${formatNumber.format(context.benchmark.peerMedian)}`, formula: 'Различные нормализованные бренды фокусного ТЦ в текущем срезе.' },
    { label: 'Позиция в peer group', value: context.benchmark.rank == null ? 'н/д' : `${context.benchmark.rank}-е`, note: `из ${context.benchmark.totalInGroup} объектов`, formula: 'Рейтинг по числу брендов текущего среза. Фокус отображается вместе с peer group.' },
    { label: 'Эксклюзивы', value: formatNumber.format(exclusiveCount), note: context.uniqueness.scopeLabel, formula: 'Бренд есть в фокусном ТЦ и отсутствует у выбранных конкурентов.' },
    { label: 'Доля эксклюзивов', value: formatPercent(focusCount ? exclusiveCount / focusCount : 0), note: `из ${focusCount} брендов`, formula: 'Эксклюзивы фокусного ТЦ / бренды фокусного ТЦ.' },
    { label: 'Пересечение с группой', value: formatNumber.format(intersectionCount), note: formatPercent(focusCount ? intersectionCount / focusCount : 0), formula: 'Бренды фокусного ТЦ, представленные хотя бы у одного выбранного конкурента.' },
    { label: 'Категории ниже медианы', value: formatNumber.format(context.benchmark.categoryGaps.length), note: context.benchmark.categoryGaps.slice(0, 2).join(', ') || 'нет отклонений', formula: 'Категории, где число брендов фокусного ТЦ ниже медианы текущей peer group.' },
  ];
  return <section className="kpi-grid kpi-grid-six" aria-label="Управленческие показатели">{items.map((item) => <article className="kpi" key={item.label}><span>{item.label}<Tooltip label={item.formula} /></span><strong>{item.value}</strong><small>{item.note}</small></article>)}</section>;
}
