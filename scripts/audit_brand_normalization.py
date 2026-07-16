from __future__ import annotations

import json
import re
import unicodedata
from collections import Counter, defaultdict

import pandas as pd

import update_mega_kazanmall_data as shared


PREFIX_RE = re.compile(
    r"^(?:магазин(?:ы|а)?|салон(?:ы|а)?|бутик(?:и|а)?|островок|отдел|"
    r"одежды(?:\s+и\s+товаров\s+для\s+дома)?|обуви(?:\s+и\s+аксессуаров)?|"
    r"кафе|ресторан)\s+",
    re.IGNORECASE,
)
ADDRESS_RE = re.compile(r"\s*(?:\(адрес\)|\|\s*ТРЦ?\b|\|\s*ТЦ\b).*$", re.IGNORECASE)


def skeleton(value: object) -> str:
    text = unicodedata.normalize("NFKC", str(value or "")).casefold().replace("ё", "е")
    table = str.maketrans({"а": "a", "в": "b", "е": "e", "к": "k", "м": "m", "н": "h", "о": "o", "р": "p", "с": "c", "т": "t", "у": "y", "х": "x"})
    return re.sub(r"[^0-9a-zа-я]+", "", text.translate(table))


def cleaned_candidate(value: object) -> str:
    text = re.sub(r"\s+", " ", str(value or "").replace("\xa0", " ")).strip()
    text = ADDRESS_RE.sub("", text).strip()
    for left, right in (("«", "»"), ("„", "“"), ('"', '"'), ("'", "'")):
        if text.startswith(left) and text.endswith(right) and len(text) > 2:
            text = text[len(left):-len(right)].strip()
            break
    text = PREFIX_RE.sub("", text).strip()
    return text


def main() -> None:
    frame = pd.read_csv(shared.BASE_CSV).fillna("")
    mall_col, brand_col, norm_col = frame.columns[:3]
    unique = frame[[brand_col, norm_col]].drop_duplicates()

    suspicious = []
    for _, row in unique.iterrows():
        brand = str(row[brand_col])
        cleaned = cleaned_candidate(brand)
        reasons = []
        if PREFIX_RE.search(brand):
            reasons.append("служебный префикс")
        if ADDRESS_RE.search(brand):
            reasons.append("адрес/название ТЦ")
        if any(brand.startswith(left) and brand.endswith(right) for left, right in (("«", "»"), ("„", "“"), ('"', '"'), ("'", "'"))):
            reasons.append("кавычки вокруг названия")
        if cleaned and cleaned != brand:
            suspicious.append({"brand": brand, "candidate": cleaned, "reason": "; ".join(reasons)})

    groups = defaultdict(set)
    for brand in unique[brand_col].astype(str):
        groups[skeleton(cleaned_candidate(brand))].add(brand)
    collisions = [
        {"skeleton": key, "brands": sorted(values, key=str.casefold), "count": len(values)}
        for key, values in groups.items()
        if key and len(values) > 1
    ]
    collisions.sort(key=lambda row: (-row["count"], row["skeleton"]))

    exact_norm = frame.groupby(norm_col).agg(rows=(mall_col, "size"), malls=(mall_col, "nunique"), displays=(brand_col, lambda s: sorted(set(map(str, s)), key=str.casefold))).reset_index()
    multi_display = exact_norm[exact_norm["displays"].map(len).gt(1)].sort_values(["malls", "rows"], ascending=False)
    expected_unique = frame.groupby(norm_col)[mall_col].transform("nunique").eq(1)
    actual_unique = frame.iloc[:, 3].eq("Уникальный")

    payload = {
        "rows": len(frame),
        "malls": int(frame[mall_col].nunique()),
        "brands_display": int(frame[brand_col].nunique()),
        "brands_normalized": int(frame[norm_col].nunique()),
        "suspicious": suspicious,
        "skeleton_collisions": collisions,
        "multi_display_norms": multi_display.to_dict("records"),
        "duplicate_mall_brand_keys": int(frame.duplicated([mall_col, norm_col]).sum()),
        "empty_brand_names": int(frame[brand_col].eq("").sum()),
        "empty_normalized_keys": int(frame[norm_col].eq("").sum()),
        "display_to_norm_max_cardinality": int(frame.groupby(brand_col)[norm_col].nunique().max()),
        "norm_to_display_max_cardinality": int(frame.groupby(norm_col)[brand_col].nunique().max()),
        "unique_flag_mismatches": int(expected_unique.ne(actual_unique).sum()),
    }
    out = shared.ROOT / "data" / "processed" / "brand_normalization_audit.json"
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({key: len(value) if isinstance(value, list) else value for key, value in payload.items() if key != "multi_display_norms"}, ensure_ascii=False, indent=2))
    print(out)


if __name__ == "__main__":
    main()
