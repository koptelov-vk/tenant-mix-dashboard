import { AlertTriangle, ChevronRight, Info, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useId, useRef, useState } from 'react';
import type { AnalysisContext, CategoryProfileStats } from '../../types/dashboard';
import { useDashboardStore } from '../../stores/dashboardStore';

const brandWord = (count: number) => count % 10 === 1 && count % 100 !== 11 ? 'бренд' : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20) ? 'бренда' : 'брендов';
const exclusiveWord = (count: number) => count % 10 === 1 && count % 100 !== 11 ? 'эксклюзивный' : 'эксклюзивных';

function tooltip(profile: CategoryProfileStats, context: AnalysisContext) {
  const exact = profile.exactPercent == null ? 'нет данных' : `${profile.exactPercent.toLocaleString('ru-RU', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;
  return `${profile.exclusiveCount} эксклюзивных брендов из ${profile.totalBrands} учитываемых брендов категории — ${exact}. Рассчитано относительно текущей выбранной группы из ${context.displayMalls.length} объектов. Фокусный объект исключён из множества сравнения. Включены только нормализованные действующие бренды. «Скоро открытие», закрытые, неизвестные и конфликтующие статусы не включены. Эксклюзивность не подтверждает коммерческую эффективность категории.`;
}

function qualityPosition(anchor: DOMRect) {
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const width = Math.min(380, viewportWidth - 24);
  const maxHeight = Math.min(360, viewportHeight - 24);
  const left = Math.max(12, Math.min(anchor.left, viewportWidth - width - 12));
  const below = anchor.bottom + 8;
  const top = below + maxHeight <= viewportHeight - 12
    ? below
    : Math.max(12, Math.min(anchor.top - maxHeight - 8, viewportHeight - maxHeight - 12));
  return { left, top, width, maxHeight };
}

function QualityDisclosure({ profile }: { profile: CategoryProfileStats }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const excludedCount = profile.excludedUnknownCount + profile.excludedConflictingCount;

  const close = (restoreFocus = false) => {
    setAnchor(null);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => {
    if (!anchor) return;
    requestAnimationFrame(() => popoverRef.current?.focus());
    const reposition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setAnchor(rect);
      else close();
    };
    const dismiss = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (triggerRef.current?.contains(event.target) || popoverRef.current?.contains(event.target)) return;
      close();
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      close(true);
    };
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', keyboard);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', keyboard);
    };
  }, [anchor]);

  return <>
    <button
      ref={triggerRef}
      type="button"
      className="category-profile-quality-trigger"
      aria-label={`Показать качество данных категории ${profile.category}`}
      aria-expanded={Boolean(anchor)}
      aria-controls={anchor ? popoverId : undefined}
      onClick={() => setAnchor((current) => current ? null : triggerRef.current?.getBoundingClientRect() ?? null)}
    >
      <AlertTriangle size={15} aria-hidden="true" />
      <span>Данные требуют проверки</span>
    </button>
    {anchor ? createPortal(
      <div
        id={popoverId}
        ref={popoverRef}
        className="category-profile-quality-popover"
        role="dialog"
        aria-modal="false"
        aria-label={`Качество данных категории ${profile.category}`}
        tabIndex={-1}
        style={qualityPosition(anchor)}
      >
        <div className="category-profile-quality-heading">
          <strong>Качество данных</strong>
          <button type="button" aria-label="Закрыть сведения о качестве данных" onClick={() => close(true)}><X size={18} aria-hidden="true" /></button>
        </div>
        <p><b>{excludedCount.toLocaleString('ru-RU')}</b> записей исключено из основного показателя.</p>
        <dl>
          <div><dt>Неизвестный статус</dt><dd>{profile.excludedUnknownCount.toLocaleString('ru-RU')}</dd></div>
          <div><dt>Конфликтующий статус</dt><dd>{profile.excludedConflictingCount.toLocaleString('ru-RU')}</dd></div>
          <div><dt>Ручная проверка</dt><dd>{profile.manualReviewCount.toLocaleString('ru-RU')}</dd></div>
        </dl>
        <p className="category-profile-quality-note">Неизвестные и конфликтующие записи не входят в основной active-only показатель. Ручная проверка — отдельный сигнал качества и сама по себе не меняет статус записи.</p>
      </div>,
      document.body,
    ) : null}
  </>;
}

export function CategoryProfile({ context, loading = false }: { context: AnalysisContext; loading?: boolean }) {
  const setCategories = useDashboardStore((state) => state.setCategories);
  const setActivePage = useDashboardStore((state) => state.setActivePage);

  if (loading) return <div className="category-profile-state" role="status">Пересчитываем профиль по категориям…</div>;
  if (!context.focusInSelectedGroup) return <div className="category-profile-state warning">Фокусный объект не входит в текущую группу.</div>;
  if (!context.peerMalls.length) return <div className="category-profile-state warning">Для расчёта эксклюзивности выберите минимум ещё один объект.</div>;
  if (!context.categoryProfiles.length) return <div className="category-profile-state">Нет данных, соответствующих выбранным объектам, категориям, статусам и дате.</div>;
  if (context.categoryProfiles.every((profile) => profile.sourceRowCount === 0)) return <div className="category-profile-state">Нет данных, соответствующих выбранным объектам, категориям, статусам и дате.</div>;
  if (context.categoryProfiles.every((profile) => profile.sourceRowCount === 0 || profile.allRowsExcludedByQuality)) {
    return <div className="category-profile-state warning" role="alert">Невозможно рассчитать показатель: статусы или классификация брендов требуют проверки.</div>;
  }

  const openCategory = (category: string) => {
    setCategories([category]);
    setActivePage('categories');
  };
  const partial = context.categoryProfiles.some((profile) => profile.qualityIssues.length > 0);

  return <div className="category-profile-list">
    <p className="category-profile-note"><Info size={16} aria-hidden="true" />Количество брендов и эксклюзивность характеризуют структуру tenant-mix относительно выбранной группы и не подтверждают коммерческую эффективность категории.</p>
    {partial ? <div className="category-profile-partial" role="status"><AlertTriangle size={16} aria-hidden="true" />Расчёт выполнен по доступным данным. Часть записей исключена или требует проверки.</div> : null}
    {context.categoryProfiles.map((profile) => {
      const hasQuality = profile.qualityIssues.length > 0;
      const mainValue = profile.allRowsExcludedByQuality
        ? 'Показатель не рассчитан · данные требуют проверки'
        : profile.displayPercent == null
          ? `${profile.exclusiveCount} ${exclusiveWord(profile.exclusiveCount)} · нет данных`
          : `${profile.exclusiveCount} ${exclusiveWord(profile.exclusiveCount)} · ${profile.displayPercent}% категории`;
      const tooltipId = `category-profile-tooltip-${profile.category.replace(/[^a-zа-яё0-9]+/gi, '-').toLowerCase()}`;
      return <div className={`category-profile-row${hasQuality ? ' has-quality' : ''}`} key={profile.category}>
        <button className="category-profile-open" type="button" onClick={() => openCategory(profile.category)} aria-label={`Открыть категорию ${profile.category}`} aria-describedby={tooltipId}>
          <span className="category-profile-copy">
            <strong>{profile.category}</strong>
            <span>{profile.totalBrands} {brandWord(profile.totalBrands)}</span>
            <b>{mainValue}</b>
            <span className="category-profile-meta">
              {profile.upcomingCount ? <em>+{profile.upcomingCount} скоро открытие</em> : null}
            </span>
          </span>
          <ChevronRight aria-hidden="true" />
        </button>
        {hasQuality ? <QualityDisclosure profile={profile} /> : null}
        <details className="category-profile-tooltip">
          <summary aria-label={`Пояснение расчёта для категории ${profile.category}`}><Info size={16} aria-hidden="true" /></summary>
          <div id={tooltipId} role="tooltip">{tooltip(profile, context)}</div>
        </details>
      </div>;
    })}
  </div>;
}
