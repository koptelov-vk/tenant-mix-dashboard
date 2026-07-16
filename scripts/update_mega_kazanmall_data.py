from __future__ import annotations

import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
RAW_JSON = ROOT / "data" / "raw" / "mega_kazanmall_official_catalogs.json"
BASE_CSV = ROOT / "data" / "processed" / "База_финальная.csv"
AREA_CSV = ROOT / "data" / "processed" / "mall_area_reference.csv"
SOURCES_CSV = ROOT / "data" / "processed" / "Источники.csv"
AUDIT_CSV = ROOT / "data" / "processed" / "mega_kazanmall_import_audit.csv"
CHECKED_AT = "2026-07-16"


CATEGORIES = {
    "clothes": "Одежда",
    "shoes": "Обувь",
    "underwear": "Нижнее белье",
    "accessories": "Аксессуары, сумки и ювелирные изделия",
    "kids": "Детские товары",
    "beauty": "Красота и здоровье",
    "electronics": "Электроника, техника и связь",
    "home": "Товары для дома, мебель и интерьер",
    "grocery": "Продукты и супермаркеты",
    "food": "Кафе и рестораны",
    "leisure": "Развлечения и досуг",
    "fitness": "Спорт и фитнес",
    "sporting": "Спортивные товары",
    "services": "Услуги",
    "finance": "Финансовые услуги",
    "pickup": "ПВЗ и интернет-сервисы",
    "auto": "Автотовары и автоуслуги",
    "pets": "Зоотовары",
    "tobacco": "Табак и вейп",
    "adult": "Товары 18+",
    "other": "Прочее",
}

CATEGORY_PRIORITY = {
    CATEGORIES["adult"]: 100,
    CATEGORIES["tobacco"]: 95,
    CATEGORIES["leisure"]: 90,
    CATEGORIES["fitness"]: 88,
    CATEGORIES["auto"]: 86,
    CATEGORIES["pickup"]: 84,
    CATEGORIES["finance"]: 82,
    CATEGORIES["food"]: 80,
    CATEGORIES["grocery"]: 78,
    CATEGORIES["kids"]: 76,
    CATEGORIES["home"]: 74,
    CATEGORIES["electronics"]: 72,
    CATEGORIES["sporting"]: 70,
    CATEGORIES["beauty"]: 68,
    CATEGORIES["underwear"]: 66,
    CATEGORIES["shoes"]: 64,
    CATEGORIES["accessories"]: 62,
    CATEGORIES["clothes"]: 60,
    CATEGORIES["pets"]: 58,
    CATEGORIES["services"]: 50,
    CATEGORIES["other"]: 10,
}

ALIAS_BY_SIMPLE = {
    "fissman": ("фиссман", "Фиссман"),
    "ростикс": ("ростикс", "Ростикс"),
    "rostics": ("ростикс", "Ростикс"),
    "rostic": ("ростикс", "Ростикс"),
    "ресторанростикс": ("ростикс", "Ростикс"),
    "ресторанrostics": ("ростикс", "Ростикс"),
    "вкусноиточка": ("вкусно и точка", "Вкусно — и точка"),
    "вкусноточка": ("вкусно и точка", "Вкусно — и точка"),
    "лэтуаль": ("лэтуаль", "ЛЭТУАЛЬ"),
    "летуаль": ("лэтуаль", "ЛЭТУАЛЬ"),
    "аптекалэтуаль": ("лэтуаль", "ЛЭТУАЛЬ"),
    "tele2": ("t2", "t2"),
    "t2tele2": ("t2", "t2"),
    "t2": ("t2", "t2"),
    "тейкабум": ("teika boom", "Teika Boom"),
    "teikaboom": ("teika boom", "Teika Boom"),
}

BRAND_CATEGORY_OVERRIDES = {
    "corsar": CATEGORIES["tobacco"],
    "gamepark": CATEGORIES["electronics"],
    "sparfum": CATEGORIES["beauty"],
    "truvor": CATEGORIES["clothes"],
    "макадами": CATEGORIES["grocery"],
    "сервисцентрашан": CATEGORIES["services"],
    "цветдиванов": CATEGORIES["home"],
    "enn": CATEGORIES["clothes"],
    "starbricks": CATEGORIES["leisure"],
}

EXCLUDE_MEGA_PAID = {
    "дарите выбор все желания в одном подарке",
    "нанесение рисунка на одежду или предметы в спортмастере",
}


def clean_text(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "").replace("\xa0", " ")).strip()


def simple_key(value: object) -> str:
    text = unicodedata.normalize("NFKC", clean_text(value)).casefold().replace("ё", "е")
    text = re.sub(r"^(ооо|ип)\s+", "", text)
    return re.sub(r"[^0-9a-zа-я]+", "", text)


def mode(values: list[str], fallback: str = "") -> str:
    clean = [clean_text(value) for value in values if clean_text(value)]
    return Counter(clean).most_common(1)[0][0] if clean else fallback


def role_for(category: str) -> str:
    if category == CATEGORIES["food"]:
        return "food"
    if category in {CATEGORIES["leisure"], CATEGORIES["fitness"]}:
        return "leisure"
    if category in {CATEGORIES["services"], CATEGORIES["finance"], CATEGORIES["pickup"]}:
        return "service"
    if category in {CATEGORIES["grocery"], CATEGORIES["electronics"], CATEGORIES["home"]}:
        return "целевой трафик / мини-якорь"
    return "retail"


def type_for(category: str) -> str:
    if category == CATEGORIES["food"]:
        return "food & beverage"
    if category in {CATEGORIES["leisure"], CATEGORIES["fitness"]}:
        return "entertainment / traffic generator"
    if category in {CATEGORIES["services"], CATEGORIES["finance"], CATEGORIES["pickup"]}:
        return "services"
    return "retail/services"


def classify(brand: str, source_categories: list[str], section: str) -> str:
    text = " ".join([brand, section, *source_categories]).casefold().replace("ё", "е")
    brand_key = simple_key(brand)

    if any(word in text for word in ("интим", "adult", "эрот")):
        return CATEGORIES["adult"]
    if any(word in text for word in ("табак", "вейп", "кальян", "сигарет", "нагревания табака")):
        return CATEGORIES["tobacco"]
    if brand_key in {"ozon", "wildberries", "boxberry", "cdek", "сдэк", "яндексмаркет"}:
        return CATEGORIES["pickup"]
    if any(word in text for word in ("лукойл", "автомо", "автомоб", "шинн", "автосервис")):
        return CATEGORIES["auto"]
    if section == "food" or any(word in text for word in ("кафе", "ресторан", "кофе", "пицц", "суши", "кухня", "десерт", "фуд", "бургер", "кондитер", "сладост", "сок")):
        return CATEGORIES["food"]
    if section == "entertainment" or any(word in text for word in ("развлеч", "кинотеатр", "картодром", "активити", "каток", "тир", "лабиринт", "аэрохоккей", "паровозик", "кидбург", "игровая", "легоза")):
        return CATEGORIES["leisure"]
    if any(word in text for word in ("спортивная секция", "каратэ", "хоккей")):
        return CATEGORIES["fitness"]
    if section in {"services", "paid-services"}:
        if any(word in text for word in ("сотовая связь", "оператор", "tele2", "мегафон", "мтс", "yota")):
            return CATEGORIES["electronics"]
        if any(word in text for word in ("банк", "банкомат", "кредит", "страхов")):
            return CATEGORIES["finance"]
        if any(word in text for word in ("красота", "парикмах", "barber", "ногт", "nails", "массаж")):
            return CATEGORIES["beauty"]
        return CATEGORIES["services"]
    if any(word in text for word in ("гипермаркет", "продукт", "супермаркет", "бакале", "сыр", "фрукт", "вода")):
        return CATEGORIES["grocery"]
    if any(word in text for word in ("системы нагревания",)):
        return CATEGORIES["tobacco"]
    if any(word in text for word in ("товары для животных", "зоотовар")):
        return CATEGORIES["pets"]
    if any(word in text for word in ("детские товары", "детская одежда", "товары для детей")):
        return CATEGORIES["kids"]
    if any(word in text for word in ("товары для дома", "мебель", "интерьер", "посуда", "матрас", "бытовая техника")):
        return CATEGORIES["home"]
    if any(word in text for word in ("цифров", "электроник", "техника", "мобильн", "гаджет", "сотов")):
        return CATEGORIES["electronics"]
    if any(word in text for word in ("товары для спорта", "спортивное питание", "спортивные товары")):
        return CATEGORIES["sporting"]
    if any(word in text for word in ("космет", "парфюм", "аптек", "оптика", "здоров", "красота")):
        return CATEGORIES["beauty"]
    if "нижнее белье" in text or "белье" in text or "купальник" in text:
        return CATEGORIES["underwear"]
    if "обувь" in text:
        return CATEGORIES["shoes"]
    if any(word in text for word in ("аксессуар", "сумки", "ювелир", "бижутер", "украш", "часы")):
        return CATEGORIES["accessories"]
    if any(word in text for word in ("одежда", "головные уборы")):
        return CATEGORIES["clothes"]
    return CATEGORIES["other"]


def update_aliases(frame: pd.DataFrame) -> pd.DataFrame:
    result = frame.copy()
    for index, row in result.iterrows():
        alias = ALIAS_BY_SIMPLE.get(simple_key(row.get("Арендатор / бренд", "")))
        if not alias:
            alias = ALIAS_BY_SIMPLE.get(simple_key(row.get("brand_normalized", "")))
        if alias:
            result.at[index, "brand_normalized"] = alias[0]
            result.at[index, "Арендатор / бренд"] = alias[1]
    return result


def build_rows(base: pd.DataFrame, payload: dict) -> tuple[pd.DataFrame, list[dict]]:
    base = update_aliases(base)
    name_to_norm: dict[str, str] = {}
    for key, group in base.groupby(base["Арендатор / бренд"].map(simple_key)):
        if key:
            name_to_norm[key] = mode(group["brand_normalized"].astype(str).tolist())

    norm_to_display: dict[str, str] = {}
    norm_to_category: dict[str, str] = {}
    for norm, group in base.groupby("brand_normalized"):
        norm = clean_text(norm)
        if not norm:
            continue
        alias_display = next((display for alias_norm, display in ALIAS_BY_SIMPLE.values() if alias_norm == norm), "")
        norm_to_display[norm] = alias_display or mode(group["Арендатор / бренд"].astype(str).tolist())
        norm_to_category[norm] = mode(group["Категория итоговая"].astype(str).tolist())

    built: list[dict] = []
    audits: list[dict] = []
    for mall_data in payload["malls"]:
        mall = mall_data["mall"]
        candidates: list[dict] = []
        excluded = 0
        for item in mall_data["items"]:
            brand = clean_text(item.get("brand"))
            section = clean_text(item.get("section"))
            source_categories = [clean_text(value) for value in item.get("categories", []) if clean_text(value)]
            if not brand:
                continue
            if mall.startswith("МЕГА") and section == "entertainment":
                continue
            if mall.startswith("МЕГА") and section == "paid-services" and simple_key(brand) in {simple_key(value) for value in EXCLUDE_MEGA_PAID}:
                excluded += 1
                continue
            simple = simple_key(brand)
            alias = ALIAS_BY_SIMPLE.get(simple)
            norm = alias[0] if alias else name_to_norm.get(simple, simple)
            display = alias[1] if alias else norm_to_display.get(norm, brand)
            inferred_category = classify(display, source_categories, section)
            existing_category = norm_to_category.get(norm, "")
            category = BRAND_CATEGORY_OVERRIDES.get(simple)
            if not category:
                category = inferred_category if inferred_category != CATEGORIES["other"] and existing_category in {"", CATEGORIES["other"]} else existing_category or inferred_category
            candidates.append({
                "brand": display,
                "norm": norm,
                "category": category,
                "source_category": ", ".join(source_categories),
                "section": section,
                "url": clean_text(item.get("sourceUrl")) or mall_data["officialUrl"],
            })

        grouped: dict[str, list[dict]] = {}
        for candidate in candidates:
            grouped.setdefault(candidate["norm"], []).append(candidate)

        for norm, items in grouped.items():
            categories = [item["category"] for item in items]
            category = max(categories, key=lambda value: (CATEGORY_PRIORITY.get(value, 0), categories.count(value)))
            display = norm_to_display.get(norm) or mode([item["brand"] for item in items])
            source_category = "; ".join(dict.fromkeys(item["source_category"] for item in items if item["source_category"]))
            sections = "; ".join(dict.fromkeys(item["section"] for item in items))
            urls = list(dict.fromkeys(item["url"] for item in items if item["url"]))
            built.append({
                "ТЦ/ТРК": mall,
                "Арендатор / бренд": display,
                "brand_normalized": norm,
                "Характеристика бренда": "",
                "Категория итоговая": category,
                "Категория проверенная": category,
                "Категория 2ГИС/Яндекс": source_category,
                "Тип категории": type_for(category),
                "Роль tenant-mix": role_for(category),
                "Источник": "официальный сайт",
                "Источник URL": urls[0] if urls else mall_data["officialUrl"],
                "Статус строки": "дозагружено из официального каталога",
                "Статус подтверждения": f"подтверждено официальным сайтом, автосверка {CHECKED_AT}",
                "Основание категории": f"официальные разделы: {sections}; рубрика: {source_category or 'не указана'}",
                "Требует ручной проверки": False,
                "Комментарий аудитора": f"Официальный каталог {mall}; карточек бренда: {len(items)}; источник проверен {CHECKED_AT}",
            })

        audits.append({
            "ТЦ/ТРК": mall,
            "Карточек магазинов": mall_data["catalogCounts"].get("shops", 0),
            "Карточек еды": mall_data["catalogCounts"].get("food", 0),
            "Карточек развлечений": mall_data["catalogCounts"].get("entertainment", 0),
            "Карточек услуг": mall_data["catalogCounts"].get("paidServices", mall_data["catalogCounts"].get("services", 0)),
            "Исключено внутренних функций": excluded,
            "Уникальных коммерческих брендов": len(grouped),
            "Проверено": CHECKED_AT,
            "Источник": mall_data["officialUrl"],
        })

    new_frame = pd.DataFrame(built, columns=base.columns)
    return pd.concat([base, new_frame], ignore_index=True), audits


def deduplicate_and_recalculate(frame: pd.DataFrame) -> pd.DataFrame:
    frame = frame.copy().fillna("")
    frame["_manual"] = frame["Требует ручной проверки"].astype(str).str.casefold().isin({"true", "1", "да"})
    frame["_official"] = frame["Источник"].astype(str).str.casefold().eq("официальный сайт")
    frame["_priority"] = frame["Категория итоговая"].map(CATEGORY_PRIORITY).fillna(0)
    frame = frame.sort_values(
        ["ТЦ/ТРК", "brand_normalized", "_manual", "_official", "_priority"],
        ascending=[True, True, True, False, False],
        kind="stable",
    )
    frame = frame.drop_duplicates(["ТЦ/ТРК", "brand_normalized"], keep="first")
    counts = frame.groupby("brand_normalized")["ТЦ/ТРК"].nunique()
    frame["Характеристика бренда"] = frame["brand_normalized"].map(lambda key: "Уникальный" if counts.get(key, 0) == 1 else "Пересекающийся")
    return frame.drop(columns=["_manual", "_official", "_priority"]).sort_values(["ТЦ/ТРК", "Арендатор / бренд"], key=lambda series: series.astype(str).str.casefold())


def update_areas() -> None:
    areas = pd.read_csv(AREA_CSV).fillna("")
    mall_col, city_col = areas.columns[:2]
    areas = areas[~areas[mall_col].isin({"МЕГА Нижний Новгород", "KazanMall"})]
    additions = pd.DataFrame([
        {
            mall_col: "МЕГА Нижний Новгород",
            city_col: "НН",
            "GBA": 125500,
            "GLA": 102500,
            areas.columns[4]: "https://nizhniynovgorod.arendator.ru/objects/6951-mega_nizhnij_novgorod/",
            areas.columns[5]: "профильная карточка объекта, обновлена 02.03.2023",
            areas.columns[6]: "средняя",
        },
        {
            mall_col: "KazanMall",
            city_col: "Казань",
            "GBA": 140000,
            "GLA": 57600,
            areas.columns[4]: "https://finolive.ru/docs/219/annual_report_2024.pdf",
            areas.columns[5]: "годовой отчет 2024 владельца и девелопера: GBA 140 000 м², GLA 57 600 м²",
            areas.columns[6]: "высокая",
        },
    ], columns=areas.columns)
    pd.concat([areas, additions], ignore_index=True).to_csv(AREA_CSV, index=False, encoding="utf-8")


def update_sources() -> None:
    sources = pd.read_csv(SOURCES_CSV).fillna("")
    mall_col = sources.columns[0]
    sources = sources[~sources[mall_col].isin({"МЕГА Нижний Новгород", "KazanMall"})]
    rows = []
    for mall, url, address, gba, gla, area_source, area_status in [
        (
            "МЕГА Нижний Новгород", "https://mega.ru/nn/", "Нижегородская область, Кстовский район, с. Федяково, ул. Любимая, стр. 1",
            125500, 102500, "https://nizhniynovgorod.arendator.ru/objects/6951-mega_nizhnij_novgorod/", "профильная карточка объекта; средняя надежность",
        ),
        (
            "KazanMall", "https://kazanmall.com/", "Казань, ул. Павлюхина, 91",
            140000, 57600, "https://finolive.ru/docs/219/annual_report_2024.pdf", "годовой отчет 2024 владельца и девелопера; высокая надежность",
        ),
    ]:
        row = {column: "" for column in sources.columns}
        row[sources.columns[0]] = mall
        row[sources.columns[1]] = url
        if len(sources.columns) > 4:
            row[sources.columns[4]] = address
        if len(sources.columns) > 5:
            row[sources.columns[5]] = gba
        if len(sources.columns) > 6:
            row[sources.columns[6]] = gla
        if len(sources.columns) > 7:
            row[sources.columns[7]] = area_source
        if len(sources.columns) > 8:
            row[sources.columns[8]] = area_status
        if len(sources.columns) > 9:
            row[sources.columns[9]] = f"Каталог арендаторов проверен {CHECKED_AT} по всем коммерческим разделам"
        rows.append(row)
    pd.concat([sources, pd.DataFrame(rows)], ignore_index=True).to_csv(SOURCES_CSV, index=False, encoding="utf-8")


def main() -> None:
    payload = json.loads(RAW_JSON.read_text(encoding="utf-8"))
    base = pd.read_csv(BASE_CSV).fillna("")
    target_malls = {mall["mall"] for mall in payload["malls"]}
    base = base[~base["ТЦ/ТРК"].isin(target_malls)].copy()
    updated, audits = build_rows(base, payload)
    updated = deduplicate_and_recalculate(updated)
    updated.to_csv(BASE_CSV, index=False, encoding="utf-8")
    pd.DataFrame(audits).to_csv(AUDIT_CSV, index=False, encoding="utf-8")
    update_areas()
    update_sources()
    print(updated.groupby("ТЦ/ТРК").size().loc[sorted(target_malls)].to_string())
    print(f"rows={len(updated)} malls={updated['ТЦ/ТРК'].nunique()}")
    print(AUDIT_CSV)


if __name__ == "__main__":
    main()
