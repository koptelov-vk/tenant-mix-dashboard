import { expect, test } from '@playwright/test';

// PR #171 Tier 3 PDF finding: the export must carry a quality summary built from the same
// canonical payloads as the UI, and a real generated PDF must be verified (not just visually
// inspected). This spec reads the canonical export manifest (a hidden, data-pdf-exclude JSON
// sidecar rendered by CategoryProfile from the exact same payloads used for the UI), cross-checks
// it against the visible quality-summary block, and separately verifies the real generated PDF
// artifact (valid header, page count, non-empty).

async function readManifest(page) {
  return page.evaluate(() => {
    const el = document.getElementById('category-benchmark-export-manifest');
    return el ? JSON.parse(el.textContent || '{}') : null;
  });
}

async function exportPdfBuffer(page) {
  await page.click('button[aria-label="Экспорт текущего среза"]');
  await page.waitForSelector('.export-actions-popover');
  const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
  await page.click('.export-actions-popover button[title="PDF"]');
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function pageMarkerCount(buffer) {
  return (buffer.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) || []).length;
}

// retries=0 explicitly for the whole file — generated-PDF tests must not rely on the shared
// CI retries:1 to mask flakiness (PR #171 final Tier 3 finding).
test.describe.configure({ retries: 0 });

test.describe('CategoryProfile PDF quality summary and canonical manifest', () => {
  test('visible quality-summary block matches the canonical export manifest exactly (Count mode, collapsed UI)', async ({ page }) => {
    await page.goto('?focus=Фантастика&tab=overview');
    await page.waitForSelector('.category-profile-list');

    const manifest = await readManifest(page);
    expect(manifest).toBeTruthy();
    expect(manifest.mode).toBe('count');
    expect(manifest.categories.length).toBeGreaterThan(0);

    const summaryText = await page.locator('.category-profile-quality-summary').textContent();
    expect(summaryText).toContain(String(manifest.qualitySummary.fullData));
    expect(summaryText).toContain(String(manifest.qualitySummary.partialQuality));
    expect(summaryText).toContain(String(manifest.qualitySummary.conflicting));
    expect(summaryText).toContain(String(manifest.qualitySummary.qualityExcluded));
    expect(summaryText).toContain(String(manifest.qualitySummary.noData));
    expect(summaryText).toContain(String(manifest.qualitySummary.excludedRecordCount));

    // Manifest itself is transient test evidence and must not appear in the PDF; the summary block must.
    const manifestExcluded = await page.locator('#category-benchmark-export-manifest').getAttribute('data-pdf-exclude');
    const summaryExcluded = await page.locator('.category-profile-quality-summary').getAttribute('data-pdf-exclude');
    expect(manifestExcluded).not.toBeNull();
    expect(summaryExcluded).toBeNull();
  });

  test('manifest and quality summary update consistently when switching to Share mode', async ({ page }) => {
    await page.goto('?focus=Фантастика&tab=overview');
    await page.waitForSelector('.category-profile-list');
    await page.locator('.category-profile-mode-toggle button', { hasText: 'Доля' }).click();

    const manifest = await readManifest(page);
    expect(manifest.mode).toBe('share');
    for (const category of manifest.categories) expect(category.deviationUnit).toBe('percentage_points');

    const summaryText = await page.locator('.category-profile-quality-summary').textContent();
    expect(summaryText).toContain(String(manifest.qualitySummary.fullData));
    expect(summaryText).toContain(String(manifest.qualitySummary.noData));
  });

  test('manifest category count equals the full list regardless of collapsed vs expanded UI state', async ({ page }) => {
    await page.goto('?focus=Фантастика&tab=overview');
    await page.waitForSelector('.category-profile-list');
    const collapsedManifest = await readManifest(page);

    await page.locator('.category-profile-show-all').click();
    const expandedManifest = await readManifest(page);

    expect(expandedManifest.categories.length).toBe(collapsedManifest.categories.length);
    expect(expandedManifest.qualitySummary).toEqual(collapsedManifest.qualitySummary);
  });

  test('real generated PDF (Count + collapsed): valid multi-page artifact, quality summary and full category list present', async ({ page }) => {
    await page.goto('?focus=Фантастика&tab=overview');
    await page.waitForSelector('.category-profile-list');
    // Deliberately leave collapsed — the harder case for "full list in PDF".
    const collapsedRowCount = await page.locator('.category-profile-row.category-profile-row-collapsed').count();
    expect(collapsedRowCount).toBeGreaterThan(0);
    const manifest = await readManifest(page);

    const buffer = await exportPdfBuffer(page);
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pageMarkerCount(buffer)).toBeGreaterThan(0);
    expect(manifest.categories.length).toBeGreaterThan(8); // exceeds the 8-row collapse threshold, proving full-list export
  });

  test('real generated PDF (Count + expanded): same manifest content as collapsed, valid multi-page artifact', async ({ page }) => {
    await page.goto('?focus=Фантастика&tab=overview');
    await page.waitForSelector('.category-profile-list');
    await page.locator('.category-profile-show-all').click();
    const manifest = await readManifest(page);

    const buffer = await exportPdfBuffer(page);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pageMarkerCount(buffer)).toBeGreaterThan(0);
    expect(manifest.qualitySummary.totalCategories).toBeGreaterThan(8);
  });

  test('real generated PDF (Share + collapsed): valid artifact, share-mode manifest units', async ({ page }) => {
    await page.goto('?focus=Фантастика&tab=overview');
    await page.waitForSelector('.category-profile-list');
    await page.locator('.category-profile-mode-toggle button', { hasText: 'Доля' }).click();
    const manifest = await readManifest(page);
    expect(manifest.mode).toBe('share');

    const buffer = await exportPdfBuffer(page);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pageMarkerCount(buffer)).toBeGreaterThan(0);
  });
});
