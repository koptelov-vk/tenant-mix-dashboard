import { AlertTriangle, ChevronDown, ChevronRight, ChevronUp, Info, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { AnalysisContext, CategoryBenchmarkPayload, CategoryProfileStats } from '../../types/dashboard';
import { buildCategoryBenchmarkExportManifest, sortCategoryBenchmarkPayloads } from '../../lib/analysis';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useControlledOverlay } from '../ui/OverlayController';
import { Tooltip } from '../ui/Tooltip';

const COLLAPSED_ROW_COUNT = 4;

/** Short visible-UI state labels (compact badge/inline text) — human wording, never the raw enum token. */
const stateText: Record<CategoryBenchmarkPayload['state'], string> = {
  ok: 'рассчитано',
  no_peers: 'нет объектов сравнения',
  no_data: 'нет данных',
  partial_quality: 'расчёт ограничен',
  quality_excluded: 'показатель не рассчитан',
  conflicting: 'конфликтующие данные',
};

/**
 * Full sentence per accessible-state, used only in the accessible name (never the raw
 * `partial_quality`/`quality_excluded`/etc. enum token, per PR #171 Tier 3 accessibility finding).
 */
const dataQualityStateSentence: Record<CategoryBenchmarkPayload['state'], string> = {
  ok: 'Данные подтверждены',
  no_peers: 'Нет объектов сравнения',
  no_data: 'Нет данных',
  partial_quality: 'Расчёт ограничен по качеству данных',
  quality_excluded: 'Показатель исключён из расчёта по качеству данных',
  conflicting: 'Обнаружены конфликтующие данные',
};

function formatCount(value: number) {
  return value.toLocaleString('ru-RU');
}

function formatShare(value: number) {
  return `${(value * 100).toLocaleString('ru-RU', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;
}

function pluralize(value: number, one: string, few: string, many: string): string {
  const abs = Math.abs(Math.round(value));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

const brandWord = (count: number) => pluralize(count, 'бренд', 'бренда', 'брендов');
const exclusiveWord = (count: number) => pluralize(count, 'эксклюзивный', 'эксклюзивных', 'эксклюзивных');
const pointWord = (count: number) => pluralize(count, 'процентный пункт', 'процентных пункта', 'процентных пунктов');
const peerWord = (count: number) => pluralize(count, 'объект', 'объекта', 'объектов');

function comparisonWording(deviation: number | null): string | null {
  if (deviation == null) return null;
  if (deviation > 0) return 'выше медианы группы';
  if (deviation < 0) return 'ниже медианы группы';
  return 'на уровне медианы группы';
}

function deviationText(benchmark: CategoryBenchmarkPayload, mode: 'count' | 'share'): string {
  const stats = mode === 'count' ? benchmark.count : benchmark.share;
  if (stats.deviation == null) return `Отклонение недоступно (${stateText[benchmark.state]})`;
  const rounded = mode === 'count' ? stats.deviation : Math.round(stats.deviation * 10) / 10;
  const unit = mode === 'count' ? brandWord(rounded) : 'п.п.';
  const sign = rounded > 0 ? '+' : '';
  const direction = rounded > 0 ? '▲ выше' : rounded < 0 ? '▼ ниже' : '● на уровне';
  return `${direction} медианы группы на ${sign}${rounded.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} ${unit}`;
}

/**
 * Full accessible name for the benchmark bar. Every value carries a human-readable Russian
 * unit/state word — the raw canonical-payload tokens `brands`, `percentage_points`,
 * `partial_quality`, `conflicting`, `quality_excluded`, etc. are never spoken to the user
 * (PR #171 Tier 3 accessibility finding).
 */
function accessibleBenchmarkText(benchmark: CategoryBenchmarkPayload, mode: 'count' | 'share'): string {
  const focusValue = mode === 'count' ? benchmark.count.focusValue : benchmark.share.focusShareExact;
  const peerMedian = mode === 'count' ? benchmark.count.peerMedian : benchmark.share.peerMedianShareExact;
  const deviation = mode === 'count' ? benchmark.count.deviation : benchmark.share.deviation;

  const focusSentence = focusValue == null
    ? 'В фокусном объекте нет данных.'
    : mode === 'count'
      ? `В фокусном объекте ${formatCount(focusValue)} ${brandWord(focusValue)}.`
      : `В фокусном объекте ${formatShare(focusValue)}.`;

  const peerSentence = peerMedian == null
    ? 'Медиана группы недоступна.'
    : mode === 'count'
      ? `Медиана группы ${formatCount(peerMedian)} ${brandWord(peerMedian)}.`
      : `Медиана группы ${formatShare(peerMedian)}.`;

  const comparison = comparisonWording(deviation);
  let deviationSentence: string;
  if (deviation == null || comparison == null) {
    deviationSentence = 'Отклонение недоступно.';
  } else if (deviation === 0) {
    deviationSentence = `Отклонение отсутствует. Фокусный объект ${comparison}.`;
  } else {
    const magnitude = Math.abs(mode === 'count' ? deviation : Math.round(deviation * 10) / 10);
    const sign = deviation > 0 ? 'плюс' : 'минус';
    const unitWord = mode === 'count' ? brandWord(magnitude) : pointWord(magnitude);
    deviationSentence = `Отклонение ${sign} ${magnitude.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} ${unitWord}. Фокусный объект ${comparison}.`;
  }

  const stateSentence = `${dataQualityStateSentence[benchmark.state]}.`;
  const limitationSentence = benchmark.quality.limitations.length ? ` ${benchmark.quality.limitations.join(' ')}` : '';
  const peerContextSentence = benchmark.peerCount > 0 ? ` Группа сравнения: ${benchmark.peerCount} ${peerWord(benchmark.peerCount)}.` : '';

  return `Категория «${benchmark.categoryId}». ${focusSentence} ${peerSentence} ${deviationSentence} ${stateSentence}${limitationSentence}${peerContextSentence}`;
}

function CategoryBenchmarkBar({ benchmark, mode }: { benchmark: CategoryBenchmarkPayload; mode: 'count' | 'share' }) {
  const stats = mode === 'count' ? benchmark.count : benchmark.share;
  const focusValue = mode === 'count' ? benchmark.count.focusValue : (benchmark.share.focusShareExact == null ? null : benchmark.share.focusShareExact * 100);
  const peerMedian = mode === 'count' ? benchmark.count.peerMedian : (benchmark.share.peerMedianShareExact == null ? null : benchmark.share.peerMedianShareExact * 100);
  const peerScaleValues = mode === 'count' ? benchmark.count.peerValues : benchmark.share.peerSharesExact.map((value) => value * 100);
  const scaleMax = Math.max(1, focusValue ?? 0, peerMedian ?? 0, ...peerScaleValues);
  const focusPercent = focusValue == null ? 0 : Math.min(100, (focusValue / scaleMax) * 100);
  const medianPercent = peerMedian == null ? null : Math.min(100, (peerMedian / scaleMax) * 100);

  return <div className="category-benchmark-bar" role="img" aria-label={accessibleBenchmarkText(benchmark, mode)}>
    <div className="category-benchmark-track">
      <div className="category-benchmark-focus" style={{ width: `${focusPercent}%` }} />
      {medianPercent != null ? <div className="category-benchmark-median-marker" style={{ left: `${medianPercent}%` }} aria-hidden="true" /> : null}
    </div>
    <span className={`category-benchmark-deviation${stats.deviation != null && stats.deviation > 0 ? ' is-above' : stats.deviation != null && stats.deviation < 0 ? ' is-below' : ''}`}>
      {deviationText(benchmark, mode)}
    </span>
  </div>;
}

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

export function QualityDisclosure({ profile }: { profile: CategoryProfileStats }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const open = Boolean(anchor);
  const excludedCount = profile.excludedUnknownCount + profile.excludedConflictingCount;
  const hasExcluded = excludedCount > 0;
  const hasIncludedReview = profile.manualReviewCount > 0;

  const overlay = useControlledOverlay({
    open,
    setOpen: (next) => setAnchor(next ? triggerRef.current?.getBoundingClientRect() ?? null : null),
    triggerRef,
    contentRef: popoverRef,
  });

  // Autofocuses the dialog exactly once per open transition — keyed on `open`,
  // not `anchor`, so the reposition recalculations below (which produce a new
  // anchor rect on every resize/scroll) never reschedule it. Runs in
  // useLayoutEffect (synchronously, in the same commit as the open, before
  // the browser can process any further input) rather than via
  // requestAnimationFrame: a deferred-to-next-frame autofocus left a real gap
  // in which the browser could act on an intervening event before focus ever
  // landed in the dialog. Two different failure shapes came from that same
  // gap: (a) an explicitly-set focus (e.g. via .focus() on the close button)
  // landing before the deferred frame, which the frame would then silently
  // reclaim back onto the dialog container, breaking Enter-to-close; and
  // (b) nothing having claimed focus yet when Tab fires, so Tab's native
  // next-tabbable-element lookup skips right past the still-unfocused dialog
  // and lands on the next sibling's own focusable trigger instead — for the
  // adjacent calculation Tooltip (which opens on focus, see Tooltip.tsx),
  // that silently opens it and, via OverlayController's single-active-overlay
  // handoff, dismisses this dialog before the user ever reaches its close
  // button. Making the autofocus synchronous with the open removes the gap
  // entirely instead of guarding against symptoms of it. The
  // already-focused-inside check is kept as defense in depth for any future
  // caller that focuses something inside the dialog before this effect runs
  // in the same commit (issue #162).
  useLayoutEffect(() => {
    if (!open) return;
    const popover = popoverRef.current;
    if (!popover || popover.contains(document.activeElement)) return;
    popover.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  return <div className="category-profile-quality-signals">
    <button
      ref={triggerRef}
      type="button"
      data-overlay-trigger
      className={`category-profile-quality-trigger ${hasExcluded ? 'is-limited' : 'is-review-only'}`}
      aria-label={`Показать качество данных категории ${profile.category}`}
      aria-expanded={open}
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
  const mode = useDashboardStore((state) => state.categoryProfileMode);
  const setCategoryProfileMode = useDashboardStore((state) => state.setCategoryProfileMode);
  const showAll = useDashboardStore((state) => state.categoryProfileShowAll);
  const setCategoryProfileShowAll = useDashboardStore((state) => state.setCategoryProfileShowAll);

  const sortedBenchmarks = useMemo(() => sortCategoryBenchmarkPayloads(context.categoryBenchmarks, mode), [context.categoryBenchmarks, mode]);
  const profileByCategory = useMemo(() => new Map(context.categoryProfiles.map((profile) => [profile.category, profile])), [context.categoryProfiles]);

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
  const hiddenCount = Math.max(0, sortedBenchmarks.length - COLLAPSED_ROW_COUNT);

  const sortingDescriptionId = 'category-profile-sorting-description';
  const sortingUnitWord = mode === 'count' ? 'количеству брендов' : 'доле категории';
  const exportManifest = buildCategoryBenchmarkExportManifest(sortedBenchmarks, mode);
  const summary = exportManifest.qualitySummary;

  return <div className="category-profile-list" role="region" aria-label="Профиль по категориям" aria-describedby={sortingDescriptionId}>
    <p id={sortingDescriptionId} className="sr-only">Категории отсортированы по отклонению от медианы группы по {sortingUnitWord}, по убыванию. При равном отклонении используется название категории по алфавиту.</p>
    <p className="category-profile-note"><Info size={16} aria-hidden="true" />Структура tenant-mix относительно выбранной группы; не оценка коммерческой эффективности. Отклонение — от медианы группы без фокусного объекта.</p>
    {partial ? <div className="category-profile-partial" role="status"><AlertTriangle size={16} aria-hidden="true" />Расчёт выполнен по доступным данным. Часть записей исключена.</div> : null}
    <div className="category-profile-mode-toggle" data-pdf-exclude role="group" aria-label="Режим отображения показателя">
      <button type="button" aria-pressed={mode === 'count'} onClick={() => setCategoryProfileMode('count')}>Количество</button>
      <button type="button" aria-pressed={mode === 'share'} onClick={() => setCategoryProfileMode('share')}>Доля</button>
    </div>
    <dl className="category-profile-quality-summary" aria-label="Сводка качества расчёта по категориям">
      <div><dt>Категорий с полными данными</dt><dd>{summary.fullData}</dd></div>
      <div><dt>Категорий с ограниченным расчётом</dt><dd>{summary.partialQuality}</dd></div>
      <div><dt>Категорий с конфликтующими данными</dt><dd>{summary.conflicting}</dd></div>
      <div><dt>Категорий, исключённых по качеству</dt><dd>{summary.qualityExcluded}</dd></div>
      <div><dt>Категорий без данных</dt><dd>{summary.noData}</dd></div>
      <div><dt>Исключённых/ограниченных записей</dt><dd>{summary.excludedRecordCount}</dd></div>
    </dl>
    <script type="application/json" id="category-benchmark-export-manifest" data-pdf-exclude>{JSON.stringify(exportManifest)}</script>
    {sortedBenchmarks.map((benchmark, index) => {
      const profile = profileByCategory.get(benchmark.categoryId);
      if (!profile) return null;
      const hasExcluded = profile.excludedUnknownCount + profile.excludedConflictingCount > 0;
      const hasIncludedReview = profile.manualReviewCount > 0;
      const hasQualitySignal = hasExcluded || hasIncludedReview;
      const isCollapsedAway = !showAll && index >= COLLAPSED_ROW_COUNT;
      const mainValue = profile.allRowsExcludedByQuality
        ? 'Показатель не рассчитан · данные требуют проверки'
        : profile.displayPercent == null
          ? `${profile.exclusiveCount} ${exclusiveWord(profile.exclusiveCount)} · нет данных`
          : `${profile.exclusiveCount} ${exclusiveWord(profile.exclusiveCount)} · ${profile.displayPercent}% категории`;
      return <div
        className={`category-profile-row${hasQualitySignal ? ' has-quality-signal' : ''}${hasExcluded && hasIncludedReview ? ' has-mixed-quality' : ''}${isCollapsedAway ? ' category-profile-row-collapsed' : ''}`}
        key={profile.category}
        aria-hidden={isCollapsedAway || undefined}
      >
        <button className="category-profile-open" type="button" onClick={() => openCategory(profile.category)} aria-label={`Открыть категорию ${profile.category}`}>
          <span className="category-profile-copy">
            <strong>{profile.category}</strong>
            <span className="category-profile-values">
              <span>{profile.totalBrands} {brandWord(profile.totalBrands)}</span>
              <b>{mainValue}</b>
              {profile.upcomingCount ? <em>+{profile.upcomingCount} скоро открытие</em> : null}
            </span>
            <CategoryBenchmarkBar benchmark={benchmark} mode={mode} />
          </span>
          <ChevronRight aria-hidden="true" />
        </button>
        {hasQualitySignal ? <QualityDisclosure profile={profile} /> : null}
        <Tooltip className="category-profile-tooltip" accessibleLabel={`Пояснение расчёта для категории ${profile.category}`} label={tooltip(profile, context)} />
      </div>;
    })}
    {hiddenCount > 0 ? <button type="button" className="category-profile-show-all" data-pdf-exclude aria-expanded={showAll} onClick={() => setCategoryProfileShowAll(!showAll)}>
      {showAll ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
      {showAll ? 'Свернуть' : `Показать все ${sortedBenchmarks.length} категорий`}
    </button> : null}
  </div>;
}
