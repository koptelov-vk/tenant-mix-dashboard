# Current State

Updated: 2026-07-17
Production branch: `main`
Production URL: https://koptelov-vk.github.io/tenant-mix-dashboard/

## Implemented
- React 18 + TypeScript + Vite production dashboard.
- Shared `AnalysisContext` for KPI, medians, category comparisons, uniqueness, intersections, Jaccard and gap analysis.
- Focus object separated from the comparison group.
- Manual comparison-object selection and URL state.
- Pages: Overview, Comparability, Categories, Brands, Upcoming openings, Data quality and History empty state.
- CSV/XLSX/PDF exports, brand and mall details, mobile layout, Playwright, axe and Lighthouse CI.

## Approved terminology
- Фокусный объект
- Группа сравнения
- Объекты
- Tenant mix may remain as an industry term.

## Approved calculation rules
- Comparison-group median excludes the focus object.
- Brand count uses distinct `brandNormalized` values.
- Category count uses distinct `brandNormalized` values inside object + category.
- Density uses confirmed GLA only.
- Jaccard measures brand-set similarity only.
- Gap brands are candidates for analysis, not commercial recommendations.

## Known improvement areas
- Brand table should use one aggregated row per normalized brand.
- Shared visual table system is still incomplete.
- Typography and sticky layout require further polish.
- Market and macroeconomic analytics are not yet implemented.
- Historical charts require at least two comparable snapshots.

## Working rule
Before starting a task, use the relevant file in `docs/tasks/` and avoid reopening unrelated architecture, legacy files, screenshots or production datasets.

## Update requirement
Any merged feature PR must update this document only when project state, architecture or known limitations materially change.