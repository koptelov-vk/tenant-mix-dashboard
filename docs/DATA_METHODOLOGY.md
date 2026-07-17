# Data Methodology

## Core entities
- Source row: one observed tenant/brand record in one object.
- Normalized brand: canonical `brandNormalized` used for counts and set operations.
- Object presence: one normalized brand in one object.

## Counts
- Object brand count = distinct normalized brands in the current analysis slice.
- Category count = distinct normalized brands inside object + category.
- Raw row count must not be used as a brand count.

## Comparison group
- The focus object is displayed with the comparison group but excluded from comparison-group medians.
- Manual object selection creates a custom comparison group.
- If the focus object does not match preset criteria, it remains visible with a warning and stays outside the median.

## Median and rank
- Median uses only comparison-group objects.
- Rank may display the focus object among the visible comparison objects; the UI must describe the scope.
- Quantity, share and density are separate metrics and must never be compared against one another.

## Area metrics
- GLA and GBA are separate fields.
- GBA is never substituted for GLA.
- Density = distinct brands / confirmed GLA × 10,000.
- Missing or unconfirmed GLA produces `null` / `н/д` and is excluded from density medians.

## Uniqueness
- Global unique: brand appears in one object across the full database.
- Group unique: brand appears in one object in the current comparison scope.
- Focus exclusive: brand appears in the focus object and no selected comparison object.
- Intersecting: focus brand appears in at least one selected comparison object.

## Similarity
Jaccard: intersection of normalized brand sets divided by their union. It represents tenant-set similarity only, not full commercial comparability.

## Gap analysis
A gap brand is absent from the focus object and present in at least N comparison objects with a qualifying source. It is a market-presence signal, not a leasing recommendation.

## Sources
Store source type, URL, quality and actual verification date. Missing verification dates remain null and must not be replaced with snapshot date.

## Required contract checks
- no empty normalized brands;
- no duplicate object + normalized-brand presence after aggregation;
- GLA and GBA remain separate;
- category counts match distinct-brand calculation;
- focus object does not affect comparison median;
- brand aliases are applied before all aggregates.