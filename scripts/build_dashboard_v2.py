from __future__ import annotations

import json
import shutil
from pathlib import Path

from build_aggregates import build, write_outputs


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
LEGACY_DIST = ROOT / "dist-legacy"
STYLE_FILES = ["tokens.css", "layout.css", "components.css"]
SCRIPT_FILES = [
    "analytics.js", "navigation.js", "filters.js", "kpi.js", "executive-summary.js",
    "tenant-mix-chart.js", "heatmap.js", "tenant-table.js", "brand-card.js", "mall-card.js",
]


def build_html(payload: dict) -> str:
    template = (SRC / "index.html").read_text(encoding="utf-8")
    styles = "\n".join((SRC / "styles" / name).read_text(encoding="utf-8") for name in STYLE_FILES)
    scripts = "\n".join((SRC / "components" / name).read_text(encoding="utf-8") for name in SCRIPT_FILES)
    scripts += "\n" + (SRC / "app.js").read_text(encoding="utf-8")
    data_json = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    return (
        template.replace("<!-- INLINE_STYLES -->", f"<style>{styles}</style>")
        .replace("<!-- INLINE_DATA -->", f"<script>window.__TENANT_DATA__={data_json};</script>")
        .replace("<!-- INLINE_SCRIPTS -->", f"<script>{scripts}</script>")
    )


def main() -> None:
    payload = build()
    write_outputs(payload)
    html = build_html(payload)
    if LEGACY_DIST.exists():
        shutil.rmtree(LEGACY_DIST)
    (LEGACY_DIST / "assets" / "styles").mkdir(parents=True, exist_ok=True)
    (LEGACY_DIST / "assets" / "components").mkdir(parents=True, exist_ok=True)
    (LEGACY_DIST / "data").mkdir(parents=True, exist_ok=True)
    for name in STYLE_FILES:
        shutil.copy2(SRC / "styles" / name, LEGACY_DIST / "assets" / "styles" / name)
    for name in SCRIPT_FILES:
        shutil.copy2(SRC / "components" / name, LEGACY_DIST / "assets" / "components" / name)
    shutil.copy2(SRC / "app.js", LEGACY_DIST / "assets" / "app.js")
    shutil.copy2(ROOT / "data" / "aggregates" / "dashboard_data.json", LEGACY_DIST / "data" / "dashboard_data.json")
    (LEGACY_DIST / "index.html").write_text(html, encoding="utf-8")
    print(f"built isolated legacy artifact {LEGACY_DIST / 'index.html'} ({len(html):,} chars)")


if __name__ == "__main__":
    main()
