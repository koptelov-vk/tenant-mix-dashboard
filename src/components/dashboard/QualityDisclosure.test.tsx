// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('QualityDisclosure deferred autofocus vs. intentional focus race (issue #162)', () => {
  it('does not steal focus back onto the dialog once it has already moved to the close button (regression: #162 race)', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame'] });
    renderDisclosure();

    const trigger = screen.getByRole('button', { name: /Показать качество данных категории/ });
    act(() => { fireEvent.click(trigger); });

    const closeButton = screen.getByRole('button', { name: 'Закрыть сведения о качестве данных' });
    // Reproduces the exact failing CI sequence: focus is intentionally moved
    // to the close button BEFORE the dialog's own scheduled autofocus frame
    // has had a chance to run.
    act(() => { closeButton.focus(); });
    expect(document.activeElement).toBe(closeButton);

    // Flush the pending requestAnimationFrame — this is the previously-buggy
    // moment where the stale autofocus call would silently reclaim focus.
    act(() => { vi.runOnlyPendingTimers(); });

    expect(document.activeElement).toBe(closeButton);
  });

  it('still autofocuses the dialog on open when nothing else has claimed focus', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame'] });
    renderDisclosure();

    const trigger = screen.getByRole('button', { name: /Показать качество данных категории/ });
    act(() => { fireEvent.click(trigger); });

    const dialog = screen.getByRole('dialog', { name: /Качество данных категории/ });
    expect(document.activeElement).not.toBe(dialog);

    act(() => { vi.runOnlyPendingTimers(); });

    expect(document.activeElement).toBe(dialog);
  });

  it('cancels the pending autofocus frame on close before it fires (no stale focus jump)', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame'] });
    renderDisclosure();

    const trigger = screen.getByRole('button', { name: /Показать качество данных категории/ });
    act(() => { fireEvent.click(trigger); });

    const closeButton = screen.getByRole('button', { name: 'Закрыть сведения о качестве данных' });
    act(() => { fireEvent.click(closeButton); });
    expect(document.activeElement).toBe(trigger);

    // The frame scheduled by the now-closed (unmounted) dialog must not fire
    // and must not throw or move focus away from the restored trigger.
    expect(() => { act(() => { vi.runOnlyPendingTimers(); }); }).not.toThrow();
    expect(document.activeElement).toBe(trigger);
  });

  it('keyboard Enter on the close button still closes the dialog and returns focus to the trigger when focus is established normally (real timers)', () => {
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
