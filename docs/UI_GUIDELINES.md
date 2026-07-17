# UI Guidelines

## Typography
- Use at most two font families.
- Preferred: Manrope Variable for headings/KPI and Inter Variable for body, tables and controls.
- Self-host or package fonts; do not make Google Fonts a critical dependency.
- Body: 14–16 px, line-height about 1.5.
- Table text: 12–14 px; numeric values use tabular figures.

## Layout
- Desktop container: max width 1440 px.
- Use an 8 px spacing scale.
- Overview should communicate the main position within 10–15 seconds.
- Do not repeat full analytical blocks across pages.
- Avoid fixed sticky offsets tied to assumed header height.

## Visual hierarchy
1. Focus object and core KPI.
2. Actionable factual signals.
3. Comparative charts and tables.
4. Methodology and data-quality detail.

## Colour semantics
- Green: confirmed advantage or focus object.
- Amber: deviation requiring analysis.
- Blue/slate: neutral comparison and information.
- Red: confirmed risk or error only.
- Colour is never the only carrier of meaning.

## Tables
- Shared visual system and reusable components.
- Light header, subtle horizontal separators, compact rows.
- Sticky header; sticky first column only for wide tables.
- Text left, numeric values right.
- `н/д` is neutral and sorts last.
- Desktop uses semantic tables; mobile may use cards.
- All sorting and filtering controls require keyboard access and ARIA labels.

## Mobile
- Test 320, 390 and 768 px widths.
- No page-level horizontal overflow.
- Tooltips must remain inside viewport; use popover/bottom sheet when needed.
- Primary touch targets at least 40×40 px.
- Navigation may scroll horizontally with visible affordance and scroll snap.
- Secondary header actions belong in an overflow menu.

## Copy
Use Russian user-facing terms:
- Фокусный объект
- Группа сравнения
- Объекты сравнения
- Нижний Новгород
Avoid `peer group` in UI.