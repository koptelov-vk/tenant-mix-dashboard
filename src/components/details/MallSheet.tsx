import { ExternalLink, X } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import type { AnalysisContext, DashboardData } from '../../types/dashboard';
import { formatArea, formatNumber, formatPercent } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export function MallSheet({ mallName, data, context, onClose }: { mallName: string; data: DashboardData; context: AnalysisContext; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const stats = context.mallStats.find((item) => item.mall.mall === mallName);
  const rows = context.filteredRows.filter((row) => row.mall === mallName);
  const brandKeys = useMemo(() => new Set(rows.map((row) => row.brandNormalized)), [rows]);
  const sourceRows = rows.filter((row) => row.sourceUrl);
  const globalUnique = [...brandKeys].filter((key) => data.brandPresence[key]?.mallCount === 1).length;
  const topCategories = stats ? Object.entries(stats.categoryCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru')).slice(0, 6) : [];
  const belowMedian = context.categoryStats.flatMap((category) => {
    const value = category.values.find((item) => item.mall === mallName);
    return value && category.countMedian != null && value.count < category.countMedian
      ? [{ category: category.category, value: value.count, median: category.countMedian }]
      : [];
  }).sort((a, b) => (a.value - a.median) - (b.value - b.median)).slice(0, 5);
  const similarity = mallName === context.focusMall.mall ? null : context.similarities.find((item) => item.mall.mall === mallName);

  useEffect(() => {
    panel.current?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  if (!stats) return null;
  return <div className="sheet-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><div className="sheet" role="dialog" aria-modal="true" aria-labelledby="mall-sheet-title" tabIndex={-1} ref={panel}><header><div><p className="eyebrow">Карточка ТЦ</p><h2 id="mall-sheet-title">{stats.mall.mall}</h2><p className="sheet-subtitle">{stats.mall.city} · {stats.mall.mallClass}</p></div><Button variant="ghost" onClick={onClose} aria-label="Закрыть"><X /></Button></header>
    <dl className="detail-list"><div><dt>GLA</dt><dd>{stats.mall.glaConfirmed ? formatArea(stats.mall.gla) : 'н/д'}</dd></div><div><dt>GBA</dt><dd>{formatArea(stats.mall.gba)}</dd></div><div><dt>Бренды текущего среза</dt><dd>{stats.brandCount}</dd></div><div><dt>Категории</dt><dd>{stats.categoryCount}</dd></div><div><dt>Плотность</dt><dd>{stats.density10kGla == null ? 'н/д' : `${formatNumber.format(stats.density10kGla)} бренда на 10 000 м² GLA`}</dd></div><div><dt>Глобальная уникальность</dt><dd>{globalUnique} · {stats.brandCount ? formatPercent(globalUnique / stats.brandCount) : '0%'}</dd></div>{similarity ? <><div><dt>Жаккар с фокусным ТЦ</dt><dd>{formatPercent(similarity.jaccard)}</dd></div><div><dt>Общие бренды</dt><dd>{similarity.common}</dd></div></> : null}<div><dt>Покрытие ссылками</dt><dd>{rows.length ? formatPercent(sourceRows.length / rows.length) : '0%'}</dd></div></dl>
    {stats.mall.areaSource ? <p className="mall-area-source"><Badge tone={stats.mall.glaConfirmed ? 'success' : 'warning'}>{stats.mall.areaStatus ?? 'Статус площади н/д'}</Badge><a href={stats.mall.areaSource} target="_blank" rel="noopener noreferrer">Источник площади <ExternalLink size={14} /></a></p> : null}
    <h3>Топ-категории</h3><div className="mall-category-list">{topCategories.map(([category, count]) => <div key={category}><span>{category}</span><strong>{count}</strong></div>)}</div>
    <h3>Значения ниже медианы</h3>{belowMedian.length ? <div className="mall-category-list">{belowMedian.map((item) => <div key={item.category}><span>{item.category}</span><small>{item.value} против медианы {formatNumber.format(item.median)}</small></div>)}</div> : <p className="empty-state compact">В текущем срезе нет категорий ниже медианы peer group.</p>}
    <p className="method-note">Значение ниже медианы не является автоматической оценкой качества tenant mix.</p>
  </div></div>;
}
