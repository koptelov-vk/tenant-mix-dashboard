# TM-XXX: Task title

## Outcome
One-sentence user-visible result.

## Read first
- `AGENTS.md`
- `docs/CURRENT_STATE.md`
- only the ADR or guideline linked below

## In scope
- exact feature or correction
- exact business rule

## Allowed files
- `path/to/file.ts`
- `path/to/test.ts`

Files may be added only under the same feature area when necessary.

## Do not modify
- unrelated pages
- data pipeline unless explicitly listed
- CI, dependencies, lockfile, legacy or market modules

## Acceptance criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Tests during implementation
- `pnpm exec tsc --noEmit`
- `pnpm vitest run <target>`
- `pnpm playwright test <spec> --grep <case>`

Do not run the full matrix locally unless this task changes shared calculations, data, build configuration or global layout.

## Unrelated findings
Append them to `docs/BACKLOG.md`; do not fix them.

## Final response
Report only:
1. changed files;
2. completed criteria;
3. tests and results;
4. commit SHA;
5. limitations.