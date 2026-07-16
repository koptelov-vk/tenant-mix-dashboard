from __future__ import annotations

import json
from collections import Counter
from urllib.request import Request, urlopen


URL = "https://api.aviapark.com/v1/bootstrap-jsonp?lang=ru&callback=setBootstrap"


def load_bootstrap() -> dict:
    request = Request(URL, headers={"User-Agent": "Mozilla/5.0"})
    raw = urlopen(request, timeout=60).read().decode("utf-8")
    prefix = "setBootstrap("
    if not raw.startswith(prefix) or not raw.endswith(");"):
        raise ValueError("Unexpected Aviapark JSONP response")
    return json.loads(raw[len(prefix) : -2])


def main() -> None:
    payload = load_bootstrap()
    print("center:")
    print(json.dumps(payload.get("center", {}), ensure_ascii=False, indent=2))
    print("top-level keys:")
    for key, value in payload.items():
        length = len(value) if isinstance(value, (list, dict)) else ""
        print(f"  {key}: {type(value).__name__} {length}")

    for candidate in ("departments", "tenants", "places", "shops", "companies", "catalog"):
        items = payload.get(candidate)
        if isinstance(items, list) and items:
            print(f"\n{candidate} sample keys: {sorted(items[0])}")
            print(json.dumps(items[0], ensure_ascii=False, indent=2)[:4000])

    for key, value in payload.items():
        if not isinstance(value, list) or not value or not isinstance(value[0], dict):
            continue
        sections = Counter(str(item.get("section")) for item in value if item.get("section"))
        if sections:
            print(f"\n{key} sections: {sections}")

    departments = payload.get("departments", [])
    print("\ndepartment statuses:", Counter(str(item.get("status")) for item in departments))
    print(
        "department section prefixes:",
        Counter(
            category.split("/", 1)[0]
            for item in departments
            for category in item.get("categories", [])
        ),
    )
    print("departments without categories:", sum(not item.get("categories") for item in departments))
    titles = Counter(item.get("title", "") for item in departments)
    print("duplicate titles:", {key: value for key, value in titles.items() if value > 1})
    print(
        "non-opened:",
        [(item.get("title"), item.get("status"), item.get("categories")) for item in departments if item.get("status") != "opened"],
    )


if __name__ == "__main__":
    main()
