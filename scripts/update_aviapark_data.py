from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path
from urllib.request import Request, urlopen

import pandas as pd

import update_mega_kazanmall_data as shared


ROOT = Path(__file__).resolve().parents[1]
API_URL = "https://api.aviapark.com/v1/bootstrap-jsonp?lang=ru&callback=setBootstrap"
OFFICIAL_URL = "https://aviapark.com/"
MALL = "Авиапарк"
CITY = "Москва"
CHECKED_AT = "2026-07-16"
RAW_JSON = ROOT / "data" / "raw" / "aviapark_official_catalog.json"
AUDIT_CSV = ROOT / "data" / "processed" / "aviapark_import_audit.csv"

AREA_SOURCE = (
    "https://shopandmall.ru/articles/top-5-rossijskih-megapolisov-po-obemu-"
    "torgovyh-plosadej-v-2024-2025-godah; https://rbcrealty.ru/news/577d22039a7947a78ce91518"
)

INFRASTRUCTURE_CATEGORIES = {
    "service/aviapark",
    "kids/Services-for-children",
    "entertainment/aquarium",
    "entertainment/Art object",
}

INFRASTRUCTURE_TITLES = {
    "каршеринг",
}

FITNESS_BRANDS = {
    "времяфутбола",
    "футбольнаяшколафкдинамомосква",
    "ddxfitness",
    "parkarena",
    "танго",
    "тангоkids",
}

BRAND_CATEGORY_OVERRIDES = {
    "купислона": shared.CATEGORIES["kids"],
    "мультифото": shared.CATEGORIES["services"],
    "мастерскаяупаковки": shared.CATEGORIES["services"],
}

FORCED_BY_CATEGORY = {
    "service/Delivery": shared.CATEGORIES["pickup"],
    "service/atm": shared.CATEGORIES["finance"],
    "service/currency-exchange": shared.CATEGORIES["finance"],
    "service/car-sharing": shared.CATEGORIES["auto"],
    "service/car-wash": shared.CATEGORIES["auto"],
    "service/electric-vehicle-charging-station": shared.CATEGORIES["auto"],
    "service/salon-of-cellular-communication": shared.CATEGORIES["electronics"],
    "service/pharmacy": shared.CATEGORIES["beauty"],
    "service/optics": shared.CATEGORIES["beauty"],
    "service/beauty-and-body-care": shared.CATEGORIES["beauty"],
    "service/nail-salon": shared.CATEGORIES["beauty"],
    "service/barbershop": shared.CATEGORIES["beauty"],
    "service/childrens-hairdressing": shared.CATEGORIES["beauty"],
    "service/Tanning studio": shared.CATEGORIES["beauty"],
    "shops/nizhnee-bele": shared.CATEGORIES["underwear"],
    "shops/obuv": shared.CATEGORIES["shoes"],
    "shops/yuvelirnye": shared.CATEGORIES["accessories"],
    "shops/accessories": shared.CATEGORIES["accessories"],
    "shops/gifts": shared.CATEGORIES["accessories"],
    "shops/detskaya": shared.CATEGORIES["kids"],
    "shops/detskie": shared.CATEGORIES["kids"],
    "shops/igrushki": shared.CATEGORIES["kids"],
    "shops/to-school": shared.CATEGORIES["kids"],
    "shops/dlya-beremennyh": shared.CATEGORIES["kids"],
    "shops/tovary-dlya-doma": shared.CATEGORIES["home"],
    "shops/diy": shared.CATEGORIES["home"],
    "shops/hypermarket": shared.CATEGORIES["grocery"],
    "shops/food": shared.CATEGORIES["grocery"],
    "shops/zoomagazin": shared.CATEGORIES["pets"],
    "shops/provider": shared.CATEGORIES["electronics"],
    "shops/elektroniki": shared.CATEGORIES["electronics"],
    "shops/sportivnye": shared.CATEGORIES["sporting"],
    "shops/health": shared.CATEGORIES["beauty"],
    "shops/odezhda": shared.CATEGORIES["clothes"],
    "shops/womens": shared.CATEGORIES["clothes"],
    "shops/odezhda-muzhskaya": shared.CATEGORIES["clothes"],
}


def fetch_catalog() -> dict:
    request = Request(API_URL, headers={"User-Agent": "Mozilla/5.0 tenant-mix-audit"})
    text = urlopen(request, timeout=60).read().decode("utf-8")
    payload = json.loads(re.sub(r"^setBootstrap\(|\);?\s*$", "", text))
    RAW_JSON.parent.mkdir(parents=True, exist_ok=True)
    RAW_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return payload


def category_labels(payload: dict) -> dict[str, str]:
    result: dict[str, str] = {}
    for section in payload.get("sections", []):
        section_code = section.get("code", "")
        section_name = section.get("name", section_code)
        for category in section.get("categories", []):
            code = f"{section_code}/{category.get('code', '')}"
            result[code] = f"{section_name}: {category.get('name', category.get('code', ''))}"
    return result


def primary_section(categories: list[str]) -> str:
    prefixes = {value.split("/", 1)[0] for value in categories}
    if "food" in prefixes:
        return "food"
    if "entertainment" in prefixes or any(value.startswith("kids/kidsevents") or value.startswith("kids/edutainment") or value.startswith("kids/skateschool") for value in categories):
        return "entertainment"
    if "shops" in prefixes:
        return "shops"
    if "service" in prefixes:
        return "services"
    return "shops"


def forced_category(brand: str, categories: list[str], section: str) -> str:
    brand_key = shared.simple_key(brand)
    if brand_key in BRAND_CATEGORY_OVERRIDES:
        return BRAND_CATEGORY_OVERRIDES[brand_key]
    if brand_key in FITNESS_BRANDS:
        return shared.CATEGORIES["fitness"]
    if section == "food":
        return shared.CATEGORIES["food"]
    if section == "entertainment":
        return shared.CATEGORIES["leisure"]
    choices = [FORCED_BY_CATEGORY[value] for value in categories if value in FORCED_BY_CATEGORY]
    if not choices:
        return ""
    return max(choices, key=lambda value: shared.CATEGORY_PRIORITY.get(value, 0))


def prepare_payload(catalog: dict) -> tuple[dict, dict[str, dict], list[dict]]:
    labels = category_labels(catalog)
    items: list[dict] = []
    metadata: dict[str, dict] = {}
    excluded: list[dict] = []
    for department in catalog.get("departments", []):
        brand = shared.clean_text(department.get("title"))
        categories = [shared.clean_text(value) for value in department.get("categories", []) if shared.clean_text(value)]
        exclusion = next((value for value in categories if value in INFRASTRUCTURE_CATEGORIES), "")
        if exclusion or shared.simple_key(brand) in INFRASTRUCTURE_TITLES:
            excluded.append({"Бренд": brand, "Причина": exclusion or "служебная агрегирующая карточка"})
            continue
        section = primary_section(categories)
        norm_hint = shared.simple_key(brand)
        metadata[norm_hint] = {
            "forced": forced_category(brand, categories, section),
            "status": shared.clean_text(department.get("status")),
            "categories": categories,
        }
        items.append({
            "brand": brand,
            "section": section,
            "categories": [labels.get(value, value) for value in categories],
            "sourceUrl": f"https://aviapark.com/{shared.clean_text(department.get('urn'))}",
        })
    payload = {
        "malls": [{
            "mall": MALL,
            "officialUrl": OFFICIAL_URL,
            "items": items,
            "catalogCounts": {
                "shops": sum(any(value.startswith("shops/") for value in item["categories"]) for item in catalog.get("departments", [])),
                "food": sum(any(value.startswith("food/") for value in item["categories"]) for item in catalog.get("departments", [])),
                "entertainment": sum(any(value.startswith("entertainment/") for value in item["categories"]) for item in catalog.get("departments", [])),
                "services": sum(any(value.startswith("service/") for value in item["categories"]) for item in catalog.get("departments", [])),
            },
        }]
    }
    return payload, metadata, excluded


def apply_metadata(frame: pd.DataFrame, metadata: dict[str, dict]) -> pd.DataFrame:
    result = frame.copy()
    mask = result["ТЦ/ТРК"].eq(MALL)
    for index, row in result[mask].iterrows():
        meta = metadata.get(shared.simple_key(row["Арендатор / бренд"])) or metadata.get(shared.simple_key(row["brand_normalized"]))
        if not meta:
            continue
        category = meta.get("forced", "")
        if category:
            result.at[index, "Категория итоговая"] = category
            result.at[index, "Категория проверенная"] = category
            result.at[index, "Тип категории"] = shared.type_for(category)
            result.at[index, "Роль tenant-mix"] = shared.role_for(category)
            result.at[index, "Основание категории"] = f"официальная рубрика Авиапарка; категория приведена к единому классификатору: {category}"
        if meta.get("status") == "reconstruction":
            result.at[index, "Статус строки"] = "реконструкция по данным официального каталога"
            result.at[index, "Статус подтверждения"] = f"официальный статус reconstruction, проверено {CHECKED_AT}"
            result.at[index, "Требует ручной проверки"] = True
            result.at[index, "Комментарий аудитора"] = "Карточка присутствует в официальном каталоге со статусом reconstruction; фактическую работу необходимо перепроверить"
    return result


def update_areas() -> None:
    areas = pd.read_csv(shared.AREA_CSV).fillna("")
    areas = areas[~areas[areas.columns[0]].eq(MALL)]
    row = {column: "" for column in areas.columns}
    row[areas.columns[0]] = MALL
    row[areas.columns[1]] = CITY
    row["GBA"] = 390000
    row["GLA"] = 230000
    row[areas.columns[4]] = AREA_SOURCE
    row[areas.columns[5]] = "GBA 390 000 м² и GLA 230 000 м² по таблице РБК; GLA 230 000 м² подтверждена обзором ShopAndMall 2025"
    row[areas.columns[6]] = "высокая"
    pd.concat([areas, pd.DataFrame([row])], ignore_index=True).to_csv(shared.AREA_CSV, index=False, encoding="utf-8")


def update_sources() -> None:
    sources = pd.read_csv(shared.SOURCES_CSV).fillna("")
    sources = sources[~sources[sources.columns[0]].eq(MALL)]
    row = {column: "" for column in sources.columns}
    row[sources.columns[0]] = MALL
    row[sources.columns[1]] = OFFICIAL_URL
    row[sources.columns[4]] = "Москва, Ходынский бульвар, д. 4"
    row[sources.columns[5]] = 390000
    row[sources.columns[6]] = 230000
    row[sources.columns[7]] = AREA_SOURCE
    row[sources.columns[8]] = "РБК и актуальный отраслевой обзор; высокая надежность"
    row[sources.columns[9]] = f"Официальный структурированный каталог проверен {CHECKED_AT}; все коммерческие разделы включены, инфраструктура исключена"
    pd.concat([sources, pd.DataFrame([row])], ignore_index=True).to_csv(shared.SOURCES_CSV, index=False, encoding="utf-8")


def main() -> None:
    catalog = fetch_catalog()
    payload, metadata, excluded = prepare_payload(catalog)
    base = pd.read_csv(shared.BASE_CSV).fillna("")
    base = base[~base["ТЦ/ТРК"].eq(MALL)].copy()
    updated, _ = shared.build_rows(base, payload)
    updated = apply_metadata(updated, metadata)
    updated = shared.deduplicate_and_recalculate(updated)
    updated.to_csv(shared.BASE_CSV, index=False, encoding="utf-8")
    update_areas()
    update_sources()

    mall_rows = updated[updated["ТЦ/ТРК"].eq(MALL)]
    audit_rows = [
        {"Показатель": "Карточек в официальном API", "Значение": len(catalog.get("departments", []))},
        {"Показатель": "Исключено инфраструктуры и некоммерческих объектов", "Значение": len(excluded)},
        {"Показатель": "Коммерческих брендов после дедупликации", "Значение": len(mall_rows)},
        {"Показатель": "Карточек со статусом reconstruction", "Значение": sum(value.get("status") == "reconstruction" for value in metadata.values())},
        {"Показатель": "Дата проверки", "Значение": CHECKED_AT},
        {"Показатель": "Исключенные карточки", "Значение": "; ".join(value["Бренд"] for value in excluded)},
    ]
    pd.DataFrame(audit_rows).to_csv(AUDIT_CSV, index=False, encoding="utf-8")
    print(mall_rows["Категория итоговая"].value_counts().to_string())
    print(f"official={len(catalog.get('departments', []))} excluded={len(excluded)} imported={len(mall_rows)}")
    print(f"rows={len(updated)} malls={updated['ТЦ/ТРК'].nunique()}")


if __name__ == "__main__":
    main()
