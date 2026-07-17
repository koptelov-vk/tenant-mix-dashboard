# TM-002: Brand table UI

## Outcome
Render the approved five-column aggregated Brands table and mobile cards using the TM-001 model.

## Read first
- `AGENTS.md`
- `docs/CURRENT_STATE.md`
- `docs/UI_GUIDELINES.md`
- `docs/tasks/TM-001-brand-table-model.md`

## Allowed files
- `src/pages/BrandsPage.tsx`
- `src/components/details/BrandSheet.tsx`
- `src/components/table/**`
- table-specific styles
- Brands Playwright spec

## Do not modify
Data pipeline, AnalysisContext calculations, other pages, CI, PDF, dependencies or lockfile.

## Acceptance criteria
- [ ] Columns: Бренд, Характеристика, Категория, Объекты, Источник.
- [ ] Brand click opens details.
- [ ] Desktop semantic table and mobile card mode.
- [ ] Sticky header and no page-level overflow.
- [ ] Existing global scope remains unchanged.

## Tests
TypeScript, targeted Brands Playwright and production build only.