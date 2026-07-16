# React migration baseline

Recorded on 2026-07-17 before new migration work.

## Stable fallback

The pre-React Dashboard 2.0 is preserved at `legacy/dashboard-v2-pre-react.html`. The existing `index.html` remains unchanged during the parallel migration.

## Baseline verification

- Data validation: passed, 4,997 rows and 30 malls.
- Legacy aggregate contract: 6 of 6 checks passed.
- React calculation tests before fixes: 3 of 3 assertions passed, but Vitest incorrectly collected Node and Playwright suites.
- React production build before fixes: failed on strict TypeScript errors and a Windows case-insensitive `app.js` / `App.tsx` collision.
- React production build after foundation fixes: passed.
- Initial React bundle: 254.00 kB JavaScript, 75.76 kB gzip; 4.78 kB CSS, 1.54 kB gzip.

## Baseline screenshots

Stored under `artifacts/baseline/` for 1440x900, 1366x768, 768x1024, 390x844, and 320x568.

The stable dashboard has visible page-level horizontal overflow at 390 px. This is a known baseline defect and a required regression test for the React version.

