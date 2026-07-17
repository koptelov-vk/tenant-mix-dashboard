# TM-001: Aggregated brand table model

## Outcome
Provide one deterministic table row per normalized brand without changing UI.

## Read first
- `AGENTS.md`
- `docs/CURRENT_STATE.md`
- `docs/DATA_METHODOLOGY.md`
- `docs/adr/003-brand-normalization.md`

## Allowed files
- `src/lib/brandTable.ts` (new)
- `src/types/dashboard.ts`
- related unit tests
- `tests/fixtures/dashboard-small.json` only if a missing case is required

## Do not modify
Pages, CSS, exports, CI, data pipeline, dependencies or lockfile.

## Acceptance criteria
- [ ] One row per `brandNormalized`.
- [ ] Object list is unique and deterministically sorted.
- [ ] Characteristic follows documented uniqueness priority.
- [ ] Primary source selection is deterministic and tested.
- [ ] Small fixture covers unique, intersecting, focus-exclusive and missing-date cases.

## Tests
Run TypeScript and only the new unit-test file. Do not run full Playwright.