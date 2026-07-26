# Issue #141 immutable acceptance contract — test-only provenance

This directory is a byte-for-byte copy of the externally-supplied, immutable
acceptance artifact accepted for Issue #141 / #134 / #170. It exists only to
give CI a reproducible, checksum-verified source for schema and fixture
validation — it is **not** a production runtime dependency and nothing under
`src/` imports from this path.

```text
Source Issue:            #141
Acceptance comment:       https://github.com/koptelov-vk/tenant-mix-dashboard/issues/141#issuecomment-5074664651
Original artifact file:   issue-141-immutable-fixtures-final-correction.zip
Original artifact SHA-256: bb94c627bd27fd8aa83b6a3ca9763af17e2c36dfec82ebaab27eba0067912ebf
Artifact ID (manifest.json): TMA-141-IMMUTABLE-FIXTURES-CORRECTED
Committed on:             2026-07-26, as part of PR #171 (Issue #170)
```

## Integrity

Every file in this directory except `manifest.json`, `SHA256SUMS`, and
`validation-result.json` (the package's own three self-referential control
files, per `manifest.json`'s `integrityExclusions`) has a recorded SHA-256 in
`manifest.json`'s `fileSha256` map and in `SHA256SUMS`. `src/lib/categoryBenchmarkSchema.test.ts`
recomputes and asserts every one of those 143 checksums on every CI run —
any accidental or intentional edit to a file under this directory fails CI
immediately (`schema drift` / `checksum mismatch`).

## Do not modify

Files here are an immutable external acceptance contract, not source code.
Do not hand-edit them. If the artifact itself needs correction, that must
happen via a new accepted artifact on Issue #141, re-verified and re-committed
here as a whole, with this file's SHA-256/provenance updated accordingly.
