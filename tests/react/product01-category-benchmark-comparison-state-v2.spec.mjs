import { expect, test } from '@playwright/test';

function row(mall, brand, category) {
  return {
    mall,
    city: 'Тестгород',
    brand,
    brandNormalized: brand.toLocaleLowerCase('ru'),
    category,
    sourceUrl: `https://example.test/${brand}`,
    sourceType: 'официальный сайт',
    sourceQuality: 'Высокая',
    checkedAt: '2026-07-30',
    rowStatus: 'active',
  };
}

function boundaryDataset() {
  const focusRows = Array.from({ length: 2_000 }, (_, index) => row('Фантастика', `focus-${index}`, 'Другая'));
  const peerRows = [
    row('Peer1', 'peer-boundary', 'Граница'),
    ...Array.from({ length: 2_000 }, (_, index) => row('Peer1', `peer-${index}`, 'Другая')),
  ];
  const rows = [...focusRows, ...peerRows];
  return {
    meta: {
      version: `sha256-${'0'.repeat(64)}`,
      snapshotDate: '2026-07-30',
    },
    rows,
    mallSummary: [
      { mall: 'Фантастика', city: 'Тестгород', mallClass: 'Тестовый', gla: 50_000, gba: 60_000, glaConfirmed: true, brandCount: 2_000, categoryCount: 1, categoryCounts: { Другая: 2_000 } },
      { mall: 'Peer1', city: 'Тестгород', mallClass: 'Тестовый', gla: 50_000, gba: 60_000, glaConfirmed: true, brandCount: 2_001, categoryCount: 2, categoryCounts: { Граница: 1, Другая: 2_000 } },
    ],
    categoryMatrix: { categories: ['Граница'] },
    brandPresence: {},
    mallSimilarity: [],
    brandGaps: {},
    upcoming: [],
    dataQuality: {
      snapshotDate: '2026-07-30',
      rows: rows.length,
      malls: 2,
      brands: rows.length,
      emptyBrands: 0,
      emptyNormalizedBrands: 0,
      duplicateMallBrandPairs: 0,
      invalidUrls: 0,
      mallsWithoutGla: 0,
      manualReviewRows: 0,
    },
  };
}

test.describe('#172 canonical comparison-state v2 surface parity', () => {
  test('negative sub-precision Share remains below across visible, accessibility, CSS and PDF-sidecar projection', async ({ page }) => {
    await page.route('**/data/dashboard_data.json', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(boundaryDataset()),
    }));
    await page.goto('/tenant-mix-dashboard/', { waitUntil: 'networkidle' });
    await page.locator('.category-profile-mode-toggle button', { hasText: 'Доля' }).click();

    const bar = page.locator('.category-benchmark-bar');
    await expect(bar.locator('.category-benchmark-deviation')).toHaveText('▼ ниже медианы менее чем на 0,1 п.п.');
    await expect(bar.locator('.category-benchmark-deviation')).toHaveClass(/is-below/);
    await expect(bar).toHaveAttribute('aria-label', /Фокусный объект ниже медианы менее чем на 0,1 процентного пункта\./);

    const manifest = await page.evaluate(() => {
      const element = document.getElementById('category-benchmark-export-manifest');
      return JSON.parse(element?.textContent || '{}');
    });
    const rowProjection = manifest.categories[0].projection;
    expect(manifest.mode).toBe('share');
    expect(rowProjection.comparisonState).toBe('below');
    expect(rowProjection.deviationRaw).toBeLessThan(0);
    expect(Math.abs(rowProjection.deviationRaw)).toBeLessThan(0.05);
    expect(rowProjection.displayDeviation).toBeNull();
    expect(rowProjection.displayRelationText).toBe('ниже медианы менее чем на 0,1 п.п.');
    expect(rowProjection.accessibleRelationText).toBe('Фокусный объект ниже медианы менее чем на 0,1 процентного пункта.');
    expect(rowProjection.glyph).toBe('▼');
    expect(rowProjection.cssState).toBe('below');
    expect(rowProjection.boundaryApplied).toBe(true);
    expect(rowProjection.consumerCalculations).toEqual([]);
  });
});
