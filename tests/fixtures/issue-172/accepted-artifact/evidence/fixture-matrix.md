# Issue #172 fixture matrix

        This matrix is specification evidence only. It does not claim production
        implementation, CI, deployment, or production acceptance.

        ## Positive fixtures

        | Fixture | Case | Mode | Expected state |
        |---|---|---|---|
        | `F172_S001_positive_sub_precision` | `share_positive_sub_precision` | `share` | `above` |
| `F142_017` | `share_negative_sub_precision` | `share` | `below` |
| `F172_S003_exact_positive_0_05` | `share_exact_positive_0_05` | `share` | `above` |
| `F172_S004_exact_negative_0_05` | `share_exact_negative_0_05` | `share` | `below` |
| `F172_S005_neighbor_below_positive_0_05` | `share_neighbor_below_positive_0_05` | `share` | `above` |
| `F172_S006_neighbor_above_positive_0_05` | `share_neighbor_above_positive_0_05` | `share` | `above` |
| `F172_S007_neighbor_below_negative_0_05` | `share_neighbor_below_negative_0_05` | `share` | `below` |
| `F172_S008_neighbor_above_negative_0_05` | `share_neighbor_above_negative_0_05` | `share` | `below` |
| `F172_S009_ordinary_positive` | `share_ordinary_positive` | `share` | `above` |
| `F172_S010_ordinary_negative` | `share_ordinary_negative` | `share` | `below` |
| `F172_S011_exact_zero` | `share_exact_zero` | `share` | `equal` |
| `F172_S012_signed_zero_normalization` | `share_signed_zero_normalization` | `share` | `equal` |
| `F172_S013_null` | `share_null` | `share` | `unavailable` |
| `F172_S014_no_data` | `share_no_data` | `share` | `unavailable` |
| `F172_S015_no_peers` | `share_no_peers` | `share` | `unavailable` |
| `F172_S016_conflicting` | `share_conflicting` | `share` | `unavailable` |
| `F172_S017_quality_excluded` | `share_quality_excluded` | `share` | `unavailable` |
| `F172_C001_positive_integer` | `count_positive_integer` | `count` | `above` |
| `F172_C002_negative_integer` | `count_negative_integer` | `count` | `below` |
| `F172_C003_positive_half_step` | `count_positive_half_step` | `count` | `above` |
| `F172_C004_negative_half_step` | `count_negative_half_step` | `count` | `below` |
| `F172_C005_exact_zero` | `count_exact_zero` | `count` | `equal` |
| `F172_C006_signed_zero_normalization` | `count_signed_zero_normalization` | `count` | `equal` |
| `F172_C007_nonzero_never_displays_zero` | `count_nonzero_never_displays_zero` | `count` | `below` |

        ## Negative fixtures

        | Fixture | Required rejection | Base |
        |---|---|---|
        | `N172_001_consumer_derived_comparison_state` | `CONSUMER_DERIVED_COMPARISON_STATE` | `F172_S001_positive_sub_precision` |
| `N172_002_visible_equal_raw_nonzero` | `VISIBLE_EQUAL_RAW_NONZERO` | `F172_S001_positive_sub_precision` |
| `N172_003_accessible_below_visible_equal` | `VISIBLE_ACCESSIBILITY_DIRECTION_MISMATCH` | `F142_017` |
| `N172_004_display_negative_zero` | `DISPLAY_NEGATIVE_ZERO` | `F172_S003_exact_positive_0_05` |
| `N172_005_neutral_glyph_non_neutral` | `NEUTRAL_GLYPH_NON_NEUTRAL` | `F172_S009_ordinary_positive` |
| `N172_006_missing_comparison_state` | `MISSING_COMPARISON_STATE` | `F172_S009_ordinary_positive` |
| `N172_007_parallel_ui_relation_source` | `PARALLEL_UI_ONLY_RELATION_SOURCE` | `F172_S009_ordinary_positive` |
| `N172_008_second_canonical_payload` | `SECOND_CANONICAL_PAYLOAD` | `F172_S009_ordinary_positive` |
| `N172_009_count_impossible_sub_half` | `COUNT_IMPOSSIBLE_SUB_HALF` | `F172_C003_positive_half_step` |

        ## Surface applicability

        `desktop`, `mobile`, `accessibility`, `css`, and `pdf` must consume the
        exact same projection with `consumerCalculations=[]`.

        `csv` and `xlsx` are explicitly `not_applicable` on baseline
        `9dc471e28c567f41c81853843f6b417ae6bb6ce6` because no dedicated category-benchmark CSV/XLSX surface
        exists. The package does not create or claim such a surface.
