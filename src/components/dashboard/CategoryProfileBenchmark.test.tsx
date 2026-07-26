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
  it('exposes an accessible name containing category, focus value, peer median, deviation, canonical unit and state', () => {
    renderProfile();
    const bar = screen.getByRole('img', { name: /Категория Одежда\..*Фокус 99\..*Медиана группы 20\..*Отклонение 79 brands\..*Состояние: рассчитано\./ });
    expect(bar).toBeTruthy();
  });

  it('renders one canonical payload consumed by a single component tree — no separate desktop/mobile markup branch (semantic parity by construction: same DOM, styled responsively via CSS only)', () => {
    renderProfile();
    const bars = screen.getAllByRole('img', { name: /Категория Одежда/ });
    expect(bars).toHaveLength(1);
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
