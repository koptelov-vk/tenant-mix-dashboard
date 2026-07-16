import type { AnalysisContext } from '../../types/dashboard';

const palette = ['#047857', '#2563eb', '#7c3aed', '#ea580c', '#0891b2', '#be123c', '#4f46e5', '#65a30d', '#a16207', '#475569'];

export function TenantMixStackedBar({ context, compact = false }: { context: AnalysisContext; compact?: boolean }) {
  const rows = compact ? context.mallStats.slice(0, 1) : context.mallStats;
  const visibleCategories = context.categories.filter((category) => rows.some((row) => (row.categoryCounts[category] ?? 0) > 0));
  return <div className="stacked-chart" role="img" aria-label="Структура tenant mix по категориям">{rows.map((row) => <div className="stacked-row" key={row.mall.mall}><span>{row.mall.mall}</span><div className="stacked-track">{visibleCategories.map((category, index) => { const count = row.categoryCounts[category] ?? 0; const share = row.brandCount ? count / row.brandCount * 100 : 0; return share > 0 ? <i key={category} style={{ width: `${share}%`, background: palette[index % palette.length] }} title={`${category}: ${count} (${share.toFixed(1)}%)`} /> : null; })}</div><b>{row.brandCount}</b></div>)}<div className="chart-legend">{visibleCategories.slice(0, compact ? 6 : 10).map((category, index) => <span key={category}><i style={{ background: palette[index % palette.length] }} />{category}</span>)}</div></div>;
}
