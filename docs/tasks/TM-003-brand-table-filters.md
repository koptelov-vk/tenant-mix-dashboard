# TM-003: Brand table filters, sorting and exports

## Outcome
Add column-level filtering and sorting to the aggregated Brands table and export only the visible slice.

## Read first
- `AGENTS.md`
- `docs/CURRENT_STATE.md`
- `docs/UI_GUIDELINES.md`
- `docs/tasks/TM-001-brand-table-model.md`
- `docs/tasks/TM-002-brand-table-ui.md`

## Allowed files
- Brands page and table components
- local brand-table state/hooks
- CSV/XLSX export utilities
- related unit and Brands E2E tests

## Do not modify
Global AnalysisContext semantics, data pipeline, other pages, CI, PDF, dependencies or lockfile.

## Acceptance criteria
- [ ] Every displayed column supports its approved filter.
- [ ] Every displayed column supports deterministic sorting.
- [ ] Filters combine with AND and appear as removable chips.
- [ ] Reset restores the global-scope result.
- [ ] CSV/XLSX export only filtered aggregated rows.
- [ ] Changing filters scrolls the virtual list to the top.

## Tests
Targeted unit, Brands Playwright, TypeScript and build.