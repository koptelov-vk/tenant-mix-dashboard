import { useState } from 'react';
import type { AnalysisContext } from '../types/dashboard';
import { formatArea, formatNumber, formatPercent } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { TenantMixStackedBar } from '../components/charts/TenantMixStackedBar';

export default function ComparabilityPage({ context }: { context: AnalysisContext }) {
  const [mode, setMode] = useState<'table' | 'cards'>('table');
  const similarity = new Map(context.similarities.map((item) => [item.mall.mall, item]));
  return <><div className="page-heading"><div><h1>Сопоставимость ТЦ</h1><p>Сравнение масштаба, состава брендов и структуры tenant mix текущего среза.</p></div><div className="segmented"><Button variant={mode === 'table' ? 'default' : 'outline'} onClick={() => setMode('table')}>Таблица</Button><Button variant={mode === 'cards' ? 'default' : 'outline'} onClick={() => setMode('cards')}>Карточки</Button></div></div>
    <Card>{mode === 'table' ? <div className="table-scroll"><table className="data-table"><thead><tr><th>ТЦ</th><th>Город</th><th>Класс</th><th>GLA</th><th>GBA</th><th>Бренды</th><th>На 10 000 м² GLA</th><th>Жаккар</th><th>Общие бренды</th></tr></thead><tbody>{context.mallStats.map((item) => { const sim = similarity.get(item.mall.mall); return <tr key={item.mall.mall} className={item.mall.mall === context.focusMall.mall ? 'focus-row' : ''}><th>{item.mall.mall}{item.mall.mall === context.focusMall.mall ? <small>Фокус</small> : null}</th><td>{item.mall.city}</td><td>{item.mall.mallClass}</td><td>{item.mall.glaConfirmed ? formatArea(item.mall.gla) : 'н/д'}</td><td>{formatArea(item.mall.gba)}</td><td>{item.brandCount}</td><td>{item.density10kGla == null ? 'н/д' : formatNumber.format(item.density10kGla)}</td><td>{sim ? formatPercent(sim.jaccard) : '—'}</td><td>{sim?.common ?? '—'}</td></tr>; })}</tbody></table></div> : <div className="mall-card-grid">{context.mallStats.map((item) => { const sim = similarity.get(item.mall.mall); return <article key={item.mall.mall} className={item.mall.mall === context.focusMall.mall ? 'mall-card focus' : 'mall-card'}><strong>{item.mall.mall}</strong><span>{item.mall.city} · {item.mall.mallClass}</span><dl><div><dt>Бренды</dt><dd>{item.brandCount}</dd></div><div><dt>GLA</dt><dd>{item.mall.glaConfirmed ? formatArea(item.mall.gla) : 'н/д'}</dd></div><div><dt>Жаккар</dt><dd>{sim ? formatPercent(sim.jaccard) : '—'}</dd></div></dl></article>; })}</div>}</Card>
    <Card><CardHeader eyebrow="Small multiples" title="Структура категорий объектов" /><TenantMixStackedBar context={context} /></Card></>;
}
