# Acceptance mapping

| Owner requirement | Artifact evidence |
|---|---|
| Canonical `above|below|equal|unavailable` before rounding | canonical schema + semantic validator |
| Raw equality is exact; no tolerance | `validate-semantics.py` and manifest scope |
| Share Option A below `0.05` p.p. | S001, F142_017, S005, S008 |
| Exact `±0.05` and floating neighbors | S003-S008 |
| Signed zero normalization | S012 and C006 |
| Count integer/half-step invariant | C001-C007 and N172_009 |
| F142_017 disposition | `F142_017.json` and semantic assertions |
| No consumer direction inference | empty consumer calculations + N172_001 |
| No parallel relation source or second payload | N172_007 and N172_008 |
| Surface parity | duplicated exact projection checked for applicable surfaces |
| No production conformance claim | every positive fixture records `false` |
| Immutable integrity | manifest, SHA256SUMS, checksum and ZIP validators |

Owner decision comment: `5085245278`.
Production baseline: `9dc471e28c567f41c81853843f6b417ae6bb6ce6`.
