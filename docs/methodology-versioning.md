# Methodology versioning

The canonical methodology identifier is stored only in `config/methodology.json`.

Current contract ID: `tenant-mix-active-only-v1`.

A stable contract ID is used instead of application SemVer because it identifies analytical rules, not an app release. Data refreshes, snapshot dates, UI changes and deployment SHAs do not change the methodology contract.

## Version bump

Bump the terminal version only when the analytical contract changes, including statuses used in primary aggregates, normalization rules that change tenant sets, or exclusivity, potential-brand, intersection, union or Jaccard semantics.

Do not bump for source-data refreshes, snapshot-date changes, UI/export/accessibility changes, or CI/deployment changes.

A methodology change and its bump must be reviewed in the same atomic PR. `meta.methodology` remains human-readable description and is not a version.

Canonical chain:

`config/methodology.json -> aggregate metadata -> build-info.json / audit output -> artifact validation -> production artifact`
