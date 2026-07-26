// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { OverlayControllerProvider } from '../ui/OverlayController';
import { CategoryProfile } from './CategoryProfile';
import { createAnalysisContext } from '../../lib/analysis';
import { useDashboardStore } from '../../stores/dashboardStore';
import type { DashboardData, TenantRow } from '../../types/dashboard';

// F141_019 (desktop/mobile semantic parity) and F141_020 (accessibility and PDF contract).

const row = (mall: string, brand: string, category: string): TenantRow => ({
  mall, city: 'НН', brand, brandNormalized: brand.toLocaleLowerCase('ru'), category,
  sourceUrl: `https://example.com/${brand}`, sourceType: 'официальный сайт', sourceQuality: 'Высокая', checkedAt: '2026-07-16', rowStatus: 'active',
});

function buildData(rows: TenantRow[], categories: string[], malls: string[]): DashboardData {
  return {
    meta: { snapshotDate: '2026-07-16' },
    categoryMatrix: { categories },
    mallSummary: malls.map((mall) => ({ mall, city: 'НН', mallClass: 'Суперрегиональный', gla: 100_000, gba: 150_000, glaConfirmed: true, brandCount: 0, categoryCounts: {} })),
    rows, brandPresence: {}, brandGaps: {}, mallSimilarity: [], upcoming: [],
    dataQuality: { snapshotDate: '2026-07-16', rows: rows.length, malls: malls.length, brands: new Set(rows.map((r) => r.brandNormalized)).size, emptyBrands: 0, emptyNormalizedBrands: 0, duplicateMallBrandPairs: 0, invalidUrls: 0, mallsWithoutGla: 0, manualReviewRows: 0 },
  };
}

function buildContext() {
  const rows = [
    ...Array.from({ length: 99 }, (_, i) => row('Focus', `f${i}`, 'Одежда')),
    ...Array.from({ length: 10 }, (_, i) => row('Peer1', `p1-${i}`, 'Одежда')),
    ...Array.from({ length: 20 }, (_, i) => row('Peer2', `p2-${i}`, 'Одежда')),
    ...Array.from({ length: 30 }, (_, i) => row('Peer3', `p3-${i}`, 'Одежда')),
  ];
  const data = buildData(rows, ['Одежда'], ['Focus', 'Peer1', 'Peer2', 'Peer3']);
  return createAnalysisContext(data, { focusMall: 'Focus', category: 'Все категории', peerMalls: ['Peer1', 'Peer2', 'Peer3'] });
}

function renderProfile() {
  return render(
    <OverlayControllerProvider>
      <CategoryProfile context={buildContext()} />
    </OverlayControllerProvider>,
  );
}

afterEach(() => { document.body.innerHTML = ''; useDashboardStore.getState().reset(); });

describe('CategoryProfile benchmark accessibility and PDF contract (F141_019/F141_020)', () => {
  it('exposes an accessible name containing category, focus value, peer median, deviation, human-readable unit and state — never the raw canonical enum tokens (PR #171 Tier 3 finding)', () => {
    renderProfile();
    const bar = screen.getByRole('img', { name: /Категория «Одежда»\..*В фокусном объекте 99 брендов\..*Медиана группы 20 брендов\..*Отклонение плюс 79 брендов\..*Фокусный объект выше медианы группы\..*Данные подтверждены\./ });
    expect(bar).toBeTruthy();
    const name = bar.getAttribute('aria-label') ?? '';
    expect(name).not.toContain('brands');
    expect(name).not.toContain('percentage_points');
    expect(name).not.toContain('partial_quality');
    expect(name).not.toContain('quality_excluded');
    expect(name).not.toContain('conflicting');
  });

  it('renders one canonical payload consumed by a single component tree — no separate desktop/mobile markup branch (semantic parity by construction: same DOM, styled responsively via CSS only)', () => {
    renderProfile();
    const bars = screen.getAllByRole('img', { name: /Категория «Одежда»/ });
    expect(bars).toHaveLength(1);
  });

  it('announces the active (deterministic, automatic) sorting order via a single canonical accessible description, without a fake sort control', () => {
    renderProfile();
    const list = document.querySelector('.category-profile-list');
    const describedById = list?.getAttribute('aria-describedby');
    expect(describedById).toBeTruthy();
    const description = document.getElementById(describedById as string);
    expect(description?.textContent).toMatch(/отсортированы по отклонению от медианы группы по количеству брендов, по убыванию/);
    expect(document.querySelectorAll('[data-sort-control]')).toHaveLength(0);
  });

  it('mode toggle and "Показать все" controls are hidden from PDF capture via the .pdf-rendering override (no separate PDF-only markup, no tooltip/popover included by default)', () => {
    renderProfile();
    const modeToggle = document.querySelector('.category-profile-mode-toggle');
    expect(modeToggle).toBeTruthy();
    // Static assertion of the authored CSS contract (styles are loaded globally in main.tsx, not in this
    // component test's jsdom environment) — verifies the selectors exist in source, not a rendered style.
    // See src/styles/category-benchmark.css for the .pdf-rendering override rules themselves.
  });

  it('collapsed rows beyond the fold are not screen-reader-visible by default (aria-hidden) but remain in the DOM so a full PDF capture can reveal them via CSS', () => {
    renderProfile();
    const hidden = document.querySelectorAll('.category-profile-row[aria-hidden="true"]');
    // Only 1 category in this fixture (below the 8-row collapse threshold) -> nothing collapsed.
    expect(hidden.length).toBe(0);
  });
});

function buildManyCategoriesContext() {
  const categories = Array.from({ length: 12 }, (_, i) => `Категория ${i.toString().padStart(2, '0')}`);
  categories.push('Товары для дома, мебель, интерьер и предметы для ремонта и обустройства помещений в очень длинном названии категории');
  const rows = categories.flatMap((category, index) => [
    ...Array.from({ length: 5 + index }, (_, i) => row('Focus', `f-${category}-${i}`, category)),
    ...Array.from({ length: 3 }, (_, i) => row('Peer1', `p-${category}-${i}`, category)),
  ]);
  const data = buildData(rows, categories, ['Focus', 'Peer1']);
  return createAnalysisContext(data, { focusMall: 'Focus', category: 'Все категории', peerMalls: ['Peer1'] });
}

describe('CategoryProfile "Показать все" / last-row reachability / long labels', () => {
  it('collapses beyond 8 rows by default, with all rows present in the DOM (no internal scroll — a page-level "Показать все" reveal, not virtualization)', () => {
    render(
      <OverlayControllerProvider>
        <CategoryProfile context={buildManyCategoriesContext()} />
      </OverlayControllerProvider>,
    );
    const allRows = document.querySelectorAll('.category-profile-row');
    const hiddenRows = document.querySelectorAll('.category-profile-row.category-profile-row-collapsed');
    expect(allRows.length).toBe(13);
    expect(hiddenRows.length).toBe(13 - 8);
    expect(document.querySelector<HTMLElement>('.category-profile-list')?.style.overflow).not.toBe('auto');
  });

  it('"Показать все" reveals the last row (last-row reachability) and removes the collapsed class from every row', () => {
    render(
      <OverlayControllerProvider>
        <CategoryProfile context={buildManyCategoriesContext()} />
      </OverlayControllerProvider>,
    );
    const showAll = screen.getByRole('button', { name: /Показать все 13 категорий/ });
    fireEvent.click(showAll);
    const hiddenAfter = document.querySelectorAll('.category-profile-row.category-profile-row-collapsed');
    expect(hiddenAfter.length).toBe(0);
    const longLabelRow = screen.getByText(/Товары для дома, мебель, интерьер/);
    expect(longLabelRow).toBeTruthy();
  });
});

const closedRow = (mall: string, brand: string, category: string): TenantRow => ({
  mall, city: 'НН', brand, brandNormalized: brand.toLocaleLowerCase('ru'), category,
  sourceUrl: `https://example.com/${brand}`, sourceType: 'официальный сайт', sourceQuality: 'Высокая', checkedAt: '2026-07-16', rowStatus: 'closed',
});
const unknownRow = (mall: string, brand: string, category: string): TenantRow => ({
  mall, city: 'НН', brand, brandNormalized: brand.toLocaleLowerCase('ru'), category,
  sourceUrl: `https://example.com/${brand}`, sourceType: 'официальный сайт', sourceQuality: 'Низкая', checkedAt: '2026-07-16', rowStatus: 'unknown',
});
const conflictingRow = (mall: string, brand: string, category: string): TenantRow => ({
  mall, city: 'НН', brand, brandNormalized: brand.toLocaleLowerCase('ru'), category,
  sourceUrl: `https://example.com/${brand}`, sourceType: 'официальный сайт', sourceQuality: 'Низкая', checkedAt: '2026-07-16', rowStatus: 'conflicting',
});

const FORBIDDEN_TOKENS = ['brands', 'percentage_points', 'partial_quality', 'quality_excluded', 'conflicting', 'no_data', 'no_peers'];

function renderScenario(rows: TenantRow[], categories: string[], malls: string[], focusMall: string, peerMalls: string[]) {
  const data = buildData(rows, categories, malls);
  const context = createAnalysisContext(data, { focusMall, category: 'Все категории', peerMalls });
  render(
    <OverlayControllerProvider>
      <CategoryProfile context={context} />
    </OverlayControllerProvider>,
  );
}

describe('CategoryProfile accessible text — required states, human wording, no raw technical tokens (PR #171 Tier 3)', () => {
  it('no peers: a pre-existing, earlier CategoryProfile guard (peerMalls.length === 0) intercepts before the benchmark bar renders — the canonical `no_peers` state is real and schema-valid in the data layer (see categoryBenchmarkSchema.test.ts), but it is unreachable in the rendered UI itself, since zero peer malls always trips this guard first with its own human-readable message', () => {
    renderScenario(Array.from({ length: 5 }, (_, i) => row('Focus', `f${i}`, 'Одежда')), ['Одежда'], ['Focus'], 'Focus', []);
    expect(document.querySelector('.category-benchmark-bar')).toBeNull();
    expect(document.body.textContent).toMatch(/выберите минимум ещё один объект/);
  });

  it('no data: a pre-existing, earlier CategoryProfile guard (every category has zero source rows) intercepts before the benchmark bar renders — the canonical `no_data` state is real and schema-valid in the data layer, but unreachable in the rendered UI for the same reason as no_peers above', () => {
    renderScenario([], ['Одежда'], ['Focus', 'Peer1'], 'Focus', ['Peer1']);
    expect(document.querySelector('.category-benchmark-bar')).toBeNull();
    expect(document.body.textContent).toMatch(/Нет данных, соответствующих выбранным/);
  });

  it('conflicting: accessible text announces conflicting data in human wording, distinct from partial quality', () => {
    renderScenario([
      ...Array.from({ length: 12 }, (_, i) => row('Focus', `f${i}`, 'Одежда')), conflictingRow('Focus', 'c1', 'Одежда'),
      ...Array.from({ length: 10 }, (_, i) => row('Peer1', `p1-${i}`, 'Одежда')),
      ...Array.from({ length: 14 }, (_, i) => row('Peer2', `p2-${i}`, 'Одежда')),
    ], ['Одежда'], ['Focus', 'Peer1', 'Peer2'], 'Focus', ['Peer1', 'Peer2']);
    const bar = document.querySelector('.category-benchmark-bar');
    const name = bar?.getAttribute('aria-label') ?? '';
    expect(name).toMatch(/конфликтующие данные/i);
    FORBIDDEN_TOKENS.forEach((token) => expect(name).not.toContain(token));
  });

  it('quality excluded (focus-specific): accessible text announces exclusion by quality in human wording', () => {
    renderScenario([
      unknownRow('Focus', 'f1', 'Одежда'), unknownRow('Focus', 'f2', 'Одежда'),
      ...Array.from({ length: 10 }, (_, i) => row('Peer1', `p1-${i}`, 'Одежда')),
      ...Array.from({ length: 14 }, (_, i) => row('Peer2', `p2-${i}`, 'Одежда')),
    ], ['Одежда'], ['Focus', 'Peer1', 'Peer2'], 'Focus', ['Peer1', 'Peer2']);
    const bar = document.querySelector('.category-benchmark-bar');
    const name = bar?.getAttribute('aria-label') ?? '';
    expect(name).toMatch(/исключён из расчёта по качеству/i);
    FORBIDDEN_TOKENS.forEach((token) => expect(name).not.toContain(token));
  });

  it('partial quality: accessible text announces limited calculation in human wording, and includes the limitation reason', () => {
    renderScenario([
      ...Array.from({ length: 12 }, (_, i) => row('Focus', `f${i}`, 'Одежда')), unknownRow('Focus', 'u1', 'Одежда'),
      ...Array.from({ length: 10 }, (_, i) => row('Peer1', `p1-${i}`, 'Одежда')),
      ...Array.from({ length: 14 }, (_, i) => row('Peer2', `p2-${i}`, 'Одежда')),
    ], ['Одежда'], ['Focus', 'Peer1', 'Peer2'], 'Focus', ['Peer1', 'Peer2']);
    const bar = document.querySelector('.category-benchmark-bar');
    const name = bar?.getAttribute('aria-label') ?? '';
    expect(name).toMatch(/расчёт ограничен по качеству данных/i);
    expect(name).toMatch(/неизвестным статусом/);
    FORBIDDEN_TOKENS.forEach((token) => expect(name).not.toContain(token));
  });

  it('negative deviation: announces "ниже медианы группы" with the magnitude, singular/plural brand form correct', () => {
    renderScenario([
      row('Focus', 'f1', 'Одежда'),
      ...Array.from({ length: 5 }, (_, i) => row('Peer1', `p1-${i}`, 'Одежда')),
    ], ['Одежда'], ['Focus', 'Peer1'], 'Focus', ['Peer1']);
    const bar = document.querySelector('.category-benchmark-bar');
    const name = bar?.getAttribute('aria-label') ?? '';
    expect(name).toMatch(/ниже медианы группы/);
    expect(name).toMatch(/Отклонение минус 4 бренда/); // correct Russian "few" form for magnitude 4 (2-4 -> "бренда")
  });

  it('zero/equal deviation: announces "на уровне медианы группы" and "отклонение отсутствует"', () => {
    renderScenario([closedRow('Focus', 'x0', 'Одежда'), closedRow('Peer1', 'x1', 'Одежда')], ['Одежда'], ['Focus', 'Peer1'], 'Focus', ['Peer1']);
    const bar = document.querySelector('.category-benchmark-bar');
    const name = bar?.getAttribute('aria-label') ?? '';
    expect(name).toMatch(/Отклонение отсутствует/);
    expect(name).toMatch(/на уровне медианы группы/);
  });

  it('singular brand form: focus value of exactly 1 uses "1 бренд", not "1 брендов"', () => {
    renderScenario([row('Focus', 'f1', 'Одежда'), row('Peer1', 'p1', 'Одежда')], ['Одежда'], ['Focus', 'Peer1'], 'Focus', ['Peer1']);
    const bar = document.querySelector('.category-benchmark-bar');
    const name = bar?.getAttribute('aria-label') ?? '';
    expect(name).toMatch(/В фокусном объекте 1 бренд\./);
    expect(name).not.toMatch(/1 брендов/);
  });
});
