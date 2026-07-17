# React migration checklist

Snapshot: 2026-07-16. Production data: 4,997 tenant rows, 30 malls, 2,578 normalized brands.

| Current function | React target | Source | Status | Acceptance test |
|---|---|---|---|---|
| Focus mall, default Fantastika | `GlobalFilters`, `dashboardStore` | `mallSummary` | Complete | Default focus and focus change |
| Comparison group and geography | `GlobalFilters`, `useAnalysisContext` | `mallSummary` | Complete | Focus outside peer group |
| URL state and browser navigation | `useUrlState` | URL query | Complete | Reload, Back, Forward |
| Slice-consistent KPI and benchmark | `useAnalysisContext`, `KpiGrid` | Filtered tenant rows | Calculation complete | Category and source filters update all metrics |
| Global, group, and focus uniqueness | `uniqueness.ts`, uniqueness table | `brandPresence`, current slice | Calculation complete | Three scopes against fixtures |
| Intersections | `intersections.ts` | Current slice | Calculation complete | Focus overlap against fixtures |
| Jaccard similarity | `jaccard.ts`, comparability page | Current slice | Calculation complete | Controlled A/B sets |
| Category medians and deviations | `median.ts`, `BulletChart` | Current peer group | Calculation complete | Focus excluded from peer median when required |
| Density per 10,000 sqm GLA | `density.ts` | Confirmed GLA only | Calculation complete | Missing GLA returns no data |
| Gap analysis | `gaps.ts`, `PotentialBrandsTable` | Current competitors and sources | Calculation complete | Focus brands excluded; `gapN` works |
| Executive summary | `ExecutiveSummary` | Unified analysis context | Complete | Every statement is reproducible |
| Tenant mix profile | `TenantMixStackedBar` | Current slice | Complete | Shares total 100% per mall |
| Category heatmap | `CategoryHeatmap` | Current slice | Complete | Absolute, share, and density modes |
| Mall comparison | `MallComparisonTable`, `MallSheet` | Current slice and mall metadata | Complete | Focus first; GLA and GBA distinct; sheet keyboard close |
| Brand registry | `BrandRegistryTable`, `BrandSheet` | Tenant rows | Complete | Virtualization, filters, mobile cards |
| CSV export | `export/csv.ts` | Current filtered rows | Complete | UTF-8 BOM and filtered rows only |
| XLSX export | `export/xlsx.ts` | Current filtered rows | Complete | Lazy-loaded workbook |
| Upcoming openings | `UpcomingPage`, `UpcomingTable` | Upcoming aggregate | Complete | Overdue does not imply opened |
| Data quality | `DataQualityPage` | `dataQualitySummary` | Complete | Critical errors block deploy |
| Scenarios | `ScenariosPage`, `scenarioStore`, `calculations/scenarios` | Baseline plus local changes | Complete for available tenant-mix metrics | Baseline immutable; category, uniqueness, intersections and Jaccard recalculate |
| Saved views | `SavedViewsMenu`, `savedViewStore` | Complete dashboard filter state | Complete | Save, change state, restore filters and URL |
| History | `HistoryPage` | Snapshot collection | Complete empty state | One snapshot renders an empty state |
| GitHub Pages deployment | quality-gated workflow | `dist` | Complete | No deploy after failed quality job |

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
