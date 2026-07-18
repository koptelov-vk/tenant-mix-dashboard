import type { AnalysisContext } from '../types/dashboard';
import { Card, CardHeader } from '../components/ui/Card';
import { KpiGrid } from '../components/dashboard/KpiGrid';
import { ExecutiveSummary } from '../components/dashboard/ExecutiveSummary';
import { ComparableObjects } from '../components/dashboard/ComparableObjects';
import { PotentialBrands } from '../components/dashboard/PotentialBrands';
import { CategoryProfile } from '../components/dashboard/CategoryProfile';

export default function OverviewPage({ context, loading = false }: { context: AnalysisContext; loading?: boolean }) {
  return <>
    {!context.focusMatchesPeerCriteria ? <div className="alert warning">Фокусный объект не соответствует текущим критериям группы и добавлен отдельно для сравнения.</div> : null}
    <KpiGrid context={context} />
    <section className="overview-grid"><span className="pdf-page-break" data-pdf-page-break-before aria-hidden="true" /><ExecutiveSummary context={context} /><Card><CardHeader title="Профиль по категориям" /><CategoryProfile context={context} loading={loading} /></Card><span className="pdf-page-break" data-pdf-page-break-before aria-hidden="true" /><ComparableObjects context={context} /><PotentialBrands context={context} /></section>
  </>;
}
