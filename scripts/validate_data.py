from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import urlparse

import pandas as pd
from pydantic import BaseModel, ConfigDict, field_validator

from build_aggregates import AREA_CSV, BASE_CSV, CATEGORIES, AGGREGATES, CITY_ALIASES, prepare_rows, text


class TenantRow(BaseModel):
    model_config = ConfigDict(extra="allow")
    mall: str
    brand: str
    normalized: str
    category: str
    source_url: str = ""

    @field_validator("mall", "brand", "normalized")
    @classmethod
    def required_text(cls, value: str) -> str:
        if not text(value):
            raise ValueError("required value is empty")
        return text(value)

    @field_validator("category")
    @classmethod
    def valid_category(cls, value: str) -> str:
        if value not in CATEGORIES:
            raise ValueError(f"unsupported category: {value}")
        return value

    @field_validator("source_url")
    @classmethod
    def valid_url(cls, value: str) -> str:
        if value and urlparse(value).scheme not in {"http", "https"}:
            raise ValueError(f"invalid URL: {value}")
        return value


def main() -> None:
    base = pd.read_csv(BASE_CSV).fillna("")
    areas = pd.read_csv(AREA_CSV).fillna("")
    errors: list[str] = []
    for index, row in base.iterrows():
        try:
            TenantRow(
                mall=row["ТЦ/ТРК"], brand=row["Арендатор / бренд"],
                normalized=row["brand_normalized"], category=row["Категория итоговая"],
                source_url=row["Источник URL"],
            )
        except Exception as exc:
            errors.append(f"row {index + 2}: {exc}")

    normalized_rows = prepare_rows(base)
    normalized_pairs = [(row["mall"], row["brandNormalized"]) for row in normalized_rows]
    if len(normalized_pairs) != len(set(normalized_pairs)):
        errors.append("duplicate mall + normalized brand pairs remain after aliases")

    mall_set = set(base["ТЦ/ТРК"].astype(str))
    area_malls = set(areas["ТЦ/ТРК"].astype(str))
    missing_area_rows = sorted(mall_set - area_malls)
    if missing_area_rows:
        errors.append(f"malls missing from area reference: {missing_area_rows}")
    for _, row in areas.iterrows():
        try:
            gba = float(row["GBA"]) if text(row["GBA"]) else None
            gla = float(row["GLA"]) if text(row["GLA"]) else None
        except ValueError:
            errors.append(f"invalid area number for {row['ТЦ/ТРК']}")
            continue
        if gba is not None and gba <= 0:
            errors.append(f"non-positive GBA for {row['ТЦ/ТРК']}")
        if gla is not None and gla <= 0:
            errors.append(f"non-positive GLA for {row['ТЦ/ТРК']}")
        if gba and gla and gla > gba:
            errors.append(f"GLA exceeds GBA for {row['ТЦ/ТРК']}: {gla} > {gba}")
        if not text(row["Город"]):
            errors.append(f"city is empty for {row['ТЦ/ТРК']}")
        if text(row["Город"]) in CITY_ALIASES:
            errors.append(f"city alias remains in area reference for {row['ТЦ/ТРК']}: {row['Город']}")

    baseline_path = AGGREGATES / "catalog_baseline.json"
    current_counts = base.groupby("ТЦ/ТРК").size().astype(int).to_dict()
    if baseline_path.exists():
        baseline = json.loads(baseline_path.read_text(encoding="utf-8"))
        for mall, old_count in baseline.items():
            new_count = current_counts.get(mall, 0)
            if old_count and new_count < old_count * 0.9:
                errors.append(f"catalog shrank over 10% for {mall}: {old_count} -> {new_count}")
    else:
        AGGREGATES.mkdir(parents=True, exist_ok=True)
        baseline_path.write_text(json.dumps(current_counts, ensure_ascii=False, indent=2), encoding="utf-8")

    if errors:
        print("\n".join(errors[:100]))
        raise SystemExit(1)
    print(json.dumps({"rows": len(base), "malls": len(mall_set), "validated": True}, ensure_ascii=False))


if __name__ == "__main__":
    main()
