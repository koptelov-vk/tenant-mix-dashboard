import { BarChart3, Building2, Copy, RefreshCw, Search, Sparkles } from 'lucide-react';
import { useDashboardData } from './hooks/useDashboardData';
import { useUrlState } from './hooks/useUrlState';
import { createAnalysisContext, median } from './lib/analysis';
import { useDashboardStore, type DashboardPage } from './stores/dashboardStore';

const fmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const pages: Array<{ id: DashboardPage; label: string }> = [
  { id: 'overview', label: 'Обзор' },
  { id: 'comparability', label: 'Сопоставимость' },
  { id: 'categories', label: 'Категории' },
  { id: 'brands', label: 'Бренды' },
  { id: 'scenarios', label: 'Сценарии' },
];

export function App() {
  useUrlState();
  const query = useDashboardData();
  const {
    focusMall,
    category,
    activePage,
    peerGroup,
    setFocusMall,
    setCategory,
    setActivePage,
    setPeerGroup,
  } = useDashboardStore();

  if (query.isLoading) return <StateCard title="Загружаем tenant mix" description="Проверяем структуру и готовим аналитический срез." />;
  if (query.isError || !query.data) {
    return <StateCard title="Не удалось открыть дашборд" description={query.error instanceof Error ? query.error.message : 'Ошибка данных'} error />;
  }

  const selectedFocus = query.data.mallSummary.find((mall) => mall.mall === focusMall) ?? query.data.mallSummary[0];
  if (!selectedFocus) {
    return <StateCard title="Нет доступных объектов" description="Сводка торговых центров пуста." error />;
  }
  const peerNames = query.data.mallSummary
    .filter((mall) => mall.mall !== selectedFocus.mall && (peerGroup === 'all' || mall.mallClass === selectedFocus.mallClass))
    .map((mall) => mall.mall);
  const ctx = createAnalysisContext(query.data, { focusMall: selectedFocus.mall, category, peerMalls: peerNames });
  const focusStats = ctx.mallStats.find((item) => item.mall.mall === ctx.focusMall.mall)!;
  const peerStats = ctx.mallStats.filter((item) => item.mall.mall !== ctx.focusMall.mall);
  const peerMedian = median(peerStats.map((item) => item.brandCount));
  const rank = [focusStats, ...peerStats]
    .sort((a, b) => b.brandCount - a.brandCount)
    .findIndex((item) => item.mall.mall === ctx.focusMall.mall) + 1;

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand"><span className="brand-mark"><Building2 size={20} /></span><div><strong>Tenant Mix Analytics</strong><small>React migration preview</small></div></div>
        <nav aria-label="Основная навигация">
          {pages.map((item) => <button key={item.id} className={activePage === item.id ? 'nav-active' : ''} onClick={() => setActivePage(item.id)}>{item.label}</button>)}
        </nav>
        <div className="header-actions">
          <button className="icon-button" onClick={copyLink} aria-label="Скопировать ссылку"><Copy size={18} /></button>
          <button className="icon-button" onClick={() => query.refetch()} aria-label="Обновить данные"><RefreshCw size={18} /></button>
        </div>
      </header>

      <section className="filter-bar" aria-label="Параметры анализа">
        <label><span>Фокусный ТЦ</span><select value={ctx.focusMall.mall} onChange={(event) => setFocusMall(event.target.value)}>{query.data.mallSummary.map((mall) => <option key={mall.mall}>{mall.mall}</option>)}</select></label>
        <label><span>Группа сравнения</span><select value={peerGroup} onChange={(event) => setPeerGroup(event.target.value as 'same-class' | 'all')}><option value="same-class">Тот же класс</option><option value="all">Все объекты</option></select></label>
        <label><span>Категория</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>Все категории</option>{query.data.categoryMatrix.categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <div className="slice-note"><Search size={16} /> {ctx.peerMalls.length} объектов в peer group · {fmt.format(ctx.filteredRows.length)} строк · срез {query.data.meta.snapshotDate}</div>
      </section>

      <main>
        {activePage === 'overview' ? (
          <Overview ctx={ctx} focusStats={focusStats} peerMedian={peerMedian} rank={rank} category={category} />
        ) : (
          <MigrationPlaceholder page={pages.find((item) => item.id === activePage)?.label ?? activePage} peerCount={ctx.peerMalls.length} />
        )}
      </main>
    </div>
  );
}

function Overview({ ctx, focusStats, peerMedian, rank, category }: {
  ctx: ReturnType<typeof createAnalysisContext>;
  focusStats: ReturnType<typeof createAnalysisContext>['mallStats'][number];
  peerMedian: number | null;
  rank: number;
  category: string;
}) {
  return <>
    <section className="hero-card">
      <div><p className="eyebrow">Фокусный объект</p><h1>{ctx.focusMall.mall}</h1><p>{ctx.focusMall.city} · {ctx.focusMall.mallClass} · GLA {ctx.focusMall.gla ? `${fmt.format(ctx.focusMall.gla)} м²` : 'н/д'}</p></div>
      <span className="status">Единый AnalysisContext</span>
    </section>

    <section className="kpi-grid" aria-label="Ключевые показатели">
      <Kpi label="Бренды текущего среза" value={fmt.format(focusStats.brandCount)} note={peerMedian == null ? 'Нет медианы peer group' : `${focusStats.brandCount >= peerMedian ? '+' : ''}${fmt.format(focusStats.brandCount - peerMedian)} к медиане`} />
      <Kpi label="Позиция в группе" value={`${rank}-е`} note={`из ${ctx.displayMalls.length} объектов`} />
      <Kpi label="Плотность брендов" value={focusStats.density10kGla == null ? 'н/д' : fmt.format(focusStats.density10kGla)} note="на 10 000 м² подтверждённой GLA" />
      <Kpi label="Категории в срезе" value={fmt.format(Object.keys(focusStats.categoryCounts).length)} note={category} />
    </section>

    <section className="content-grid">
      <article className="panel">
        <div className="panel-title"><div><p className="eyebrow">Ключевые выводы</p><h2>Управленческая выжимка</h2></div><Sparkles size={20} /></div>
        <ol className="insights">
          <li><b>{ctx.focusMall.mall}</b> занимает {rank}-е место по числу брендов в текущем срезе.</li>
          <li>{peerMedian == null ? 'Peer group не сформирована.' : `Медиана peer group — ${fmt.format(peerMedian)} брендов.`}</li>
          <li>{focusStats.density10kGla == null ? 'Плотность не рассчитана: нет подтверждённой GLA.' : `Плотность — ${fmt.format(focusStats.density10kGla)} бренда на 10 000 м² GLA.`}</li>
        </ol>
      </article>

      <article className="panel">
        <div className="panel-title"><div><p className="eyebrow">Категорийный профиль</p><h2>{category}</h2></div><BarChart3 size={20} /></div>
        <div className="category-list">{Object.entries(focusStats.categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => <div key={name}><span>{name}</span><div className="bar"><i style={{ width: `${Math.min(100, value / Math.max(1, focusStats.brandCount) * 100)}%` }} /></div><b>{value}</b></div>)}</div>
      </article>
    </section>
  </>;
}

function MigrationPlaceholder({ page, peerCount }: { page: string; peerCount: number }) {
  return <section className="hero-card"><div><p className="eyebrow">Следующий этап миграции</p><h1>{page}</h1><p>Раздел подключён к навигации и URL-state. Детальные компоненты будут перенесены после подтверждения расчётного паритета.</p></div><span className="status">Peer group: {peerCount}</span></section>;
}

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return <article className="kpi"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function StateCard({ title, description, error = false }: { title: string; description: string; error?: boolean }) {
  return <main className="state-page"><section className={error ? 'state-card error' : 'state-card'}><h1>{title}</h1><p>{description}</p></section></main>;
}
