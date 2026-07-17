# ADR-001: Shared Analysis Context

Status: Accepted

## Decision
All KPI, medians, rankings, category comparisons, uniqueness, intersections, Jaccard, gap analysis and exports use one typed AnalysisContext derived from the same filtered row set.

## Consequences
- A filter cannot change one analytical block while leaving dependent blocks on a different scope.
- Static aggregates may optimise execution only when contract-equivalent to the active filters.
- New analytical components consume AnalysisContext rather than rebuilding business logic locally.

## Rejected
- Independent calculations inside page components.
- Comparing filtered focus values with unfiltered group benchmarks.