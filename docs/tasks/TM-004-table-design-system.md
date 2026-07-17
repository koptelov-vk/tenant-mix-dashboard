# TM-004: Shared table visual system

## Outcome
Apply one reusable visual table system to existing tables without changing their data or business logic.

## Read first
- `AGENTS.md`
- `docs/CURRENT_STATE.md`
- `docs/UI_GUIDELINES.md`

## Allowed files
- `src/components/table/**`
- table-specific CSS/tokens
- existing table page markup only as required to adopt shared components
- visual/table Playwright specs

## Do not modify
Column definitions, calculations, data pipeline, filters, exports, navigation, CI or dependencies.

## Acceptance criteria
- [ ] Shared header, row, badge, link, sort and filter-button visuals.
- [ ] Sticky headers and consistent focus states.
- [ ] Numeric columns use tabular figures and right alignment.
- [ ] Existing table data and behaviour remain contract-identical.
- [ ] No page-level horizontal overflow at 320 and 390 px.

## Tests
Targeted table E2E, visual screenshots, axe and build. Lighthouse is left to CI.