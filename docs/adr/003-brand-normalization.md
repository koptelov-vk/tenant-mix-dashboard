# ADR-003: Brand Normalization

Status: Accepted

## Decision
All counts and set operations use canonical `brandNormalized` values produced by the data pipeline before aggregation. Display variants remain available for audit and brand details.

## Consequences
- Aliases must be centralised and tested.
- Brand count, category count, uniqueness, intersections, Jaccard and gaps all use the same canonical key.
- UI-only renaming is insufficient and prohibited for identity corrections.

## Rejected
- Page-level alias handling.
- Counting raw display names as separate brands.