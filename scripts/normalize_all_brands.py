from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

import pandas as pd

import audit_brand_normalization as audit
import update_mega_kazanmall_data as shared


BACKUP_CSV = shared.ROOT / "data" / "raw" / "База_финальная_before_brand_normalization_20260716.csv"
CHANGES_CSV = shared.ROOT / "data" / "processed" / "brand_normalization_changes.csv"
SUMMARY_JSON = shared.ROOT / "data" / "processed" / "brand_normalization_summary.json"

INTERNAL_FUNCTIONS = {
    "аппарат для чистки обуви",
    "аппарат для упаковки зонтов",
    "банкоматы",
    "детская площадка",
    "детские стульчики для кормления",
    "детские стульчики на фуд корте",
    "контейнер для сбора одежды",
    "контейнер для сбора батареек",
    "контейнер спасибо",
    "лифты",
    "одежды и",
    "островок безопасности",
    "остановки общественного транспорта",
    "подарочная карта",
    "подарочная карта трц галерея новосибирск",
    "проверка зрения",
    "пуско зарядное устройство для авто",
    "станция зарядки электромобилей",
    "трц новосибирск",
    "утилизация одежды",
    "зарядная станция",
    "зона отдыха с возможностью зарядки гаджетов",
}

CATEGORY_OVERRIDES = {
    "cropp": shared.CATEGORIES["clothes"],
    "ростелеком": shared.CATEGORIES["electronics"],
    "чемодан pro": shared.CATEGORIES["accessories"],
}

EXPLICIT_ALIASES = {
    "5кармаnов": ("5 карманов", "5 Карманов"),
    "5карманов": ("5 карманов", "5 Карманов"),
    "7davatar": ("7d avatar", "7D Аватар"),
    "7dаватар": ("7d avatar", "7D Аватар"),
    "alexanderbobdanov": ("alexander bogdanov", "Alexander Bogdanov"),
    "alexanderbogdanov": ("alexander bogdanov", "Alexander Bogdanov"),
    "calvinkleinjeans": ("calvin klein jeans", "Calvin Klein Jeans"),
    "calvinklеinjeans": ("calvin klein jeans", "Calvin Klein Jeans"),
    "calvinkleinjeanskarllagerfeld": ("calvin klein jeans karl lagerfeld jeans", "Calvin Klein Jeans | Karl Lagerfeld Jeans"),
    "calvinkleinjeanskarllagerfeldjeans": ("calvin klein jeans karl lagerfeld jeans", "Calvin Klein Jeans | Karl Lagerfeld Jeans"),
    "akhmadullinadreamsахмадуллинадримс": ("dreams by alena akhmadullina", "Dreams by Alena Akhmadullina"),
    "dreamsbyalenaakhmadullina": ("dreams by alena akhmadullina", "Dreams by Alena Akhmadullina"),
    "croppcr": ("cropp", "Cropp"),
    "cinnabon1": ("cinnabon", "Cinnabon"),
    "coffelike": ("coffee like", "Coffee Like"),
    "coffeelike": ("coffee like", "Coffee Like"),
    "coffeelikeуфудкорта": ("coffee like", "Coffee Like"),
    "ea7": ("ea7", "EA7"),
    "еа7": ("ea7", "EA7"),
    "eltempo": ("el tempo", "El Tempo"),
    "fissman": ("фиссман", "Фиссман"),
    "farш": ("farш", "#FARШ"),
    "farшбургерная": ("farш", "#FARШ"),
    "housexc": ("xc", "XC"),
    "karllagerfeldman": ("karl lagerfeld", "Karl Lagerfeld"),
    "karllagerfeldwoman": ("karl lagerfeld", "Karl Lagerfeld"),
    "karllagerfeldжен": ("karl lagerfeld", "Karl Lagerfeld"),
    "kuchenland": ("kuchenland home", "Kuchenland Home"),
    "kuchenlandhome": ("kuchenland home", "Kuchenland Home"),
    "lawine": ("lawine", "Lawine"),
    "lawinе": ("lawine", "Lawine"),
    "летуаль": ("лэтуаль", "ЛЭТУАЛЬ"),
    "лэтуаль": ("лэтуаль", "ЛЭТУАЛЬ"),
    "marccony": ("marc cony", "Marc Cony"),
    "marcandre": ("marc и andre", "Marc & André"),
    "cosmomedicabydoctorkondrasheva": ("cosmomedica by dr kondrasheva", "Cosmomedica by Dr. Kondrasheva"),
    "cosmomedicabydrkondrasheva": ("cosmomedica by dr kondrasheva", "Cosmomedica by Dr. Kondrasheva"),
    "kosmomedikabydrkondrasheva": ("cosmomedica by dr kondrasheva", "Cosmomedica by Dr. Kondrasheva"),
    "mtc": ("мтс", "МТС"),
    "мтс": ("мтс", "МТС"),
    "noone": ("no one", "NO ONE"),
    "перекресток": ("перекресток", "Перекрёсток"),
    "ростикс": ("ростикс", "Ростикс"),
    "rostics": ("ростикс", "Ростикс"),
    "rostic": ("ростикс", "Ростикс"),
    "rostelecom": ("ростелеком", "Ростелеком"),
    "ростелеком": ("ростелеком", "Ростелеком"),
    "синsinsay": ("sinsay", "СИН"),
    "син": ("sinsay", "СИН"),
    "sinsay": ("sinsay", "СИН"),
    "streetbeat2": ("street beat", "Street Beat"),
    "theact": ("the act", "The Act"),
    "topgun": ("top gun", "Top Gun"),
    "unode50": ("uno de 50", "UNOde50"),
    "vitajuice1": ("vita juice", "Vita Juice"),
    "вкусноиточка": ("вкусно и точка", "Вкусно — и точка"),
    "вкусноточка": ("вкусно и точка", "Вкусно — и точка"),
    "чемоданpro": ("чемодан pro", "Чемодан PRO"),
    "williamsoliver": ("williams et oliver", "Williams Et Oliver"),
    "williamsetoliver": ("williams et oliver", "Williams Et Oliver"),
}

GENERIC_QUOTED_PREFIX = re.compile(
    r"^(?:аптека|ателье|автомойка|бар|белорусская мебель|бойцовский клуб|боулинг-бар|бц|"
    r"выставка|зоотовары|игровая площадка|интерактивная диорама|кабина|картинг-клуб|кафе|"
    r"кинологический центр|кинотеатр|кухонная студия|мебельная фабрика|мужская парикмахерская|"
    r"мультипарк|оптика|парк развлечений|паровозик|ресторан|садовый центр|салон|сеть|"
    r"столярная студия|супермаркет|торговый дом|траттория|фабрика дверей|фк|химчистка|"
    r"хобби-гипермаркет|шаурмичная|шиномонтаж|corner)\b",
    re.IGNORECASE,
)

LEADING_DESCRIPTOR = re.compile(
    r"^(?:"
    r"одежды\s+и\s+товаров\s+для\s+дома|одежды|"
    r"обуви\s+и\s+аксессуаров|обуви\s+для\s+детей\s+и\s+подростков|обуви|"
    r"кафе\s+и\s+рестораны|кафе(?:-столовая)?(?:\s+напитков(?:\s+и\s+десертов|\s+на\s+основе\s+чая)?|\s+тайской\s+кухни)?|"
    r"ресторан(?:\s+быстрого\s+питания|\s+итальянской\s+кухни|\s+домашней\s+кухни|\s+грузинской\s+кухни|\s+самообслуживания)?|"
    r"услуги\s+банкомат|услуги|банкомат|"
    r"магазин(?:\s+напитков|\s+подарков|\s+табака)?|"
    r"салон(?:\s+связи|\s+красоты|\s+штор)?|"
    r"аптека|супермаркет|кинотеатр"
    r")\s+",
    re.IGNORECASE,
)

CATALOG_PREFIX = re.compile(
    r"^(?:"
    r"сервисы|итальянский\s+ресторан|чемоданов\s+и\s+товаров\s+для\s+путешествий|"
    r"смартфонов\s+и\s+аксессуаров|фудхолл\s+кафе\s+и\s+рестораны(?:\s+чайхана)?|"
    r"проектирование\s+и\s+строительство|проектирование\s+и\s+дизайн|"
    r"книг\s+и\s+товаров\s+для\s+творчества|парфюмерии\s+и\s+косметики|"
    r"сервис\s+обслуживания\s+смартфонов|бренды|солнцезащитных\s+очков|"
    r"аромасвечей\s+и\s+аромадиффузеров|развивающих\s+игрушек\s+и\s+слаймов|"
    r"ювелирных\s+украшений|православных\s+украшений|ювелирных\s+изделий|"
    r"розничная\s+сеть\s+товаров\s+для\s+дома|сладостей\s+и\s+мармелада|"
    r"массажного\s+оборудования|бездымных\s+систем\s+курения|"
    r"фирменный\s+магазин|сервисный\s+центр|домашнего\s+текстиля|товаров\s+для\s+сна|"
    r"табачных\s+изделий|нижнего\s+белья|платьев|подарков|кофейня|химчистка|развлечения|"
    r"автомобильная\s+заправочная\s+станция|батутно-развлекательный\s+комплекс|"
    r"мебельный\s+салон|мужская\s+парикмахерская|музей\s+занимательной\s+науки|"
    r"пиццерия\s+римской\s+пиццы|цифровой\s+и\s+бытовой\s+техники"
    r")\s+",
    re.IGNORECASE,
)

TRAILING_DESCRIPTOR = re.compile(
    r"(?:"
    r"\s+-\s+c?ервис\s+печати\s+фотографий|"
    r"\s+магазин\s+пуховиков\s+Консо|\s+магазин|"
    r"\s+система\s+нагревания\s+табака|\.Костромской\s+ювелирный\s+завод|"
    r"\s+сеть\s+химчисток|\s+кафе\s+вьетнамской\s+кухни|"
    r"\s+ресторан\s+быстрого\s+питания|\s+пиццерия|\s+туристическое\s+агентство|"
    r"\s+цифровая\s+и\s+бытовая\s+техника|:\s*аптека\s+всей\s+семьи|"
    r"\s+Мужская\s+одежда|\s+зона\s+мастер-классов|\s+кулинария-кондитерская"
    r")$",
    re.IGNORECASE,
)


def clean_text(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "").replace("\xa0", " ")).strip()


def fold_latin_diacritics(value: object) -> str:
    result = []
    for char in clean_text(value):
        if "LATIN" in unicodedata.name(char, ""):
            result.extend(part for part in unicodedata.normalize("NFKD", char) if not unicodedata.combining(part))
        else:
            result.append(char)
    return "".join(result)


def normalized_key(value: object) -> str:
    text = unicodedata.normalize("NFKC", fold_latin_diacritics(value)).casefold().replace("ё", "е")
    text = text.replace("&", " и ")
    return re.sub(r"\s+", " ", re.sub(r"[^0-9a-zа-я]+", " ", text)).strip()


def alias_token(value: object) -> str:
    text = unicodedata.normalize("NFKC", fold_latin_diacritics(value)).casefold().replace("ё", "е")
    return re.sub(r"[^0-9a-zа-я]+", "", text)


def strip_matched_outer_quotes(text: str) -> str:
    pairs = (("«", "»"), ("„", "“"), ('"', '"'), ("'", "'"))
    for left, right in pairs:
        if text.startswith(left) and text.endswith(right) and len(text) > 2:
            return text[len(left):-len(right)].strip()
    return text


def clean_brand(value: object) -> str:
    text = clean_text(value)
    text = re.sub(r"\s*(?:\(адрес\)|\|\s*ТРЦ?\b|\|\s*ТЦ\b).*$", "", text, flags=re.IGNORECASE).strip()
    text = re.sub(r"\s*\|\s*Галерея\s+(?:Краснодар|Новосибирск)\s*$", "", text, flags=re.IGNORECASE).strip()
    text = re.sub(r"\s+в\s+Воронеже(?:\b.*)?$", "", text, flags=re.IGNORECASE).strip()
    text = re.sub(r"\s*\[[A-ZА-Я0-9]{1,5}\]\s*$", "", text).strip()
    text = re.sub(r"^CHL\s*\([^)]*\)$", "CHL", text, flags=re.IGNORECASE)
    text = re.sub(r"^Копировальный\s+центр\s*\(Платно\)$", "Копировальный центр", text, flags=re.IGNORECASE)
    text = re.sub(r"^U\.S\.\s*Polo\s+Assn\.\s*\(AR\s+Fashion\)$", "U.S. Polo Assn.", text, flags=re.IGNORECASE)
    text = re.sub(r"^Мир\s+православного\s+подарка\s+", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^косметики\s+", "", text, flags=re.IGNORECASE)
    text = strip_matched_outer_quotes(text)

    quoted = re.search(r"[«\"]([^»\"]+)[»\"]", text)
    if quoted and GENERIC_QUOTED_PREFIX.search(text[:quoted.start()].strip()):
        text = quoted.group(1).strip()

    for _ in range(2):
        updated = CATALOG_PREFIX.sub("", LEADING_DESCRIPTOR.sub("", text)).strip()
        if updated == text or len(updated) < 2:
            break
        text = updated
    text = TRAILING_DESCRIPTOR.sub("", text).strip()
    return strip_matched_outer_quotes(text).strip(" |")


def display_score(name: str, count: int) -> tuple[int, int, int, str]:
    letters = "".join(ch for ch in name if ch.isalpha())
    style = 0
    if len(letters) > 4 and letters.isupper():
        style -= 8
    if len(letters) > 4 and letters.islower():
        style -= 10
    if letters and not letters.isupper() and not letters.islower():
        style += 5
    if any(marker in name.casefold() for marker in ("адрес", "трц", "одежды ", "обуви ")):
        style -= 30
    return count * 3 + style, -len(name), -sum(not ch.isalnum() and not ch.isspace() for ch in name), name.casefold()


def main() -> None:
    source_path = BACKUP_CSV if "--from-backup" in sys.argv and BACKUP_CSV.exists() else shared.BASE_CSV
    frame = pd.read_csv(source_path).fillna("")
    if not BACKUP_CSV.exists():
        BACKUP_CSV.parent.mkdir(parents=True, exist_ok=True)
        frame.to_csv(BACKUP_CSV, index=False, encoding="utf-8")

    mall_col, brand_col, norm_col, characteristic_col, category_col, checked_category_col = frame.columns[:6]
    source_category_col, type_col, role_col = frame.columns[6:9]
    old_rows = len(frame)
    old_norms = frame[norm_col].nunique()
    old_displays = frame[brand_col].nunique()

    excluded_mask = frame[brand_col].map(normalized_key).isin(INTERNAL_FUNCTIONS)
    excluded = frame.loc[excluded_mask, [mall_col, brand_col, norm_col]].copy()
    internal_rows_removed = int(excluded_mask.sum())
    frame = frame.loc[~excluded_mask].copy()

    changes: list[dict] = []
    candidate_norms = []
    cleaned_names = []
    explicit_displays: dict[int, str] = {}
    for index, row in frame.iterrows():
        old_brand = clean_text(row[brand_col])
        old_norm = clean_text(row[norm_col])
        cleaned = clean_brand(old_brand) or old_brand
        alias = EXPLICIT_ALIASES.get(alias_token(cleaned)) or EXPLICIT_ALIASES.get(alias_token(old_norm))
        candidate_norm = alias[0] if alias else normalized_key(cleaned)
        if alias:
            explicit_displays[index] = alias[1]
            cleaned = alias[1]
        candidate_norms.append(candidate_norm)
        cleaned_names.append(cleaned)
        if old_brand != cleaned or old_norm != candidate_norm:
            changes.append({
                "ТЦ/ТРК": row[mall_col],
                "Бренд до": old_brand,
                "Бренд после": cleaned,
                "Ключ до": old_norm,
                "Ключ после": candidate_norm,
                "Причина": "очистка заголовка/алиас",
            })
    frame["_candidate_norm"] = candidate_norms
    frame["_cleaned_brand"] = cleaned_names
    cleaned_internal_mask = frame["_cleaned_brand"].map(normalized_key).isin(INTERNAL_FUNCTIONS)
    internal_rows_removed += int(cleaned_internal_mask.sum())
    frame = frame.loc[~cleaned_internal_mask].copy()

    skeleton_groups: dict[str, list[int]] = defaultdict(list)
    for index, candidate in frame["_candidate_norm"].items():
        key = audit.skeleton(candidate)
        if len(key) >= 3 and key not in {"xc"}:
            skeleton_groups[key].append(index)
    for indexes in skeleton_groups.values():
        norms = frame.loc[indexes, "_candidate_norm"]
        if norms.nunique() <= 1:
            continue
        counts = Counter(norms)
        canonical = sorted(counts, key=lambda value: (-counts[value], len(value), value))[0]
        frame.loc[indexes, "_candidate_norm"] = canonical

    canonical_displays: dict[str, str] = {}
    for norm, group in frame.groupby("_candidate_norm", sort=False):
        forced = [explicit_displays[index] for index in group.index if index in explicit_displays]
        if forced:
            canonical_displays[norm] = Counter(forced).most_common(1)[0][0]
            continue
        counts = Counter(group["_cleaned_brand"].astype(str))
        canonical_displays[norm] = max(counts, key=lambda name: display_score(name, counts[name]))

    frame[brand_col] = frame["_candidate_norm"].map(canonical_displays)
    frame[norm_col] = frame["_candidate_norm"]

    category_changes = 0
    for norm, group in frame.groupby(norm_col):
        category_counts = Counter(group[category_col].astype(str))
        if len(group) < 2 or not category_counts:
            continue
        category, count = category_counts.most_common(1)[0]
        if not category or count / len(group) < 0.60:
            continue
        mask = frame.index.isin(group.index) & frame[category_col].ne(category)
        category_changes += int(mask.sum())
        frame.loc[mask, category_col] = category
        frame.loc[mask, checked_category_col] = category
        frame.loc[mask, type_col] = shared.type_for(category)
        frame.loc[mask, role_col] = shared.role_for(category)

    for norm, category in CATEGORY_OVERRIDES.items():
        mask = frame[norm_col].eq(norm) & frame[category_col].ne(category)
        category_changes += int(mask.sum())
        frame.loc[mask, category_col] = category
        frame.loc[mask, checked_category_col] = category
        frame.loc[mask, type_col] = shared.type_for(category)
        frame.loc[mask, role_col] = shared.role_for(category)

    before_dedup = len(frame)
    frame = shared.deduplicate_and_recalculate(frame.drop(columns=["_candidate_norm", "_cleaned_brand"]))
    duplicate_rows_removed = before_dedup - len(frame)

    final_display_map = frame.groupby(norm_col)[brand_col].first()
    frame[brand_col] = frame[norm_col].map(final_display_map)
    counts = frame.groupby(norm_col)[mall_col].nunique()
    frame[characteristic_col] = frame[norm_col].map(lambda key: "Уникальный" if counts.get(key, 0) == 1 else "Пересекающийся")
    frame.to_csv(shared.BASE_CSV, index=False, encoding="utf-8")

    changes_frame = pd.DataFrame(changes).drop_duplicates()
    changes_frame.to_csv(CHANGES_CSV, index=False, encoding="utf-8")
    summary = {
        "checked_at": shared.CHECKED_AT,
        "rows_before": old_rows,
        "rows_after": len(frame),
        "internal_rows_removed": internal_rows_removed,
        "duplicates_removed_after_merge": duplicate_rows_removed,
        "display_names_before": int(old_displays),
        "display_names_after": int(frame[brand_col].nunique()),
        "normalized_brands_before": int(old_norms),
        "normalized_brands_after": int(frame[norm_col].nunique()),
        "name_or_key_changes": len(changes_frame),
        "category_rows_harmonized": category_changes,
        "malls": int(frame[mall_col].nunique()),
        "duplicate_mall_brand_keys": int(frame.duplicated([mall_col, norm_col]).sum()),
        "empty_brand_names": int(frame[brand_col].eq("").sum()),
        "empty_normalized_keys": int(frame[norm_col].eq("").sum()),
    }
    SUMMARY_JSON.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print(CHANGES_CSV)


if __name__ == "__main__":
    main()
