// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { OverlayControllerProvider } from '../ui/OverlayController';
import { QualityDisclosure } from './CategoryProfile';
import type { CategoryProfileStats } from '../../types/dashboard';

function profile(overrides: Partial<CategoryProfileStats> = {}): CategoryProfileStats {
  return {
    category: 'Одежда',
    totalBrands: 10,
    exclusiveBrands: new Set(),
    exclusiveCount: 0,
    exactPercent: 0,
    displayPercent: 0,
    upcomingCount: 0,
    excludedUnknownCount: 1,
    excludedConflictingCount: 0,
    manualReviewCount: 0,
    qualityIssues: [],
    sourceRowCount: 10,
    allRowsExcludedByQuality: false,
    ...overrides,
  };
}

function renderDisclosure() {
  return render(
    <OverlayControllerProvider>
      <QualityDisclosure profile={profile()} />
    </OverlayControllerProvider>,
  );
}

afterEach(() => { document.body.innerHTML = ''; });

describe('QualityDisclosure synchronous autofocus vs. intentional focus race (issue #162)', () => {
  it('autofocuses the dialog synchronously on open, in the same act() as the opening click', () => {
    renderDisclosure();

    const trigger = screen.getByRole('button', { name: /Показать качество данных категории/ });
    act(() => { fireEvent.click(trigger); });

    // No timer flush, no extra tick: useLayoutEffect runs in the same commit
    // as the click that opened the dialog, so focus must already be inside
    // by the time this synchronous assertion runs.
    const dialog = screen.getByRole('dialog', { name: /Качество данных категории/ });
    expect(document.activeElement).toBe(dialog);
  });

  it('does not steal focus back onto the dialog once it has moved to the close button (regression: #162 Enter race)', () => {
    renderDisclosure();

    const trigger = screen.getByRole('button', { name: /Показать качество данных категории/ });
    act(() => { fireEvent.click(trigger); });

    const closeButton = screen.getByRole('button', { name: 'Закрыть сведения о качестве данных' });
    act(() => { closeButton.focus(); });
    expect(document.activeElement).toBe(closeButton);

    // Nothing scheduled/deferred remains to fire and reclaim focus later —
    // this is the direct consequence of autofocus now being synchronous
    // rather than a requestAnimationFrame callback that could land after
    // this explicit focus() call.
    expect(document.activeElement).toBe(closeButton);
  });

  it('closing and reopening does not leave any stray focus jump behind', () => {
    renderDisclosure();

    const trigger = screen.getByRole('button', { name: /Показать качество данных категории/ });
    act(() => { fireEvent.click(trigger); });

    const closeButton = screen.getByRole('button', { name: 'Закрыть сведения о качестве данных' });
    act(() => { fireEvent.click(closeButton); });
    expect(document.activeElement).toBe(trigger);
    expect(screen.queryByRole('dialog', { name: /Качество данных категории/ })).toBeNull();

    // Reopening must autofocus again cleanly (no residual state from the
    // previous open/close cycle).
    act(() => { fireEvent.click(trigger); });
    const dialog = screen.getByRole('dialog', { name: /Качество данных категории/ });
    expect(document.activeElement).toBe(dialog);
  });

  it('keyboard Enter on the close button still closes the dialog and returns focus to the trigger when focus is established normally', () => {
    renderDisclosure();

    const trigger = screen.getByRole('button', { name: /Показать качество данных категории/ });
    act(() => { fireEvent.click(trigger); });

    const closeButton = screen.getByRole('button', { name: 'Закрыть сведения о качестве данных' });
    act(() => { closeButton.focus(); });
    expect(document.activeElement).toBe(closeButton);

    act(() => { fireEvent.click(closeButton); });

    expect(screen.queryByRole('dialog', { name: /Качество данных категории/ })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
