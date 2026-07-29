// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { AnalysisContext, BrandGap } from '../../types/dashboard';
import { useDashboardStore } from '../../stores/dashboardStore';
import { OverlayControllerProvider } from '../ui/OverlayController';
import { PotentialBrands } from './PotentialBrands';

const cases = [
  [1, '1 объект'],
  [3, '3 объекта'],
  [4, '4 объекта'],
  [5, '5 объектов'],
  [11, '11 объектов'],
  [21, '21 объект'],
  [22, '22 объекта'],
  [25, '25 объектов'],
] as const;

function gap(count: number): BrandGap {
  return {
    brand: `Бренд ${count}`,
    brandNormalized: `бренд-${count}`,
    category: 'Одежда',
    malls: Array.from({ length: count }, (_, index) => `Объект ${index + 1}`),
    mallCount: count,
    share: 0.5,
    source: {
      mall: 'Объект 1',
      url: `https://example.com/brand-${count}`,
      type: 'официальный сайт',
      quality: 'Высокая',
      checkedAt: '2026-07-16',
    },
  };
}

function renderPotentialBrands() {
  const context = {
    peerMalls: Array.from({ length: 25 }, (_, index) => ({ mall: `Объект ${index + 1}` })),
    gaps: cases.map(([count]) => gap(count)),
  } as AnalysisContext;

  const result = render(
    <OverlayControllerProvider>
      <PotentialBrands context={context} limit={cases.length} />
    </OverlayControllerProvider>,
  );
  return result;
}

afterEach(() => {
  document.body.innerHTML = '';
  useDashboardStore.getState().reset();
});

describe('PotentialBrands object pluralization', () => {
  it('renders the shared Russian forms in visible and accessible text', () => {
    renderPotentialBrands();

    for (const [count, expected] of cases) {
      const expectedText = `Одежда · ${expected} · 50%`;
      const text = screen.getByText((_, element) => element?.tagName === 'SMALL' && element.textContent === expectedText);
      expect(text.textContent).toBe(expectedText);
      expect(text.closest('.brand-signals')).toBeTruthy();
      expect(screen.getByRole('link', { name: `Источник бренда Бренд ${count}` })).toBeTruthy();
    }

    expect(document.body.textContent).not.toMatch(/\b(?:3|4)\s+объектов\b/);
  });

  it('uses the same canonical text when the PDF capture class is active', () => {
    const { container } = renderPotentialBrands();
    const before = container.querySelector('.brand-signals')?.textContent;

    document.body.classList.add('pdf-rendering');

    expect(container.querySelector('.brand-signals')?.textContent).toBe(before);
    expect(before).toContain('3 объекта');
    expect(before).toContain('4 объекта');
  });
});
