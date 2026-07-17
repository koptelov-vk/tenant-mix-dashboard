# TM-005: Typography and sticky layout

## Outcome
Introduce the approved Manrope/Inter typography and remove fragile sticky offsets without redesigning business content.

## Read first
- `AGENTS.md`
- `docs/CURRENT_STATE.md`
- `docs/UI_GUIDELINES.md`

## Allowed files
- font declarations and typography tokens
- header/filter/layout components
- layout-specific styles
- mobile/layout Playwright specs

## Do not modify
Data, calculations, table content, navigation labels, dependencies unrelated to fonts, exports or market features.

## Acceptance criteria
- [ ] Manrope Variable for headings/KPI and Inter Variable for body/tables.
- [ ] Fonts are self-hosted or package-provided, with robust fallbacks.
- [ ] No hard-coded sticky offset based on assumed header height.
- [ ] Header and filters do not cover content.
- [ ] No overflow at 320, 390, 768, 1366 and 1440 px.
- [ ] Layout remains usable with font loading disabled.

## Tests
TypeScript, mobile/desktop layout E2E, axe, production build and screenshots. Lighthouse runs in CI.