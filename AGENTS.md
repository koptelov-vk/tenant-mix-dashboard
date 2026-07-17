# AGENTS.md

## Project
Tenant Mix Dashboard is a production analytics application for comparing shopping-centre tenant mix. Production: https://koptelov-vk.github.io/tenant-mix-dashboard/

## Approved stack
React 18, TypeScript, Vite, Zustand, TanStack Query, TanStack Virtual, Recharts, Python data pipeline, GitHub Pages. Do not propose framework, state-manager or build-tool migrations unless explicitly requested.

## Business rules
1. Never replace production data with mocks.
2. Never use GBA as a substitute for GLA.
3. The focus object is excluded from the comparison-group median.
4. Category counts use unique `brandNormalized` values, not raw row counts.
5. User-facing terminology is Russian: `Фокусный объект`, `Группа сравнения`, `Объекты`.
6. Do not reintroduce the removed Scenarios section.
7. Do not change normalized data without an audit trail and contract tests.
8. Market presence is a signal, not proof of a brand's readiness to sign a lease.

## Context discipline
Before work, read only:
- this file;
- `docs/CURRENT_STATE.md`;
- the referenced task file;
- files explicitly listed in the task scope.

Do not re-audit the whole repository unless the task explicitly requests an audit.
Do not inspect generated, archived or visual artefacts unless they are part of the task.

Normally ignore:
- `node_modules/`
- `dist/`
- `legacy/`
- `artifacts/`
- `playwright-report/`
- `test-results/`
- screenshots and binary documents
- large raw datasets

## Scope control
- Modify only files needed for the current acceptance criteria.
- Record unrelated findings in `docs/BACKLOG.md`; do not fix them in the same task.
- Avoid mass formatting and unrelated dependency updates.
- Do not regenerate lockfiles unless dependencies changed.
- Prefer extending existing components and calculation utilities over creating parallel systems.

## Testing levels
During implementation, run the narrowest relevant checks.

Level 1 — local change:
- `pnpm exec tsc --noEmit`
- targeted Vitest file

Level 2 — completed feature:
- targeted Playwright spec
- `pnpm build`

Level 3 — before PR/merge:
- `pnpm validate:data`
- `pnpm build:aggregates`
- `pnpm test:data`
- `pnpm test`
- `pnpm build`
- `pnpm test:react:e2e`

Lighthouse and the full browser matrix belong in CI or major layout/performance changes, not small copy or data-alias edits.

## Output discipline
Do not restate the entire task. Final report should include only:
- changed files;
- acceptance criteria completed;
- tests run and results;
- commit SHA;
- known limitations.

## Git safety
- Work in a dedicated branch.
- Do not force-push `main`.
- Do not bypass required checks.
- Do not merge unless explicitly requested by the task.