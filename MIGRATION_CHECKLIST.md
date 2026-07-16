# React migration checklist

Snapshot: 2026-07-16. Production data: 4,997 tenant rows, 30 malls, 2,578 normalized brands.

| Current function | React target | Source | Status | Acceptance test |
|---|---|---|---|---|
| Focus mall, default Fantastika | `GlobalFilters`, `dashboardStore` | `mallSummary` | In progress | Default focus and focus change |
| Comparison group and geography | `GlobalFilters`, `useAnalysisContext` | `mallSummary` | In progress | Focus outside peer group |
| URL state and browser navigation | `useUrlState` | URL query | In progress | Reload, Back, Forward |
| Slice-consistent KPI and benchmark | `useAnalysisContext`, `KpiGrid` | Filtered tenant rows | In progress | Category and source filters update all metrics |
| Global, group, and focus uniqueness | `uniqueness.ts`, uniqueness table | `brandPresence`, current slice | Pending | Three scopes against fixtures |
| Intersections | `intersections.ts` | Current slice | Pending | Focus overlap against fixtures |
| Jaccard similarity | `jaccard.ts`, comparability page | Current slice | Pending | Controlled A/B sets |
| Category medians and deviations | `median.ts`, `BulletChart` | Current peer group | Pending | Focus excluded from peer median when required |
| Density per 10,000 sqm GLA | `density.ts` | Confirmed GLA only | In progress | Missing GLA returns no data |
| Gap analysis | `gaps.ts`, `PotentialBrandsTable` | Current competitors and sources | Pending | Focus brands excluded; `gapN` works |
| Executive summary | `ExecutiveSummary` | Unified analysis context | Pending | Every statement is reproducible |
| Tenant mix profile | `TenantMixStackedBar` | Current slice | Pending | Shares total 100% per mall |
| Category heatmap | `CategoryHeatmap` | Current slice | Pending | Absolute, share, and density modes |
| Mall comparison | `MallComparisonTable`, `MallSheet` | Current slice and mall metadata | Pending | Focus first; GLA and GBA distinct |
| Brand registry | `BrandRegistryTable`, `BrandSheet` | Tenant rows | Pending | Virtualization, filters, mobile cards |
| CSV export | `export/csv.ts` | Current filtered rows | Pending | UTF-8 BOM and filtered rows only |
| XLSX export | `export/xlsx.ts` | Current filtered rows | Pending | Lazy-loaded workbook |
| Upcoming openings | `UpcomingPage`, `UpcomingTable` | Upcoming aggregate | Pending | Overdue does not imply opened |
| Data quality | `DataQualityPage` | `dataQualitySummary` | Pending | Critical errors block deploy |
| Scenarios | `ScenariosPage`, `scenarioStore` | Baseline plus local changes | Pending | Baseline remains immutable |
| History | `HistoryPage` | Snapshot collection | Pending | One snapshot renders an empty state |
| GitHub Pages deployment | quality-gated workflow | `dist` | Pending | No deploy after failed quality job |

## Calculation contract

- Global uniqueness: normalized brand occurs in exactly one mall in the full production database.
- Group uniqueness: normalized brand occurs in exactly one mall in the current peer group plus focus comparison scope.
- Focus exclusive: brand occurs in the focus mall and in no selected competitor.
- Intersection: focus brand occurs in at least one selected competitor.
- Jaccard: `intersection(A, B) / union(A, B)` using normalized brand sets.
- Category share: distinct normalized brands in category divided by distinct normalized brands in the same mall and current slice.
- Density: distinct normalized brands divided by confirmed GLA, multiplied by 10,000. GBA is never a substitute.
- Peer median: median of the current peer slice. A focus mall added outside the group is excluded.
- Gap brand: absent from focus, present in at least `N` selected competitors, category and source-quality filters satisfied.

