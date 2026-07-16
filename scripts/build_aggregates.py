from __future__ import annotations

import json
import math
import re
import statistics
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlparse

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
PROCESSED = ROOT / "data" / "processed"
AGGREGATES = ROOT / "data" / "aggregates"
BASE_CSV = PROCESSED / "База_финальная.csv"
AREA_CSV = PROCESSED / "mall_area_reference.csv"
UPCOMING_CSV = PROCESSED / "upcoming_openings.csv"
SNAPSHOT_DATE = "2026-07-16"

CATEGORIES = [
    "Одежда", "Обувь", "Нижнее белье", "Аксессуары, сумки и ювелирные изделия",
    "Детские товары", "Красота и здоровье", "Электроника, техника и связь",
    "Товары для дома, мебель и интерьер", "Продукты и супермаркеты",
    "Кафе и рестораны", "Развлечения и досуг", "Спорт и фитнес",
    "Спортивные товары", "Услуги", "Финансовые услуги",
    "ПВЗ и интернет-сервисы", "Автотовары и автоуслуги", "Зоотовары",
    "Табак и вейп", "Товары 18+", "Прочее",
]


def text(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "").replace("\xa0", " ")).strip()


def number(value: object) -> float | None:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    return parsed if math.isfinite(parsed) and parsed > 0 else None


def extract_date(*values: object) -> str:
    for value in values:
        match = re.search(r"20\d{2}[-.]\d{2}[-.]\d{2}", text(value))
        if match:
            return match.group(0).replace(".", "-")
    return SNAPSHOT_DATE


def source_quality(source: str, confirmation: str, manual: bool) -> str:
    value = f"{source} {confirmation}".casefold()
    if manual or "проверить" in value:
        return "Низкая"
    if "официаль" in value or confirmation.strip().upper() == "OK":
        return "Высокая"
    if any(token in value for token in ("2гис", "яндекс", "агрегатор", "gipernn")):
        return "Средняя"
    return "Средняя"


def mall_class(gba: float | None) -> str:
    if gba is None:
        return "Нет данных"
    if gba < 50_000:
        return "Районный"
    if gba < 120_000:
        return "Региональный"
    return "Суперрегиональный"


def median(values: list[float]) -> float | None:
    return float(statistics.median(values)) if values else None


def prepare_rows(frame: pd.DataFrame) -> list[dict]:
    rows: list[dict] = []
    for item in frame.fillna("").to_dict("records"):
        manual = text(item.get("Требует ручной проверки")).casefold() in {"true", "1", "да"}
        source = text(item.get("Источник"))
        confirmation = text(item.get("Статус подтверждения"))
        rows.append({
            "mall": text(item.get("ТЦ/ТРК")),
            "brand": text(item.get("Арендатор / бренд")),
            "brandNormalized": text(item.get("brand_normalized")),
            "category": text(item.get("Категория итоговая")),
            "sourceType": source,
            "sourceUrl": text(item.get("Источник URL")),
            "rowStatus": text(item.get("Статус строки")),
            "confirmation": confirmation,
            "categoryBasis": text(item.get("Основание категории")),
            "manualReview": manual,
            "sourceQuality": source_quality(source, confirmation, manual),
            "checkedAt": extract_date(confirmation, item.get("Комментарий аудитора")),
            "originalCategory": text(item.get("Категория 2ГИС/Яндекс")),
        })
    return rows


def build() -> dict:
    base = pd.read_csv(BASE_CSV).fillna("")
    areas = pd.read_csv(AREA_CSV).fillna("")
    upcoming = pd.read_csv(UPCOMING_CSV).fillna("")
    rows = prepare_rows(base)

    area_by_mall: dict[str, dict] = {}
    for item in areas.to_dict("records"):
        mall = text(item.get("ТЦ/ТРК"))
        gba = number(item.get("GBA"))
        gla = number(item.get("GLA"))
        reliability = text(item.get("Надежность"))
        area_by_mall[mall] = {
            "mall": mall,
            "city": text(item.get("Город")),
            "gba": gba,
            "gla": gla,
            "glaConfirmed": bool(gla and reliability.casefold() in {"высокая", "средняя"}),
            "areaSource": text(item.get("Источник площади")),
            "areaStatus": text(item.get("Статус площади")),
            "areaReliability": reliability or "Нет данных",
            "mallClass": mall_class(gba),
        }

    brands_by_mall: dict[str, set[str]] = defaultdict(set)
    category_by_mall: dict[str, Counter] = defaultdict(Counter)
    display_by_brand: dict[str, str] = {}
    category_by_brand: dict[str, str] = {}
    sources_by_brand: dict[str, list[dict]] = defaultdict(list)
    presence: dict[str, set[str]] = defaultdict(set)
    for row in rows:
        mall, brand = row["mall"], row["brandNormalized"]
        brands_by_mall[mall].add(brand)
        category_by_mall[mall][row["category"]] += 1
        presence[brand].add(mall)
        display_by_brand.setdefault(brand, row["brand"])
        category_by_brand.setdefault(brand, row["category"])
        source_entry = {
            "mall": mall, "url": row["sourceUrl"], "type": row["sourceType"],
            "quality": row["sourceQuality"], "checkedAt": row["checkedAt"],
        }
        if source_entry not in sources_by_brand[brand]:
            sources_by_brand[brand].append(source_entry)

    malls = sorted(brands_by_mall)
    mall_summary: list[dict] = []
    for mall in malls:
        area = area_by_mall.get(mall, {"mall": mall, "city": "", "gba": None, "gla": None, "glaConfirmed": False, "mallClass": "Нет данных", "areaReliability": "Нет данных", "areaSource": "", "areaStatus": ""})
        brands = brands_by_mall[mall]
        unique_global = sum(len(presence[brand]) == 1 for brand in brands)
        gla = area.get("gla") if area.get("glaConfirmed") else None
        mall_summary.append({
            **area,
            "brandCount": len(brands),
            "categoryCount": sum(value > 0 for value in category_by_mall[mall].values()),
            "uniqueGlobalCount": unique_global,
            "uniqueGlobalShare": unique_global / len(brands) if brands else 0,
            "brandDensity10kGla": len(brands) / gla * 10_000 if gla else None,
            "categoryCounts": {category: int(category_by_mall[mall].get(category, 0)) for category in CATEGORIES},
        })

    category_matrix = {
        "categories": CATEGORIES,
        "malls": malls,
        "counts": {mall: {category: int(category_by_mall[mall].get(category, 0)) for category in CATEGORIES} for mall in malls},
    }

    brand_presence = {
        brand: {
            "brand": display_by_brand[brand],
            "brandNormalized": brand,
            "category": category_by_brand[brand],
            "malls": sorted(mall_set),
            "mallCount": len(mall_set),
            "sources": sources_by_brand[brand],
        }
        for brand, mall_set in presence.items()
    }

    similarities: list[dict] = []
    for mall_a in malls:
        set_a = brands_by_mall[mall_a]
        for mall_b in malls:
            if mall_a == mall_b:
                continue
            set_b = brands_by_mall[mall_b]
            common = len(set_a & set_b)
            union = len(set_a | set_b)
            similarities.append({
                "focus": mall_a,
                "mall": mall_b,
                "jaccard": common / union if union else 0,
                "common": common,
                "focusOnly": len(set_a - set_b),
                "competitorOnly": len(set_b - set_a),
            })

    gaps: dict[str, list[str]] = {}
    for focus in malls:
        focus_brands = brands_by_mall[focus]
        candidates: list[tuple[str, int, str]] = []
        for brand, mall_set in presence.items():
            if brand in focus_brands:
                continue
            quality_sources = [source for source in sources_by_brand[brand] if source["quality"] in {"Высокая", "Средняя"} and source["url"]]
            if not quality_sources:
                continue
            candidates.append((brand, len(mall_set), display_by_brand[brand]))
        gaps[focus] = [brand for brand, _, _ in sorted(candidates, key=lambda item: (-item[1], item[2].casefold()))]

    upcoming_rows = []
    for item in upcoming.to_dict("records"):
        upcoming_rows.append({
            "mall": text(item.get("ТЦ/ТРК")), "brand": text(item.get("Бренд")),
            "category": text(item.get("Категория")), "status": text(item.get("Статус")),
            "basis": text(item.get("Основание")), "announcementDate": text(item.get("Дата анонса")),
            "plannedDate": text(item.get("Плановая дата")), "sourceUrl": text(item.get("Источник URL")),
            "checkedAt": text(item.get("Проверено")), "reliability": text(item.get("Надежность")),
            "comment": text(item.get("Комментарий")),
        })

    invalid_urls = [row["sourceUrl"] for row in rows if row["sourceUrl"] and urlparse(row["sourceUrl"]).scheme not in {"http", "https"}]
    quality = {
        "snapshotDate": SNAPSHOT_DATE,
        "rows": len(rows), "malls": len(malls), "brands": len(presence),
        "emptyBrands": sum(not row["brand"] for row in rows),
        "emptyNormalizedBrands": sum(not row["brandNormalized"] for row in rows),
        "duplicateMallBrandPairs": int(base.duplicated(["ТЦ/ТРК", "brand_normalized"]).sum()),
        "invalidUrls": len(invalid_urls),
        "mallsWithoutGla": sum(not area_by_mall.get(mall, {}).get("glaConfirmed") for mall in malls),
        "manualReviewRows": sum(row["manualReview"] for row in rows),
    }

    return {
        "meta": {"version": "2.0", "snapshotDate": SNAPSHOT_DATE, "methodology": {"density": "Количество брендов / подтвержденная GLA × 10 000", "similarity": "J(A,B) = |A ∩ B| / |A ∪ B|", "median": "Медиана по всем объектам текущей группы, включая фокусный ТЦ"}},
        "rows": rows,
        "mallSummary": mall_summary,
        "categoryMatrix": category_matrix,
        "brandPresence": brand_presence,
        "mallSimilarity": similarities,
        "brandGaps": gaps,
        "upcoming": upcoming_rows,
        "dataQuality": quality,
    }


def write_outputs(payload: dict) -> None:
    AGGREGATES.mkdir(parents=True, exist_ok=True)
    outputs = {
        "dashboard_data.json": payload,
        "mall_summary.json": payload["mallSummary"],
        "category_matrix.json": payload["categoryMatrix"],
        "brand_presence.json": payload["brandPresence"],
        "mall_similarity.json": payload["mallSimilarity"],
        "brand_gaps.json": payload["brandGaps"],
        "data_quality_summary.json": payload["dataQuality"],
    }
    for name, value in outputs.items():
        (AGGREGATES / name).write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    result = build()
    write_outputs(result)
    print(json.dumps(result["dataQuality"], ensure_ascii=False, indent=2))
