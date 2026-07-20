import { AlertTriangle, ChevronRight, Info, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import type { AnalysisContext, CategoryProfileStats } from '../../types/dashboard';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useControlledOverlay } from '../ui/OverlayController';
import { Tooltip } from '../ui/Tooltip';

const brandWord = (count: number) => count % 10 === 1 && count % 100 !== 11 ? 'бренд' : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20) ? 'бренда' : 'брендов';
const exclusiveWord = (count: number) => count % 10 === 1 && count % 100 !== 11 ? 'эксклюзивный' : 'эксклюзивных';

function tooltip(profile: CategoryProfileStats, context: AnalysisContext) {
  const exact = profile.exactPercent == null ? 'нет данных' : `${profile.exactPercent.toLocaleString('ru-RU', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;
  return `${profile.exclusiveCount} эксклюзивных брендов из ${profile.totalBrands} учитываемых брендов категории — ${exact}. Рассчитано относительно текущей выбранной группы из ${context.displayMalls.length} объектов. Фокусный объект исключён из множества сравнения. Включены только нормализованные действующие бренды. «Скоро открытие», закрытые, неизвестные и конфликтующие статусы не включены. Эксклюзивность не подтверждает коммерческую эффективность категории.`;
}

function qualityPosition(anchor: DOMRect) {
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const width = Math.min(400, viewportWidth - 24);
  const maxHeight = Math.min(420, viewportHeight - 24);
  const left = Math.max(12, Math.min(anchor.left, viewportWidth - width - 12));
  const below = anchor.bottom + 8;
  const top = below + maxHeight <= viewportHeight - 12
    ? below
    : Math.max(12, Math.min(anchor.top - maxHeight - 8, viewportHeight - maxHeight - 12));
  return { left, top, width, maxHeight };
}

function reviewSignalText(count: number) {
  return `${count.toLocaleString('ru-RU')} действующих записей требуют дополнительной проверки, но включены в расчёт`;
}

function QualityDisclosure({ profile }: { profile: CategoryProfileStats }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const excludedCount = profile.excludedUnknownCount + profile.excludedConflictingCount;
  const hasExcluded = excludedCount > 0;
  const hasIncludedReview = profile.manualReviewCount > 0;

  const overlay = useControlledOverlay({
    open: Boolean(anchor),
    setOpen: (next) => setAnchor(next ? triggerRef.current?.getBoundingClientRect() ?? null : null),
    triggerRef,
    contentRef: popoverRef,
  });

  useEffect(() => {
    if (!anchor) return;
    requestAnimationFrame(() => popoverRef.current?.focus());
    const reposition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setAnchor(rect);
      else setAnchor(null);
    };
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    window.visualViewport?.addEventListener('resize', reposition);
    window.visualViewport?.addEventListener('scroll', reposition);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      window.visualViewport?.removeEventListener('resize', reposition);
      window.visualViewport?.removeEventListener('scroll', reposition);
    };
  }, [anchor]);

  return <div className="category-profile-quality-signals">
    <button
      ref={triggerRef}
      type="button"
      data-overlay-trigger
      className={`category-profile-quality-trigger ${hasExcluded ? 'is-limited' : 'is-review-only'}`}
      aria-label={`Показать качество данных категории ${profile.category}`}
      aria-expanded={Boolean(anchor)}
      aria-controls={overlay.id}
      onClick={overlay.toggle}
    >
      {hasExcluded ? <AlertTriangle size={15} aria-hidden="true" /> : <Info size={15} aria-hidden="true" />}
      <span>{hasExcluded ? 'Расчёт ограничен' : reviewSignalText(profile.manualReviewCount)}</span>
    </button>
    {hasExcluded && hasIncludedReview ? <span className="category-profile-review-signal" role="status">{reviewSignalText(profile.manualReviewCount)}</span> : null}
    {anchor ? createPortal(
      <div
        id={overlay.id}
        ref={popoverRef}
        data-pdf-exclude
        className="overlay-portal-layer category-profile-quality-popover"
        role="dialog"
        aria-modal="false"
        aria-label={`Качество данных категории ${profile.category}`}
        tabIndex={-1}
        style={qualityPosition(anchor)}
      >
        <div className="category-profile-quality-heading">
          <strong>Качество расчёта</strong>
          <button type="button" aria-label="Закрыть сведения о качестве данных" onClick={() => overlay.close(true)}><X size={18} aria-hidden="true" /></button>
        </div>
        {hasExcluded ? <section className="category-profile-quality-section is-excluded">
          <h3>Исключено из расчёта</h3>
          <p><b>{excludedCount.toLocaleString('ru-RU')}</b> записей не входят в основной active-only показатель.</p>
          <dl>
            {profile.excludedUnknownCount > 0 ? <div><dt>Неизвестный статус</dt><dd>{profile.excludedUnknownCount.toLocaleString('ru-RU')}</dd></div> : null}
            {profile.excludedConflictingCount > 0 ? <div><dt>Конфликтующий статус</dt><dd>{profile.excludedConflictingCount.toLocaleString('ru-RU')}</dd></div> : null}
          </dl>
          <p className="category-profile-quality-note">Эти записи исключены и ограничивают полноту рассчитанного показателя.</p>
        </section> : null}
        {hasIncludedReview ? <section className="category-profile-quality-section is-included-review">
          <h3>Включено, но требует проверки</h3>
          <p><b>{profile.manualReviewCount.toLocaleString('ru-RU')}</b> действующих записей требуют дополнительной проверки, но включены в расчёт.</p>
          <p className="category-profile-quality-note">Ручная проверка не меняет active-статус и сама по себе не ограничивает расчёт.</p>
        </section> : null}
      </div>,
      document.body,
    ) : null}
  </div>;
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
  const partial = context.categoryProfiles.some((profile) => profile.excludedUnknownCount + profile.excludedConflictingCount > 0);

  return <div className="category-profile-list">
    <p className="category-profile-note"><Info size={16} aria-hidden="true" />Количество брендов и эксклюзивность характеризуют структуру tenant-mix относительно выбранной группы и не подтверждают коммерческую эффективность категории.</p>
    {partial ? <div className="category-profile-partial" role="status"><AlertTriangle size={16} aria-hidden="true" />Расчёт выполнен по доступным данным. Часть записей исключена.</div> : null}
    {context.categoryProfiles.map((profile) => {
      const hasExcluded = profile.excludedUnknownCount + profile.excludedConflictingCount > 0;
      const hasIncludedReview = profile.manualReviewCount > 0;
      const hasQualitySignal = hasExcluded || hasIncludedReview;
      const mainValue = profile.allRowsExcludedByQuality
        ? 'Показатель не рассчитан · данные требуют проверки'
        : profile.displayPercent == null
          ? `${profile.exclusiveCount} ${exclusiveWord(profile.exclusiveCount)} · нет данных`
          : `${profile.exclusiveCount} ${exclusiveWord(profile.exclusiveCount)} · ${profile.displayPercent}% категории`;
      return <div className={`category-profile-row${hasQualitySignal ? ' has-quality-signal' : ''}${hasExcluded && hasIncludedReview ? ' has-mixed-quality' : ''}`} key={profile.category}>
        <button className="category-profile-open" type="button" onClick={() => openCategory(profile.category)} aria-label={`Открыть категорию ${profile.category}`}>
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
        {hasQualitySignal ? <QualityDisclosure profile={profile} /> : null}
        <Tooltip className="category-profile-tooltip" accessibleLabel={`Пояснение расчёта для категории ${profile.category}`} label={tooltip(profile, context)} />
      </div>;
    })}
  </div>;
}
