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

- Mall sheet is not yet implemented; comparison table and cards are available.
- Scenario import/export, rename, copy, and full recalculation of every category metric remain follow-up work.
- Saved views and PDF export are deferred until core parity, accessibility, and CI are accepted.
- The current data has one snapshot, so history remains an empty state.
- Local Lighthouse is blocked by a Windows Chrome temporary-profile cleanup error; Ubuntu CI remains authoritative.

## QA evidence

- Production Zod validation covers 4,997 rows, 30 malls, and 2,578 normalized brands.
- Vitest: 7 passing tests.
- Playwright: 23 passing tests, 1 intentionally skipped desktop duplicate of mobile overflow.
- URL history: Back, Forward, Reload, focus mall, and active section are verified on desktop, 390 px, and 320 px.
- Viewports: 1366x768, 390x844, and 320x568 in automated QA; five screenshots in `artifacts/react/`.
