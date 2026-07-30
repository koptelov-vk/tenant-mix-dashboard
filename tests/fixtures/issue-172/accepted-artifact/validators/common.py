from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SURFACES = ("desktop", "mobile", "accessibility", "css", "pdf", "csv", "xlsx")
APPLICABLE_SURFACES = ("desktop", "mobile", "accessibility", "css", "pdf")


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def canonical_json_bytes(value):
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def expected_state(value):
    if value is None:
        return "unavailable"
    if value > 0:
        return "above"
    if value < 0:
        return "below"
    return "equal"


def is_negative_zero(value) -> bool:
    return (
        isinstance(value, (int, float))
        and value == 0
        and math.copysign(1.0, float(value)) < 0
    )


def median(values):
    values = sorted(values)
    if not values:
        return None
    middle = len(values) // 2
    return (
        values[middle]
        if len(values) % 2
        else (values[middle - 1] + values[middle]) / 2
    )


def text_state(text):
    if text is None:
        return None
    lowered = text.lower()
    if "выше" in lowered:
        return "above"
    if "ниже" in lowered:
        return "below"
    if "уровне" in lowered:
        return "equal"
    if "недоступ" in lowered:
        return "unavailable"
    return None


def candidate_errors(candidate):
    errors = []
    if "parallelUiRelationSource" in candidate:
        errors.append("PARALLEL_UI_ONLY_RELATION_SOURCE")
    if "secondCanonicalPayload" in candidate:
        errors.append("SECOND_CANONICAL_PAYLOAD")
    if candidate.get("productionConformanceClaimed") is not False:
        errors.append("PRODUCTION_CONFORMANCE_CLAIM")

    mode = candidate.get("mode")
    payload = candidate.get("canonicalPayload", {})
    stats = payload.get(mode, {}) if mode in ("count", "share") else {}
    projection = candidate.get("expectedProjection", {})
    raw = stats.get("deviationRaw")
    canonical_state = stats.get("comparisonState")
    projection_state = projection.get("comparisonState")
    wanted = expected_state(raw)

    if "comparisonState" not in stats or "comparisonState" not in projection:
        errors.append("MISSING_COMPARISON_STATE")
    elif canonical_state != wanted or projection_state != wanted:
        errors.append("COMPARISON_STATE_RAW_MISMATCH")

    if projection.get("consumerCalculations"):
        errors.append("CONSUMER_DERIVED_COMPARISON_STATE")

    visible_state = text_state(projection.get("displayRelationText"))
    accessible_state = text_state(projection.get("accessibleRelationText"))
    if raw is not None and raw != 0 and visible_state == "equal":
        errors.append("VISIBLE_EQUAL_RAW_NONZERO")
    if (
        visible_state is not None
        and accessible_state is not None
        and visible_state != accessible_state
    ):
        errors.append("VISIBLE_ACCESSIBILITY_DIRECTION_MISMATCH")

    if is_negative_zero(projection.get("displayDeviation")):
        errors.append("DISPLAY_NEGATIVE_ZERO")
    if wanted in ("above", "below") and projection.get("glyph") == "●":
        errors.append("NEUTRAL_GLYPH_NON_NEUTRAL")
    if projection.get("cssState") != projection_state:
        errors.append("CSS_STATE_MISMATCH")

    if mode == "count" and raw is not None and raw != 0 and abs(raw) < 0.5:
        errors.append("COUNT_IMPOSSIBLE_SUB_HALF")

    surfaces = candidate.get("expectedSurfaces", {})
    for surface in APPLICABLE_SURFACES:
        record = surfaces.get(surface, {})
        if record.get("applicable") is not True:
            errors.append("SURFACE_APPLICABILITY_MISMATCH")
            continue
        if record.get("consumerCalculations"):
            errors.append("CONSUMER_DERIVED_COMPARISON_STATE")
        if record.get("projection") != projection:
            errors.append("SURFACE_PARITY_MISMATCH")
    for surface in ("csv", "xlsx"):
        record = surfaces.get(surface, {})
        if record.get("applicable") is not False:
            errors.append("UNAPPROVED_EXPORT_SURFACE")
        if record.get("projection") is not None:
            errors.append("UNAPPROVED_EXPORT_PROJECTION")

    export = candidate.get("expectedExportProjection", {})
    if export.get("projection") != projection:
        errors.append("EXPORT_PARITY_MISMATCH")
    return sorted(set(errors))
