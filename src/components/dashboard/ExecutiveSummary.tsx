import { CircleCheck, Info, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { AnalysisContext } from '../../types/dashboard';
import { formatNumber, formatPercent } from '../../lib/utils';
import { useDashboardStore } from '../../stores/dashboardStore';
import { Card, CardHeader } from '../ui/Card';

export function ExecutiveSummary({ context }: { context: AnalysisContext }) {
  const setPage = useDashboardStore((state) => state.setActivePage);
  const categoryDeltas = context.categoryStats
    .filter((item) => item.shareMedian != null)
    .map((item) => ({ ...item, delta: item.focus.share - (item.shareMedian ?? 0) }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const above = categoryDeltas.find((item) => item.delta > 0.005);
  const below = categoryDeltas.find((item) => item.delta < -0.005);
  const nearest = context.similarities[0];
  const positionText = context.benchmark.rank == null
    ? `${context.focusMall.mall} не имеет позиции в группе: в текущем срезе нет учитываемых брендов.`
    : `${context.focusMall.mall} занимает ${context.benchmark.rank}-е место из ${context.benchmark.totalInGroup} объектов по числу брендов текущего среза.`;
  const items = [
    { icon: context.benchmark.rank === 1 ? CircleCheck : Minus, tone: 'neutral', text: positionText, page: 'comparability' as const },
    above ? { icon: TrendingUp, tone: 'positive', text: `Доля категории «${above.category}» на ${formatNumber.format(above.delta * 100)} п.п. выше медианы группы сравнения.`, page: 'categories' as const } : null,
    below ? { icon: TrendingDown, tone: 'warning', text: `Доля категории «${below.category}» на ${formatNumber.format(Math.abs(below.delta) * 100)} п.п. ниже медианы группы сравнения; отклонение требует дополнительного анализа.`, page: 'categories' as const } : null,
    { icon: Info, tone: 'neutral', text: `Эксклюзивы составляют ${formatPercent(context.benchmark.focusBrandCount ? context.uniqueness.focusExclusive.size / context.benchmark.focusBrandCount : 0)} состава фокусного объекта.`, page: 'categories' as const },
    nearest ? { icon: CircleCheck, tone: 'neutral', text: `Наибольшее сходство состава брендов — с ${nearest.mall.mall}: Жаккар ${formatPercent(nearest.jaccard)} (${nearest.common} общих брендов).`, page: 'comparability' as const } : null,
  ].filter((item): item is NonNullable<typeof item> => item != null).slice(0, 5);
  return <Card><CardHeader title="Ключевые выводы" /><ol className="executive-list">{items.map((item, index) => { const Icon = item.icon; return <li key={item.text} className={item.tone}><span><Icon size={17} aria-hidden="true" /></span><p>{item.text}</p><button onClick={() => setPage(item.page)} aria-label={`Открыть детализацию вывода ${index + 1}`}>Подробнее</button></li>; })}</ol></Card>;
}
