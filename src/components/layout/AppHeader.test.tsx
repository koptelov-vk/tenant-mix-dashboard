// @vitest-environment jsdom
import { useRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DashboardData } from '../../types/dashboard';
import { useDashboardStore } from '../../stores/dashboardStore';
import { OverlayControllerProvider, useControlledOverlay } from '../ui/OverlayController';
import { AppHeader } from './AppHeader';

const data = { meta: { snapshotDate: '2026-07-16' } } as DashboardData;

function TestOverlay() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const overlay = useControlledOverlay({ open, setOpen, triggerRef, contentRef });
  return <>
    <button ref={triggerRef} onClick={overlay.toggle}>Test overlay</button>
    {open ? <div ref={contentRef} role="dialog">Transient content</div> : null}
  </>;
}

function renderHeader(withOverlay = false) {
  return render(
    <OverlayControllerProvider>
      {withOverlay ? <TestOverlay /> : null}
      <AppHeader data={data} rows={[]} refreshing={false} onRefresh={vi.fn()} />
    </OverlayControllerProvider>,
  );
}

afterEach(() => {
  document.body.innerHTML = '';
  useDashboardStore.getState().reset();
  localStorage.clear();
});

describe('Decision F Option B BrandLockup', () => {
  it('changes only activePage and preserves the approved context', () => {
    useDashboardStore.getState().hydrate({
      focusMall: 'Небо',
      category: 'Обувь',
      categories: ['Обувь', 'Одежда'],
      metric: 'share',
      activePage: 'brands',
      peerGroup: 'custom',
      selectedMalls: ['Фантастика', 'Небо'],
      cities: ['Нижний Новгород'],
      sourceQualities: ['Высокая'],
      gapN: 2,
      glaMin: 10_000,
      glaMax: 100_000,
      gbaMin: 20_000,
      gbaMax: 150_000,
      hideSmallCategories: false,
      categoryProfileMode: 'share',
      categoryProfileShowAll: true,
    });
    const before = useDashboardStore.getState();
    renderHeader();

    const brand = screen.getByRole('button', { name: 'Tenant Mix Analytics' });
    expect(brand.querySelectorAll('button, a, input, select, textarea')).toHaveLength(0);
    fireEvent.click(brand);

    const after = useDashboardStore.getState();
    const { activePage: _beforePage, ...beforeContext } = before;
    const { activePage: _afterPage, ...afterContext } = after;
    expect(after.activePage).toBe('overview');
    expect(afterContext).toEqual(beforeContext);
  });

  it('is idempotent when Overview is already active', () => {
    useDashboardStore.getState().setActivePage('overview');
    renderHeader();
    const before = useDashboardStore.getState();
    fireEvent.click(screen.getByRole('button', { name: 'Tenant Mix Analytics' }));
    expect(useDashboardStore.getState()).toEqual(before);
  });

  it('closes the shared overlay without returning focus to its opener', () => {
    useDashboardStore.getState().setActivePage('brands');
    renderHeader(true);
    const overlayTrigger = screen.getByRole('button', { name: 'Test overlay' });
    fireEvent.click(overlayTrigger);
    expect(screen.getByRole('dialog')).not.toBeNull();

    const brand = screen.getByRole('button', { name: 'Tenant Mix Analytics' });
    brand.focus();
    fireEvent.click(brand);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(brand);
    expect(document.activeElement).not.toBe(overlayTrigger);
    expect(useDashboardStore.getState().activePage).toBe('overview');
  });
});
