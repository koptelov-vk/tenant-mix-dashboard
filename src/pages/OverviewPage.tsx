import type { AnalysisContext } from '../types/dashboard';
import { Card, CardHeader } from '../components/ui/Card';
import { KpiGrid } from '../components/dashboard/KpiGrid';
import { ExecutiveSummary } from '../components/dashboard/ExecutiveSummary';
import { TenantMixStackedBar } from '../components/charts/TenantMixStackedBar';
import { ComparableObjects } from '../components/dashboard/ComparableObjects';
import { PotentialBrands } from '../components/dashboard/PotentialBrands';

export default function OverviewPage({ context }: { context: AnalysisContext }) {
  return <>
    {!context.focusMatchesPeerCriteria ? <div className="alert warning">Фокусный объект не соответствует текущим критериям группы и добавлен отдельно для сравнения.</div> : null}
    <KpiGrid context={context} />
    <section className="overview-grid"><span className="pdf-page-break" data-pdf-page-break-before aria-hidden="true" /><ExecutiveSummary context={context} /><Card><CardHeader eyebrow="Структура" title="Профиль tenant mix" /><TenantMixStackedBar context={context} compact /></Card><span className="pdf-page-break" data-pdf-page-break-before aria-hidden="true" /><ComparableObjects context={context} /><PotentialBrands context={context} /></section>
  </>;
}
