import { BarChart3, Building2, RefreshCw, Search, Sparkles } from 'lucide-react';
import { createAnalysisContext, median } from './lib/analysis';
import { useDashboardData } from './hooks/useDashboardData';
import { useDashboardStore } from './stores/dashboardStore';

const fmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

export function App() {
  const query = useDashboardData();
  const { focusMall, category, setFocusMall, setCategory } = useDashboardStore();

  if (query.isLoading) return <StateCard title="Загружаем tenant mix" description="Проверяем структуру и готовим аналитический срез." />;
  if (query.isError || !query.data) {
    return <StateCard title="Не удалось открыть дашборд" description={query.error instanceof Error ? query.error.message : 'Ошибка данных'} error />;
  }

  const ctx = createAnalysisContext(query.data, { focusMall, category });
  const focusStats = ctx.mallStats.find((item) => item.mall.mall === ctx.focusMall.mall)!;
  const peerCounts = ctx.mallStats.filter((item) => item.mall.mall !== ctx.focusMall.mall).map((item) => item.brandCount);
  const peerMedian = median(peerCounts);
  const rank = [...ctx.mallStats].sort((a, b) => b.brandCount - a.brandCount).findIndex((item) => item.mall.mall === ctx.focusMall.mall) + 1;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand"><span className="brand-mark"><Building2 size={20} /></span><div><strong>Tenant Mix Analytics</strong><small>React migration preview</small></div></div>
        <nav aria-label="Основная навигация">
          {['Обзор', 'Сопоставимость', 'Категории', 'Бренды', 'Сценарии'].map((item, index) => <button key={item} className={index === 0 ? 'nav-active' : ''}>{item}</button>)}
        </nav>
        <button className="icon-button" onClick={() => query.refetch()} aria-label="Обновить данные"><RefreshCw size={18} /></button>
      </header>

      <section className="filter-bar" aria-label="Параметры анализа">
        <label><span>Фокусный ТЦ</span><select value={ctx.focusMall.mall} onChange={(event) => setFocusMall(event.target.value)}>{query.data.mallSummary.map((mall) => <option key={mall.mall}>{mall.mall}</option>)}</select></label>
        <label><span>Категория</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>Все категории</option>{query.data.categoryMatrix.categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <div className="slice-note"><Search size={16} /> {ctx.displayMalls.length} ТЦ · {fmt.format(ctx.filteredRows.length)} строк · срез {query.data.meta.snapshotDate}</div>
      </section>

      <main>
        <section className="hero-card">
          <div><p className="eyebrow">Фокусный объект</p><h1>{ctx.focusMall.mall}</h1><p>{ctx.focusMall.city} · {ctx.focusMall.mallClass} · GLA {ctx.focusMall.gla ? `${fmt.format(ctx.focusMall.gla)} м²` : 'н/д'}</p></div>
          <span className="status">Единый AnalysisContext</span>
        </section>

        <section className="kpi-grid" aria-label="Ключевые показатели">
          <Kpi label="Бренды текущего среза" value={fmt.format(focusStats.brandCount)} note={peerMedian == null ? 'Нет медианы peer group' : `${focusStats.brandCount >= peerMedian ? '+' : ''}${fmt.format(focusStats.brandCount - peerMedian)} к медиане`} />
          <Kpi label="Позиция в группе" value={`${rank}-е`} note={`из ${ctx.mallStats.length} объектов`} />
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
      </main>
    </div>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return <article className="kpi"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function StateCard({ title, description, error = false }: { title: string; description: string; error?: boolean }) {
  return <main className="state-page"><section className={error ? 'state-card error' : 'state-card'}><h1>{title}</h1><p>{description}</p></section></main>;
}
