import { AlertTriangle, ChevronRight, Info } from 'lucide-react';
import type { AnalysisContext, CategoryProfileStats } from '../../types/dashboard';
import { useDashboardStore } from '../../stores/dashboardStore';

const brandWord = (count: number) => count % 10 === 1 && count % 100 !== 11 ? 'бренд' : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20) ? 'бренда' : 'брендов';
const exclusiveWord = (count: number) => count % 10 === 1 && count % 100 !== 11 ? 'эксклюзивный' : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20) ? 'эксклюзивных' : 'эксклюзивных';

function tooltip(profile: CategoryProfileStats, context: AnalysisContext) {
  const exact = profile.exactPercent == null ? 'нет данных' : `${profile.exactPercent.toLocaleString('ru-RU', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;
  return `${profile.exclusiveCount} эксклюзивных брендов из ${profile.totalBrands} учитываемых брендов категории — ${exact}. Рассчитано относительно текущей выбранной группы из ${context.displayMalls.length} объектов. Фокусный объект исключён из множества сравнения. Включены только нормализованные действующие бренды. «Скоро открытие», закрытые, неизвестные и конфликтующие статусы не включены. Эксклюзивность не подтверждает коммерческую эффективность категории.`;
}

export function CategoryProfile({ context, loading = false }: { context: AnalysisContext; loading?: boolean }) {
  const setCategories = useDashboardStore((state) => state.setCategories);
  const setActivePage = useDashboardStore((state) => state.setActivePage);

  if (loading) return <div className="category-profile-state" role="status">Пересчитываем профиль по категориям…</div>;
  if (!context.focusInSelectedGroup) return <div className="category-profile-state warning">Фокусный объект не входит в текущую группу.</div>;
  if (!context.peerMalls.length) return <div className="category-profile-state warning">Для расчёта эксклюзивности выберите минимум ещё один объект.</div>;
  if (!context.categoryProfiles.length) return <div className="category-profile-state">Нет данных, соответствующих выбранным объектам, категориям, статусам и дате.</div>;

  const openCategory = (category: string) => {
    setCategories([category]);
    setActivePage('categories');
  };

  return <div className="category-profile-list">
    <p className="category-profile-note"><Info size={16} />Количество брендов и эксклюзивность характеризуют структуру tenant-mix относительно выбранной группы и не подтверждают коммерческую эффективность категории.</p>
    {context.categoryProfiles.map((profile) => {
      const qualityLabel = profile.qualityIssues.length ? `Данные требуют проверки: ${profile.qualityIssues.join('; ')}` : '';
      const mainValue = profile.displayPercent == null
        ? `${profile.exclusiveCount} ${exclusiveWord(profile.exclusiveCount)} · нет данных`
        : `${profile.exclusiveCount} ${exclusiveWord(profile.exclusiveCount)} · ${profile.displayPercent}% категории`;
      return <button className="category-profile-row" key={profile.category} type="button" onClick={() => openCategory(profile.category)} aria-label={`Открыть категорию ${profile.category}`}>
        <span className="category-profile-copy">
          <strong>{profile.category}</strong>
          <span>{profile.totalBrands} {brandWord(profile.totalBrands)}</span>
          <b title={tooltip(profile, context)}>{mainValue}</b>
          <span className="category-profile-meta">
            {profile.upcomingCount ? <em>+{profile.upcomingCount} скоро открытие</em> : null}
            {qualityLabel ? <em className="quality-warning" title={qualityLabel} aria-label={qualityLabel}><AlertTriangle size={15} />Данные требуют проверки</em> : null}
          </span>
        </span>
        <ChevronRight aria-hidden="true" />
      </button>;
    })}
  </div>;
}
