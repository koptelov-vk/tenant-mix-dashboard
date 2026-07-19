# UX-TOOLTIP-01 inventory

Issue: #104
Baseline: `1f5b04a5e45ca52261549ed320c282b33e495800`

| Consumer | Component path | Trigger / activation | Close mechanics | Focus | Portal / z-index | PDF | Accessibility | Migration status |
|---|---|---|---|---|---|---|---|---|
| Category calculation explanation | `src/components/dashboard/CategoryProfile.tsx` | native `details/summary`; click/tap and keyboard | repeated activation; native details | browser-native | inline, component CSS | transient content must be excluded under #75 | summary accessible name + tooltip role | pending controller migration |
| Category quality disclosure | `src/components/dashboard/CategoryProfile.tsx` | button; click/tap, Enter, Space | close button, Escape, outside pointer | manual focus return | `createPortal(document.body)`, z-index 80 | transient content must be excluded under #75 | dialog, aria-expanded, aria-controls | pending controller migration and #102 sync |
| KPI explanations | KPI components identified during code audit | hover/focus behavior varies | pointer leave/focus loss/Escape varies | local | local stacking | verify PDF exclusion | tooltip semantics vary | pending inventory completion |
| Global/table filters | filter popover components | click/tap | outside pointer/Escape | local focus return | portal/popover varies | transient | dialog/menu semantics | pending controller integration |
| Header/export/saved-view popovers | layout components and PR #97 | click/tap | outside pointer/Escape/close | local | local stacking | transient | dialog/menu | migrate after PR #97 sync |

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
