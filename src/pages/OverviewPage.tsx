import type { AnalysisContext } from '../types/dashboard';
import { formatArea } from '../lib/utils';
import { Badge } from '../components/ui/Badge';
import { Card, CardHeader } from '../components/ui/Card';
import { KpiGrid } from '../components/dashboard/KpiGrid';
import { ExecutiveSummary } from '../components/dashboard/ExecutiveSummary';
import { TenantMixStackedBar } from '../components/charts/TenantMixStackedBar';
import { ComparableObjects } from '../components/dashboard/ComparableObjects';
import { PotentialBrands } from '../components/dashboard/PotentialBrands';

export default function OverviewPage({ context }: { context: AnalysisContext }) {
  return <>
    {!context.focusMatchesPeerCriteria ? <div className="alert warning">Фокусный объект не соответствует текущим критериям группы и добавлен отдельно для сравнения.</div> : null}
    <section className="focus-hero"><div><p className="eyebrow">Фокусный объект</p><h1>{context.focusMall.mall}</h1><p>{context.focusMall.city} · {context.focusMall.mallClass}</p></div><dl><div><dt>GLA</dt><dd>{context.focusMall.glaConfirmed ? formatArea(context.focusMall.gla) : 'н/д'}</dd></div><div><dt>GBA</dt><dd>{formatArea(context.focusMall.gba)}</dd></div><div><dt>Peer group</dt><dd>{context.peerMalls.length} объектов</dd></div></dl><Badge tone="success">Текущий фокус</Badge></section>
    <KpiGrid context={context} />
    <section className="overview-grid"><ExecutiveSummary context={context} /><Card><CardHeader eyebrow="Структура" title="Профиль tenant mix" /><TenantMixStackedBar context={context} compact /></Card><ComparableObjects context={context} /><PotentialBrands context={context} /></section>
  </>;
}
