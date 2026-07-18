from __future__ import annotations

import json
import re
from collections import defaultdict

from build_aggregates import alias_key, build, canonical_brand, text, write_outputs


UPCOMING_STATUS_ALIASES = {
    "скоро открытие": "Скоро открытие",
    "скоро откроется": "Скоро открытие",
    "ожидается": "Скоро открытие",
    "ожидаем открытие": "Скоро открытие",
    "планируется": "Скоро открытие",
    "анонсировано": "Скоро открытие",
}


def brand_match_key(value: object) -> str:
    """Stable comparison key for active and upcoming brand names."""
    canonical = canonical_brand(value, value) or text(value)
    canonical = alias_key(canonical).replace("ё", "е")
    return re.sub(r"[^0-9a-zа-я]+", "", canonical)


def normalize_upcoming_status(value: object) -> str:
    source = alias_key(value)
    return UPCOMING_STATUS_ALIASES.get(source, text(value) or "Скоро открытие")


def clean_upcoming(payload: dict) -> dict:
    active_by_mall: dict[str, dict[str, list[str]]] = defaultdict(lambda: defaultdict(list))
    for row in payload.get("rows", []):
        mall = text(row.get("mall"))
        brand = text(row.get("brandNormalized") or row.get("brand"))
        key = brand_match_key(brand)
        if mall and key and brand not in active_by_mall[mall][key]:
            active_by_mall[mall][key].append(brand)

    retained: list[dict] = []
    excluded: list[dict] = []
    ambiguous: list[dict] = []
    normalized_statuses = 0

    for source in payload.get("upcoming", []):
        item = dict(source)
        original_status = text(item.get("status"))
        normalized_status = normalize_upcoming_status(original_status)
        item["status"] = normalized_status
        if normalized_status != original_status:
            normalized_statuses += 1

        mall = text(item.get("mall"))
        key = brand_match_key(item.get("brand"))
        matches = active_by_mall.get(mall, {}).get(key, []) if mall and key else []
        audit_row = {
            "mall": mall,
            "brand": text(item.get("brand")),
            "brandKey": key,
            "activeMatches": sorted(matches),
        }

        if len(matches) == 1:
            excluded.append({**audit_row, "reason": "already-active-in-mall"})
            continue
        if len(matches) > 1:
            ambiguous.append({**audit_row, "reason": "multiple-active-brand-matches"})
        retained.append(item)

    payload["upcoming"] = retained
    audit = {
        "sourceRows": len(payload.get("upcoming", [])) + len(excluded),
        "retainedRows": len(retained),
        "excludedAlreadyOpen": excluded,
        "ambiguousMatches": ambiguous,
        "normalizedStatuses": normalized_statuses,
    }
    payload["upcomingAudit"] = audit
    payload.setdefault("dataQuality", {})["upcoming"] = {
        "sourceRows": audit["sourceRows"],
        "retainedRows": audit["retainedRows"],
        "excludedAlreadyOpen": len(excluded),
        "ambiguousMatches": len(ambiguous),
        "normalizedStatuses": normalized_statuses,
    }
    return payload


def build_dashboard_data(snapshot: str | None = None) -> dict:
    return clean_upcoming(build(snapshot))


if __name__ == "__main__":
    result = build_dashboard_data()
    write_outputs(result)
    print(json.dumps(result["dataQuality"], ensure_ascii=False, indent=2))
