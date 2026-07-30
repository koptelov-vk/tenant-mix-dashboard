# Issue #172 immutable fixture artifact v2

Self-contained specification/test artifact for Issue #172.

It freezes the approved comparison-state, Share boundary, Count
invariant, F142_017 disposition, expected surface projections, negative
contracts, and integrity evidence. It does not implement or claim
production behavior.

## Validation

Requirements: Python 3.11+ and `jsonschema` 4.x.

Run from the artifact root:

```text
python validators/validate-schema.py
python validators/validate-fixtures.py
python validators/validate-semantics.py
python validators/validate-checksums.py
python validators/validate-package.py
```

Validate a packaged ZIP:

```text
python validators/validate-zip.py <zip-path> <report-path>
```

## Lifecycle

```text
ARTIFACT_TASK_AUTHORIZED
PRODUCTION_IMPLEMENTATION_NOT_AUTHORIZED
MERGE_NOT_AUTHORIZED
DEPLOYMENT_NOT_AUTHORIZED
ISSUE_CLOSURE_NOT_AUTHORIZED
```

Baseline: `9dc471e28c567f41c81853843f6b417ae6bb6ce6`.
