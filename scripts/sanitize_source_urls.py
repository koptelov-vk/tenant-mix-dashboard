from __future__ import annotations

from pathlib import Path
from urllib.parse import urlparse

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "data" / "processed" / "База_финальная.csv"
AUDIT = ROOT / "data" / "processed" / "invalid_source_url_audit.csv"


def main() -> None:
    frame = pd.read_csv(BASE).fillna("")
    invalid = frame["Источник URL"].astype(str).map(
        lambda value: bool(value.strip()) and urlparse(value.strip()).scheme not in {"http", "https"}
    )
    audit_columns = ["ТЦ/ТРК", "Арендатор / бренд", "Источник", "Источник URL", "Статус подтверждения"]
    frame.loc[invalid, audit_columns].to_csv(AUDIT, index=False, encoding="utf-8")
    frame.loc[invalid, "Источник URL"] = ""
    frame.to_csv(BASE, index=False, encoding="utf-8")
    print(f"invalid placeholders removed from URL field: {int(invalid.sum())}; audit={AUDIT}")


if __name__ == "__main__":
    main()
