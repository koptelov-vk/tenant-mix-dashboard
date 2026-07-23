# Production build-info contract

`dist/build-info.json` is generated inside the canonical Vite production build. The build copies the exact aggregate bytes that it identifies; no deployment or post-build step patches the file.

| field | meaning | source of truth | producer | validation | example |
|---|---|---|---|---|---|
| `status` | Artifact type | Build contract constant | Vite build-info plugin | Must equal `production` | `production` |
| `build` | Exact application code identity | `GITHUB_SHA`; `VITE_BUILD_SHA` or a `local-*` identity outside GitHub | Vite build-info plugin | Must equal `GITHUB_SHA` in GitHub | `76cc590303e61b6c7dddca08476198c85f707787` |
| `generatedAt` | Time when the artifact was generated | Build clock | Vite build-info plugin | Valid date-time | `2026-07-22T21:47:29.701Z` |
| `app` | Stable application identifier | Build contract constant | Vite build-info plugin | Must equal `tenant-mix-react` | `tenant-mix-react` |
| `appVersion` | Application release version | `package.json.version` | Vite build-info plugin | Valid SemVer and exact match with `package.json` | `3.0.0-alpha.1` |
| `dataVersion` | Content identity of the exact published aggregate | SHA-256 of the copied `data/aggregates/dashboard_data.json` bytes | Vite build-info plugin | `sha256-` plus 64 lowercase hex characters; digest must match artifact data | `sha256-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef` |
| `dataSnapshotAt` | Date through which the published data snapshot is current | `data/aggregates/dashboard_data.json.meta.snapshotDate`, generated from `data/snapshot_manifest.json` | Aggregate pipeline, then Vite build-info plugin | Valid `YYYY-MM-DD` calendar date and exact aggregate match | `2026-07-16` |
| `methodologyVersion` | Analytical contract identity | Aggregate `meta.methodologyVersion`, originating in `config/methodology.json` | Aggregate pipeline, then Vite build-info plugin | Non-empty and exact aggregate match | `tenant-mix-active-only-v1` |
| `classifierVersion` | Classifier contract identity | `config/classifier.json.classifierVersion` | Vite build-info plugin | Non-empty and exact config match | `tenant-mix-classifier-v1` |
| `deploymentId` | Concrete deployment workflow/run | `GITHUB_RUN_ID`; `local` only without `GITHUB_SHA` | Vite build-info plugin | Non-empty; must equal `GITHUB_RUN_ID`; `local` forbidden with `GITHUB_SHA` | `29960232729` |

`generatedAt` is artifact-generation time. `dataSnapshotAt` is data currency and is never inferred from build or deployment time. `build` identifies code, while `dataVersion` identifies the exact published aggregate bytes. `appVersion` identifies the application release. `deploymentId` identifies the deployment workflow/run.

All ten fields are mandatory. A missing, empty, malformed or source-mismatched value is a hard build or artifact-validation failure. Local, CI and deployment builds call the same generator. Production validation must additionally compare the published `build`, `deploymentId` and data digest with the active deployment evidence.
