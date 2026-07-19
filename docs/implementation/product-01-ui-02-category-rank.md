# PRODUCT-01-UI-02 — category rank corrective contract

Issue: #79
Parent: #49
Baseline: `99d003041c8cd202456c0fce465cdf1564aa28bf`

## Confirmed semantics

- `categoryCount = 0` produces `rank = null` in the canonical ranking source of truth.
- UI, tooltip and accessible text render `Нет позиции` for `rank = null`.
- Positive equal counts use dense ranking.
- Alphabetical order may stabilize display order only; it must not break ranking ties.

Examples:

- `12, 12, 8, 8, 3` → `1, 1, 2, 2, 3`
- `7, 7, 7, 2` → `1, 1, 1, 2`
- `5, 0, 0` → `1, null, null`
- `0, 0, 0` → `null, null, null`

## Required implementation

1. Locate the canonical category ranking calculation used by AnalysisContext and category profile presentation.
2. Change the model contract so zero counts return `null` rather than a positional rank.
3. Implement dense ranking for positive ties without alphabetical tie-breaking.
4. Make all desktop/mobile/tooltip/accessibility consumers use the canonical rank result.
5. Do not change active-only status semantics, tenant counts, exclusivity, potential brands, Jaccard, DATA-META-01 or export corrective tasks.

## Required tests

- zero count → `rank = null`;
- all-zero group → all ranks `null`;
- positive ties use dense ranking;
- UI and accessible text show `Нет позиции` and never `N из M` for null rank;
- focus, group, geography and category changes;
- TypeScript, unit, Chromium/WebKit, mobile 320/375/390/430 and accessibility.

## Production acceptance

After merge, confirm a dedicated Pages run, production SHA/build-info, new and previously opened tabs, Chromium/WebKit and a real iPhone Safari check for category `Товары 18+`.

Issue #79 remains open until production acceptance. Issue #49 remains open until both #78 and #79 are accepted in production.
