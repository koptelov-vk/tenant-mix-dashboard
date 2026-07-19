import { lazy, Suspense } from 'react';
import { AlertCircle } from 'lucide-react';
import { useDashboardData } from './hooks/useDashboardData';
import { useAnalysisContext } from './hooks/useAnalysisContext';
import { useUrlState } from './hooks/useUrlState';
import { useDashboardStore } from './stores/dashboardStore';
import { AppHeader } from './components/layout/AppHeader';
import { GlobalFilters } from './components/layout/GlobalFilters';
import { Breadcrumbs } from './components/layout/Breadcrumbs';

const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const ComparabilityPage = lazy(() => import('./pages/ComparabilityPage'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'));
const BrandsPage = lazy(() => import('./pages/BrandsPage'));
const UpcomingPage = lazy(() => import('./pages/UpcomingPage'));
const DataQualityPage = lazy(() => import('./pages/DataQualityPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));

export function App() {
  useUrlState();
  const query = useDashboardData();
  if (query.isLoading) return <StateCard title="Загружаем tenant mix" description="Проверяем структуру production-данных и готовим текущий срез." />;
  if (query.isError || !query.data) return <StateCard title="Не удалось открыть дашборд" description={query.error instanceof Error ? query.error.message : 'Ошибка загрузки данных'} error />;
  return <Dashboard data={query.data} refreshing={query.isFetching} />;
}

function Dashboard({ data, refreshing }: { data: NonNullable<ReturnType<typeof useDashboardData>['data']>; refreshing: boolean }) {
  const activePage = useDashboardStore((state) => state.activePage);
  const context = useAnalysisContext(data);
  return <div className="app-shell"><a className="skip-link" href="#main-content">Перейти к содержимому</a><AppHeader data={data} /><GlobalFilters data={data} context={context} /><main id="main-content" tabIndex={-1}><div className="pdf-only-heading"><div><h1>Tenant Mix Analytics</h1><p>Фокусный объект: {context.focusMall.mall}</p></div><small>Срез данных: {data.meta.snapshotDate}<br />Объектов в группе сравнения: {context.peerMalls.length}</small></div><Breadcrumbs context={context} snapshot={data.meta.snapshotDate} /><Suspense fallback={<PageSkeleton />}>
    {activePage === 'overview' ? <OverviewPage context={context} loading={refreshing} /> : null}
    {activePage === 'comparability' ? <ComparabilityPage context={context} data={data} /> : null}
    {activePage === 'categories' ? <CategoriesPage context={context} /> : null}
    {activePage === 'brands' ? <BrandsPage context={context} data={data} /> : null}
    {activePage === 'upcoming' ? <UpcomingPage context={context} data={data} /> : null}
    {activePage === 'quality' ? <DataQualityPage data={data} /> : null}
    {activePage === 'history' ? <HistoryPage /> : null}
  </Suspense></main></div>;
}

function PageSkeleton() { return <div className="page-skeleton" aria-label="Загрузка раздела"><i /><i /><i /></div>; }
function StateCard({ title, description, error = false }: { title: string; description: string; error?: boolean }) { return <main className="state-page"><section className={error ? 'state-card error' : 'state-card'}>{error ? <AlertCircle /> : null}<h1>{title}</h1><p>{description}</p></section></main>; }
