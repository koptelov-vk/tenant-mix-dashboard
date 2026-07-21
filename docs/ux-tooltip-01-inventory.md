# UX-TOOLTIP-01 inventory

Issue: #104
Baseline after PR #103 merge: `4613b727b1052aeac8de5736bd5bc8369fc7bf0e`

| Consumer | Component path | Trigger / activation | Close mechanics | Focus | Portal / z-index | PDF | Accessibility | Migration status |
|---|---|---|---|---|---|---|---|---|
| Category calculation explanation | `src/components/dashboard/CategoryProfile.tsx` → `ui/Tooltip.tsx` | pointer hover, focus, coarse-pointer tap | shared repeated activation, pointer outside, Escape | shared restore; none on handoff | body portal, shared z-index | `data-pdf-exclude` | button name, aria-expanded/controls, tooltip | migrated |
| Category quality disclosure | `src/components/dashboard/CategoryProfile.tsx` | click/tap, Enter, Space | shared outside/Escape plus visible close | shared restore; none on handoff | body portal, shared z-index | `data-pdf-exclude` | dialog, aria-expanded/controls, exact #102 text | migrated without semantic changes |
| KPI explanations | `src/components/dashboard/KpiGrid.tsx` → `ui/Tooltip.tsx` | pointer hover, focus, coarse-pointer tap | shared controller | shared | body portal, shared z-index | `data-pdf-exclude` | button name, aria-expanded/controls, tooltip | migrated |
| Global filters | `src/components/layout/GlobalFilters.tsx` | click/tap, keyboard | shared controller plus visible Done | shared | component layer, shared z-index | `data-pdf-exclude` | dialog/listbox, aria-expanded/controls | migrated |
| Table filters | `src/components/ui/MultiFilter.tsx` | click/tap, keyboard | shared controller plus visible close | shared | body portal, shared z-index | `data-pdf-exclude` | dialog, aria-expanded/controls | migrated |
| Methodology/help | `KpiGrid.tsx`, `ComparableObjects.tsx`, `PotentialBrands.tsx` → `ControlledDisclosure.tsx` | click/tap, keyboard | shared repeated/outside/Escape | shared | inline shared disclosure | `data-pdf-exclude` | summary, aria-expanded/controls, labelled region | migrated |
| Header navigation | `src/components/layout/Navigation.tsx` | click/tap, keyboard | shared controller | shared | header layer, shared z-index | `data-pdf-exclude` | menu, aria-expanded/controls | migrated |
| Export | `src/components/layout/ExportActionsMenu.tsx` | click/tap, keyboard | shared plus visible close | shared | header layer, shared z-index | `data-pdf-exclude` | dialog, aria-expanded/controls | migrated; export semantics unchanged |
| Saved Views | `src/components/layout/SavedViewsMenu.tsx` | click/tap, keyboard | shared plus visible close | shared | header layer, shared z-index | `data-pdf-exclude` | dialog, aria-expanded/controls | migrated; persistence semantics unchanged |

## Canonical controller contract

- one active overlay id for tooltip/popover/disclosure consumers;
- opening a new overlay performs atomic handoff without intermediate focus bounce;
- repeated activation closes the active overlay;
- outside pointer/tap and Escape close the active overlay;
- focus returns only for ordinary close, not during handoff;
- desktop supports pointer hover and keyboard focus for compact tooltips;
- coarse-pointer devices use one-tap open and repeated-tap close;
- extended disclosure has a visible close button;
- overlay geometry uses visual viewport and safe-area;
- all transient surfaces carry the shared PDF-exclusion marker defined with Issue #75;
- formulas, data, ranking, export semantics and source records are outside scope.

## Required migration scenarios

- quality → calculation;
- calculation → quality;
- calculation A → calculation B;
- tooltip → filter/popover and reverse handoff;
- repeated tap;
- outside tap;
- Escape and focus return;
- no navigation side effect;
- Chromium/WebKit at 320/375/390/430 px and landscape;
- real iPhone Safari and Android Chrome.
