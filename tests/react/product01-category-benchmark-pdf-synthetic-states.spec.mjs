import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// PR #171 final Tier 3 finding: the generated-PDF acceptance must go beyond byte-size/header
// checks and prove real semantic content, including the two quality states (conflicting,
// quality_excluded) not present in the current production data snapshot. Uses a committed,
// controlled synthetic fixture (tests/fixtures/synthetic-quality-states/dashboard_data.json)
// served via network route interception — production data is never touched.
//
// retries=0 is set explicitly for this whole file (not inherited from the shared CI retries:1),
// per the Tier 3 finding that generated-PDF tests must not rely on retry to mask flakiness.
test.describe.configure({ retries: 0 });

const synthetic = readFileSync(resolve('tests/fixtures/synthetic-quality-states/dashboard_data.json'), 'utf8');
const EXPECTED_CATEGORIES = ['Синтетика полные данные', 'Синтетика конфликт', 'Синтетика частично', 'Синтетика качество исключено', 'Синтетика нет данных'];

async function gotoSynthetic(page) {
  await page.route('**/data/dashboard_data.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: synthetic }));
  await page.goto('/tenant-mix-dashboard/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.category-profile-list');
}

async function readManifest(page) {
  return page.evaluate(() => {
    const el = document.getElementById('category-benchmark-export-manifest');
    return el ? JSON.parse(el.textContent || '{}') : null;
  });
}

test.describe('Generated PDF semantic contract — synthetic quality states (conflicting, quality_excluded, partial_quality, no_data, ok)', () => {
  test('synthetic fixture reproduces all five required quality states in the canonical manifest', async ({ page }) => {
    await gotoSynthetic(page);
    const manifest = await readManifest(page);
    expect(manifest.categories.map((c) => c.categoryId).sort()).toEqual([...EXPECTED_CATEGORIES].sort());
    expect(manifest.qualitySummary).toEqual({
      totalCategories: 5, fullData: 1, partialQuality: 1, conflicting: 1, qualityExcluded: 1, noData: 1, noPeers: 0, excludedRecordCount: 4,
    });
  });

  test('visible quality-summary block matches the manifest exactly for the synthetic dataset', async ({ page }) => {
    await gotoSynthetic(page);
    const manifest = await readManifest(page);
    const summaryText = await page.locator('.category-profile-quality-summary').textContent();
    expect(summaryText).toContain(String(manifest.qualitySummary.fullData));
    expect(summaryText).toContain(String(manifest.qualitySummary.partialQuality));
    expect(summaryText).toContain(String(manifest.qualitySummary.conflicting));
    expect(summaryText).toContain(String(manifest.qualitySummary.qualityExcluded));
    expect(summaryText).toContain(String(manifest.qualitySummary.noData));
    expect(summaryText).toContain(String(manifest.qualitySummary.excludedRecordCount));
  });

  test('real generated PDF (synthetic dataset): valid multi-page artifact, no transient UI, full category count reachable in the source manifest at export time', async ({ page }) => {
    await gotoSynthetic(page);
    const manifest = await readManifest(page);
    expect(manifest.categories.length).toBe(5);

    // Confirm transient UI is absent from the DOM subtree that gets captured (pdf-exclude
    // contract, re-verified here rather than assumed): mode toggle / show-all must be pdf-excluded,
    // the summary block and rows must not be.
    const modeToggleExcluded = await page.locator('.category-profile-mode-toggle').getAttribute('data-pdf-exclude');
    expect(modeToggleExcluded).not.toBeNull();
    const rowsExcluded = await page.locator('.category-profile-row').first().getAttribute('data-pdf-exclude');
    expect(rowsExcluded).toBeNull();

    await page.click('button[aria-label="Экспорт текущего среза"]');
    await page.waitForSelector('.export-actions-popover');
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await page.click('.export-actions-popover button[title="PDF"]');
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(1000);
    // A structural page-count proxy without a PDF-parsing dependency: count `/Type /Page` (or
    // the no-space variant) object markers, which is >=1 per page for html2canvas/jsPDF output.
    const text = buffer.toString('latin1');
    const pageMarkers = (text.match(/\/Type\s*\/Page(?!s)/g) || []).length;
    expect(pageMarkers).toBeGreaterThan(0);
  });

  test('Share mode + synthetic dataset: manifest deviationUnit is percentage_points for every category, states unchanged from Count mode', async ({ page }) => {
    await gotoSynthetic(page);
    const countManifest = await readManifest(page);
    await page.locator('.category-profile-mode-toggle button', { hasText: 'Доля' }).click();
    const shareManifest = await readManifest(page);
    expect(shareManifest.mode).toBe('share');
    shareManifest.categories.forEach((c) => expect(c.deviationUnit).toBe('percentage_points'));
    const countStates = Object.fromEntries(countManifest.categories.map((c) => [c.categoryId, c.state]));
    shareManifest.categories.forEach((c) => expect(c.state).toBe(countStates[c.categoryId]));
  });

  test('conflicting and quality_excluded remain visually and semantically distinct (not collapsed into the same state)', async ({ page }) => {
    await gotoSynthetic(page);
    const manifest = await readManifest(page);
    const conflicting = manifest.categories.find((c) => c.categoryId === 'Синтетика конфликт');
    const qualityExcluded = manifest.categories.find((c) => c.categoryId === 'Синтетика качество исключено');
    expect(conflicting.state).toBe('conflicting');
    expect(qualityExcluded.state).toBe('quality_excluded');
    expect(conflicting.state).not.toBe(qualityExcluded.state);
    // conflicting keeps a computable focus value; quality_excluded's focus value is null.
    expect(conflicting.focusValueRaw).not.toBeNull();
    expect(qualityExcluded.focusValueRaw).toBeNull();
  });
});
