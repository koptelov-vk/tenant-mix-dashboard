# Issue #141 corrected immutable fixture package

Local specification artifact only. It contains no implementation, browser, accessibility, deployment, production, or repository evidence.

Run `python verify_package.py`. A valid package exits 0 and regenerates `validation-result.json`.
Negative fixtures are executable mutations whose rejection is required.
The integrity control excludes its three self-referential control files: `manifest.json`, `SHA256SUMS`, and generated `validation-result.json`.
