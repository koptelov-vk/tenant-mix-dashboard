from __future__ import annotations

import json
import sys

sys.dont_write_bytecode = True

from common import ROOT, SURFACES, load


REQUIRED_POSITIVE_CASES = {
    "share_positive_sub_precision",
    "share_negative_sub_precision",
    "share_exact_positive_0_05",
    "share_exact_negative_0_05",
    "share_neighbor_below_positive_0_05",
    "share_neighbor_above_positive_0_05",
    "share_neighbor_below_negative_0_05",
    "share_neighbor_above_negative_0_05",
    "share_ordinary_positive",
    "share_ordinary_negative",
    "share_exact_zero",
    "share_signed_zero_normalization",
    "share_null",
    "share_no_data",
    "share_no_peers",
    "share_conflicting",
    "share_quality_excluded",
    "count_positive_integer",
    "count_negative_integer",
    "count_positive_half_step",
    "count_negative_half_step",
    "count_exact_zero",
    "count_signed_zero_normalization",
    "count_nonzero_never_displays_zero",
}

REQUIRED_NEGATIVE_CODES = {
    "CONSUMER_DERIVED_COMPARISON_STATE",
    "VISIBLE_EQUAL_RAW_NONZERO",
    "VISIBLE_ACCESSIBILITY_DIRECTION_MISMATCH",
    "DISPLAY_NEGATIVE_ZERO",
    "NEUTRAL_GLYPH_NON_NEUTRAL",
    "MISSING_COMPARISON_STATE",
    "PARALLEL_UI_ONLY_RELATION_SOURCE",
    "SECOND_CANONICAL_PAYLOAD",
    "COUNT_IMPOSSIBLE_SUB_HALF",
}


def main() -> int:
    manifest = load(ROOT / "manifest.json")
    positives = [
        load(path)
        for path in sorted((ROOT / "fixtures" / "positive").glob("*.json"))
    ]
    negatives = [
        load(path)
        for path in sorted((ROOT / "fixtures" / "negative").glob("*.json"))
    ]
    errors = []
    ids = [fixture["fixtureId"] for fixture in positives + negatives]
    if len(ids) != len(set(ids)):
        errors.append("duplicate fixture IDs")
    cases = {fixture["caseKey"] for fixture in positives}
    if cases != REQUIRED_POSITIVE_CASES:
        errors.append(
            f"positive case mismatch missing={sorted(REQUIRED_POSITIVE_CASES-cases)} "
            f"extra={sorted(cases-REQUIRED_POSITIVE_CASES)}"
        )
    codes = {fixture["expectedRejectionCode"] for fixture in negatives}
    if codes != REQUIRED_NEGATIVE_CODES:
        errors.append(
            f"negative code mismatch missing={sorted(REQUIRED_NEGATIVE_CODES-codes)} "
            f"extra={sorted(codes-REQUIRED_NEGATIVE_CODES)}"
        )
    for fixture in positives:
        if set(fixture["expectedSurfaces"]) != set(SURFACES):
            errors.append(f"{fixture['fixtureId']}: surface set")
        if (
            fixture["canonicalPayload"]["provenance"]["sourceFixtureId"]
            != fixture["fixtureId"]
        ):
            errors.append(f"{fixture['fixtureId']}: provenance")
        if fixture["expectedExportProjection"]["fixtureId"] != fixture["fixtureId"]:
            errors.append(f"{fixture['fixtureId']}: export fixture ID")
        if fixture["implementationEvidenceAvailable"] is not False:
            errors.append(f"{fixture['fixtureId']}: implementation evidence claim")
        if fixture["productionConformanceClaimed"] is not False:
            errors.append(f"{fixture['fixtureId']}: production claim")

    expected_counts = {
        "fixtureCount": len(positives) + len(negatives),
        "positiveFixtureCount": len(positives),
        "negativeFixtureCount": len(negatives),
        "schemaCount": len(list((ROOT / "schemas").glob("*.json"))),
    }
    for key, actual in expected_counts.items():
        if manifest.get(key) != actual:
            errors.append(f"manifest {key}: {manifest.get(key)} != {actual}")

    result = {
        **expected_counts,
        "positiveCaseMatrixComplete": cases == REQUIRED_POSITIVE_CASES,
        "negativeCaseMatrixComplete": codes == REQUIRED_NEGATIVE_CODES,
        "errors": errors,
        "status": "PASS" if not errors else "FAIL",
    }
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
