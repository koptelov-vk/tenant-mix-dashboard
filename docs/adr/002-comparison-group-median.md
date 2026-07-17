# ADR-002: Comparison-Group Median

Status: Accepted

## Decision
The focus object is displayed alongside comparison objects but is excluded from the comparison-group median.

## Consequences
- Preset and custom comparison groups produce medians from competitors only.
- A focus object outside preset criteria remains visible with an explicit warning.
- User-facing methodology must say `Медиана группы сравнения без фокусного объекта`.

## Rejected
- Including the focus object in the median.
- Silent inclusion when the focus object does not match comparison criteria.