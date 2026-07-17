# Testing Strategy

## Goal
Use the narrowest useful test during development and reserve the complete matrix for PR/merge. This reduces agent context, CI time and repeated log analysis without lowering release quality.

## Level 1 — targeted development
Use for isolated logic, copy, styling or component changes.
- `pnpm exec tsc --noEmit`
- `pnpm vitest run <related-test-file>`
- targeted Python test when data code changes

## Level 2 — feature completion
- targeted Playwright spec with `--grep` or one spec file
- `pnpm build`
- affected accessibility checks

## Level 3 — pull request gate
- source-data validation
- aggregate build and contract tests
- all unit tests
- production build
- relevant browser suites selected by changed paths

## Level 4 — merge/deploy gate
- full desktop/mobile Playwright matrix
- axe-core
- Lighthouse for shared layout, bundle, chart or performance changes
- production smoke test after deploy

## Change-to-test matrix
| Change | Required checks |
|---|---|
| docs only | markdown/link checks only |
| copy/terminology | TypeScript, targeted component test |
| isolated component | TypeScript, targeted unit, targeted E2E |
| table/filter | TypeScript, table unit/E2E, build |
| shared CSS/layout/font | build, mobile/desktop E2E, axe, visual screenshots |
| calculation logic | unit + production contract + dependent E2E |
| data pipeline/aliases | validation, aggregate build, Python tests, contract tests |
| dependencies/build config | install, full unit, build, relevant E2E |
| merge to main | complete quality and deploy pipeline |

## Rules
- Do not run Lighthouse for documentation, aliases or isolated copy changes.
- Do not install Playwright browsers in jobs that do not run browser tests.
- Do not read full logs when a concise annotation identifies the failed step.
- Do not convert failures into expected skips.
- Store reusable small fixtures under `tests/fixtures/`.
- Production contract tests validate invariants, not every raw row.