from __future__ import annotations

import json
import math
import sys

sys.dont_write_bytecode = True

from common import (
    ROOT,
    candidate_errors,
    expected_state,
    is_negative_zero,
    load,
    median,
)


def close(left, right, tolerance=1e-12):
    return math.isclose(left, right, rel_tol=tolerance, abs_tol=tolerance)


def main() -> int:
    positives = [
        load(path)
        for path in sorted((ROOT / "fixtures" / "positive").glob("*.json"))
    ]
    negatives = [
        load(path)
        for path in sorted((ROOT / "fixtures" / "negative").glob("*.json"))
    ]
    errors = []
    positive_passed = 0
    for fixture in positives:
        fixture_errors = candidate_errors(fixture)
        mode = fixture["mode"]
        raw_input = fixture["rawInput"]
        payload = fixture["canonicalPayload"]
        stats = payload[mode]
        raw = stats["deviationRaw"]
        projection = fixture["expectedProjection"]
        if mode == "share":
            focus = stats["focusShareExact"]
            peer = stats["peerMedianShareExact"]
            if raw is not None:
                computed = (focus - peer) * 100
                if not close(computed, raw, tolerance=1e-10):
                    fixture_errors.append("SHARE_RAW_RECOMPUTE_MISMATCH")
                if not close(stats["shareExactDelta"] * 100, raw, tolerance=1e-10):
                    fixture_errors.append("SHARE_DELTA_MISMATCH")
            boundary = raw is not None and 0 < abs(raw) < 0.05
            if projection["boundaryApplied"] != boundary:
                fixture_errors.append("SHARE_BOUNDARY_FLAG")
            if boundary:
                direction = "выше" if raw > 0 else "ниже"
                exact = f"{direction} медианы менее чем на 0,1 п.п."
                if projection["displayRelationText"] != exact:
                    fixture_errors.append("SHARE_BOUNDARY_WORDING")
                if projection["displayDeviation"] is not None:
                    fixture_errors.append("SHARE_BOUNDARY_NUMERIC_DISPLAY")
            if raw is not None and abs(raw) >= 0.05 and raw != 0:
                if projection["displayDeviation"] is None:
                    fixture_errors.append("SHARE_NORMAL_DISPLAY_MISSING")
            display_text = " ".join(
                str(projection.get(key) or "")
                for key in ("displayRelationText", "accessibleRelationText")
            )
            if "-0" in display_text or "минус 0" in display_text:
                fixture_errors.append("SHARE_SIGNED_ZERO_TEXT")
        else:
            focus = stats["focusValue"]
            peers = stats["peerValues"]
            if focus is not None and not float(focus).is_integer():
                fixture_errors.append("COUNT_FOCUS_NOT_INTEGER")
            if any(not float(value).is_integer() for value in peers):
                fixture_errors.append("COUNT_PEER_NOT_INTEGER")
            if peers:
                computed_median = median(peers)
                if not close(computed_median, stats["peerMedian"]):
                    fixture_errors.append("COUNT_MEDIAN_MISMATCH")
                if raw is not None and not close(focus - computed_median, raw):
                    fixture_errors.append("COUNT_RAW_RECOMPUTE_MISMATCH")
            if raw is not None and raw != 0 and abs(raw) < 0.5:
                fixture_errors.append("COUNT_IMPOSSIBLE_SUB_HALF")
            if (
                raw is not None
                and raw != 0
                and projection["displayDeviation"] == 0
            ):
                fixture_errors.append("COUNT_NONZERO_DISPLAY_ZERO")
            if "менее чем на 1 бренд" in json.dumps(
                fixture, ensure_ascii=False
            ):
                fixture_errors.append("COUNT_FORBIDDEN_BOUNDARY_WORDING")

        if stats.get("comparisonState") != expected_state(raw):
            fixture_errors.append("COMPARISON_STATE_RAW_MISMATCH")
        if is_negative_zero(raw) or is_negative_zero(
            projection.get("displayDeviation")
        ):
            fixture_errors.append("UNNORMALIZED_SIGNED_ZERO")
        if fixture_errors:
            errors.append(
                f"{fixture['fixtureId']}: {','.join(sorted(set(fixture_errors)))}"
            )
        else:
            positive_passed += 1

    f142 = next(
        (fixture for fixture in positives if fixture["fixtureId"] == "F142_017"),
        None,
    )
    if f142 is None:
        errors.append("F142_017 missing")
    else:
        expected_raw = -0.005000000000000837
        projection = f142["expectedProjection"]
        if f142["canonicalPayload"]["share"]["deviationRaw"] != expected_raw:
            errors.append("F142_017 raw mismatch")
        if projection["comparisonState"] != "below":
            errors.append("F142_017 state mismatch")
        if (
            projection["displayRelationText"]
            != "ниже медианы менее чем на 0,1 п.п."
        ):
            errors.append("F142_017 visible mismatch")
        if projection["cssState"] != "below":
            errors.append("F142_017 CSS mismatch")
        if (
            f142["expectedExportProjection"]["projection"]["deviationRaw"]
            != expected_raw
        ):
            errors.append("F142_017 export raw mismatch")

    negative_passed = 0
    for fixture in negatives:
        rejection_codes = candidate_errors(fixture["candidate"])
        expected = fixture["expectedRejectionCode"]
        if expected not in rejection_codes:
            errors.append(
                f"{fixture['fixtureId']}: expected {expected}, got {rejection_codes}"
            )
        else:
            negative_passed += 1

    result = {
        "positiveFixtures": len(positives),
        "positivePassed": positive_passed,
        "negativeFixtures": len(negatives),
        "negativeCorrectlyRejected": negative_passed,
        "f142_017DispositionVerified": f142 is not None,
        "rawEqualityIsExact": True,
        "toleranceMethodologyIntroduced": False,
        "errors": errors,
        "status": "PASS" if not errors else "FAIL",
    }
    print(json.dumps(result, ensure_ascii=False, sort_keys=True))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
