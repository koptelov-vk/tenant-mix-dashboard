# React migration report

## Logical corrections

- KPI and benchmark now use the same filtered rows.
- Focus mall, peer malls, and display malls are separate concepts.
- A focus mall outside peer criteria is displayed but excluded from the peer median.
- Active GLA/GBA filters exclude missing values instead of converting them to zero.
- GBA is never used for GLA density.
- Jaccard and gap candidates are recalculated from the current slice.
- Global, group, focus-exclusive, and intersecting brands have separate definitions.

## Current limitations

- PDF export captures the displayed analysis in A4 landscape; PDF libraries are loaded only on demand.
- The current data has one snapshot, so history remains an empty state.
- Local Lighthouse is blocked by a Windows Chrome temporary-profile cleanup error; Ubuntu CI remains authoritative.
- Five-viewport screenshots are maintained in `artifacts/react/`; Playwright verifies desktop, 390 px and 320 px behavior.

## Completed in the follow-up iteration

- Added an accessible mall sheet opened from comparison tables and cards. It shows GLA and GBA separately, current-slice brands and categories, confirmed-GLA density, source coverage, top categories, below-median categories and Jaccard context.
- Expanded scenarios with load, rename, copy, delete, JSON import/export and schema validation.
- Scenario calculations now reproducibly recalculate brand count, category counts and shares, focus exclusives, intersections and Jaccard against every peer mall without mutating baseline.
- Scenario files retain the source snapshot date and warn when loaded against another snapshot.
- Added schema-validated saved views for the complete dashboard filter state, with load, rename, copy and delete actions.
- Added lazy multi-page PDF export of the current displayed slice with semantic page boundaries that keep analytical cards intact.

## QA evidence

- Production Zod validation covers 4,997 rows, 30 malls, and 2,578 normalized brands.
- Vitest: 15 passing tests.
- Playwright: 33 passing tests, 3 expected project-specific skips.
- URL history: Back, Forward, Reload, focus mall, and active section are verified on desktop, 390 px, and 320 px.
- Viewports: 1366x768, 390x844, and 320x568 in automated QA; five screenshots in `artifacts/react/`.
- GitHub Actions quality job: passed on Ubuntu for commit `3f0ee43`.
- Lighthouse runs: Performance 95/96/96, Accessibility 100/100/100, Best Practices 96/96/96, SEO 100/100/100.
- Lighthouse medians: Performance 96, Accessibility 100, Best Practices 96, SEO 100.
- Initial JavaScript: 297.95 kB (89.32 kB gzip). PDF code is split into separate wrapper, html2canvas and jsPDF chunks and is not loaded at startup.
