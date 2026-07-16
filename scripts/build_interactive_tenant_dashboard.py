from __future__ import annotations

import json
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
PROCESSED_DIR = ROOT / "data" / "processed"
OUTPUT_DIR = ROOT / "outputs"
OUTPUT_PATH = OUTPUT_DIR / "tenant-mix-online-dashboard.html"

BASE_CSV = PROCESSED_DIR / "База_финальная.csv"
AREA_CSV = PROCESSED_DIR / "mall_area_reference.csv"
UPCOMING_CSV = PROCESSED_DIR / "upcoming_openings.csv"

ROLE_MAP = {
    "Одежда": "Ритейл",
    "Обувь": "Ритейл",
    "Нижнее белье": "Ритейл",
    "Аксессуары, сумки и ювелирные изделия": "Ритейл",
    "Детские товары": "Ритейл",
    "Красота и здоровье": "Ритейл",
    "Электроника, техника и связь": "Ритейл",
    "Товары для дома, мебель и интерьер": "Ритейл",
    "Продукты и супермаркеты": "Еда",
    "Кафе и рестораны": "Еда",
    "Развлечения и досуг": "Досуг",
    "Спорт и фитнес": "Досуг",
    "Спортивные товары": "Ритейл",
    "Услуги": "Сервисы",
    "Финансовые услуги": "Сервисы",
    "ПВЗ и интернет-сервисы": "Сервисы",
    "Автотовары и автоуслуги": "Ритейл",
    "Зоотовары": "Ритейл",
    "Табак и вейп": "Ритейл",
    "Товары 18+": "Ритейл",
    "Прочее": "Ритейл",
}

MALL_GROUPS = {
    "Нижний Новгород": [
        "Небо",
        "Фантастика",
        "Седьмое небо",
        "Счастье",
        "Жар-Птица",
        "РИО",
        "Золотая Миля",
        "Автозаводец",
        "Парк Авеню",
        "Крым",
        "Океанис",
        "Индиго",
        "Ганза",
        "МЕГА Нижний Новгород",
    ],
    "Все регионы": [
        "Фантастика",
        "Планета Красноярск",
        "Аура",
        "Акварель Волгоград",
        "Галерея Санкт-Петербург",
        "Павелецкий Плаза",
        "Галерея Краснодар",
        "Галерея Новосибирск",
        "Горизонт Ростов",
        "Град Воронеж",
        "Аура Ярославль",
        "KazanMall",
    ],
    "Все объекты": [],
}


def records(frame: pd.DataFrame) -> list[dict]:
    return json.loads(frame.to_json(orient="records", force_ascii=False))


def area_reference() -> dict[str, dict]:
    if not AREA_CSV.exists():
        return {}
    frame = pd.read_csv(AREA_CSV).fillna("")
    if "ТЦ/ТРК" not in frame.columns:
        return {}
    out: dict[str, dict] = {}
    for row in records(frame):
        mall = row.get("ТЦ/ТРК")
        if not mall:
            continue
        out[mall] = {
            "city": row.get("Город", ""),
            "gba": row.get("GBA") or "",
            "gla": row.get("GLA") or "",
            "source": row.get("Источник площади", ""),
            "status": row.get("Статус площади", ""),
            "reliability": row.get("Надежность", ""),
        }
    return out


def upcoming_openings() -> list[dict]:
    if not UPCOMING_CSV.exists():
        return []
    frame = pd.read_csv(UPCOMING_CSV).fillna("")
    columns = {
        "ТЦ/ТРК": "mall",
        "Бренд": "brand",
        "Категория": "category",
        "Статус": "status",
        "Основание": "basis",
        "Дата анонса": "announcedAt",
        "Плановая дата": "plannedAt",
        "Источник URL": "sourceUrl",
        "Проверено": "checkedAt",
        "Надежность": "reliability",
        "Комментарий": "comment",
    }
    for column in columns:
        if column not in frame.columns:
            frame[column] = ""
    return records(frame[list(columns)].rename(columns=columns))


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    base = pd.read_csv(BASE_CSV)
    needed = [
        "ТЦ/ТРК",
        "Арендатор / бренд",
        "brand_normalized",
        "Категория итоговая",
        "Роль tenant-mix",
        "Источник",
        "Источник URL",
        "Статус подтверждения",
        "Требует ручной проверки",
    ]
    for col in needed:
        if col not in base.columns:
            base[col] = ""
    data = base[needed].fillna("").copy()
    data["portfolio_role"] = data["Категория итоговая"].map(ROLE_MAP).fillna("Ритейл")
    data = data.rename(
        columns={
            "ТЦ/ТРК": "mall",
            "Арендатор / бренд": "brand",
            "Категория итоговая": "category",
            "Роль tenant-mix": "role",
            "Источник": "source",
            "Источник URL": "sourceUrl",
            "Статус подтверждения": "confirmation",
            "Требует ручной проверки": "manualCheck",
        }
    )
    malls = sorted(data["mall"].dropna().unique().tolist(), key=str.casefold)
    groups = {name: ([mall for mall in values if mall in malls] if values else malls) for name, values in MALL_GROUPS.items()}
    payload = {
        "rows": records(data),
        "malls": malls,
        "groups": groups,
        "areas": area_reference(),
        "upcomingOpenings": upcoming_openings(),
        "generatedAt": "2026-07-16",
        "source": "data/processed/База_финальная.csv",
    }
    OUTPUT_PATH.write_text(build_html(payload), encoding="utf-8")
    print(OUTPUT_PATH)


def build_html(payload: dict) -> str:
    payload_json = json.dumps(payload, ensure_ascii=False)
    filter_icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16l-6.4 7.2v5.1l-3.2 1.7v-6.8L4 5z"></path></svg>'
    return f"""<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tenant mix dashboard</title>
  <style>
    :root {{
      --ink:#081b4b; --muted:#5b668a; --line:#dfe6f2; --soft:#f4f7fb; --green:#00833e;
      --blue:#1f5fd1; --teal:#009a9a; --rose:#d94f70; --amber:#c88a00; --panel:#ffffff;
    }}
    * {{ box-sizing:border-box; }}
    body {{ margin:0; background:#f6f8fb; color:var(--ink); font-family:"Franklin Gothic Book", "Franklin Gothic Medium", Arial, Helvetica, sans-serif; }}
    .page {{ max-width:1440px; margin:0 auto; padding:22px 24px 28px; }}
    header {{ display:flex; justify-content:space-between; gap:20px; align-items:flex-end; margin-bottom:14px; }}
    h1 {{ margin:0; font-size:30px; line-height:1.05; letter-spacing:0; text-transform:uppercase; }}
    .subtitle {{ margin-top:5px; color:#486096; font-size:13px; }}
    .source {{ text-align:right; color:var(--muted); font-size:12px; line-height:1.35; }}
    .panel {{ background:var(--panel); border:1px solid var(--line); border-radius:8px; box-shadow:0 10px 28px rgba(17,34,68,.06); }}
    .controls {{ padding:12px; margin-bottom:12px; }}
    .control-top {{ display:flex; justify-content:space-between; gap:12px; align-items:flex-start; margin-bottom:10px; }}
    .status-tabs {{ display:flex; gap:8px; flex-wrap:wrap; }}
    button, input, select {{ font:inherit; }}
    .btn {{ border:1px solid #cad5e7; background:#fff; color:var(--ink); border-radius:6px; padding:8px 10px; cursor:pointer; font-weight:700; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }}
    .btn.active {{ border-color:var(--green); background:#e9f7ef; color:#006b33; }}
    .scale-filter-title {{ margin:0; font-size:16px; line-height:1.1; text-transform:uppercase; }}
    .scale-filter-note {{ color:var(--muted); font-size:12px; line-height:1.25; max-width:620px; margin-top:4px; }}
    .active-scale {{ color:var(--green); font-size:12px; font-weight:900; text-align:right; min-width:220px; }}
    .scale-filter-layout {{ display:grid; grid-template-columns:1fr; gap:10px; }}
    .scale-filter-block {{ border:1px solid #e1e8f2; background:#fbfcfe; border-radius:8px; padding:10px; }}
    .scale-filter-block h3 {{ margin:0 0 8px; font-size:12px; text-transform:uppercase; color:#31426f; }}
    .scale-filter-grid {{ display:grid; grid-template-columns:repeat(5, minmax(0,1fr)); gap:7px; }}
    .scale-filter-grid.gba-grid {{ grid-template-columns:repeat(4, minmax(0,1fr)); }}
    .scale-filter-grid.geo-grid {{ grid-template-columns:repeat(4, minmax(0,1fr)); }}
    .scale-filter-btn {{ border:1px solid #cad5e7; background:#fff; color:var(--ink); border-radius:7px; padding:9px 10px; cursor:pointer; font-weight:900; min-height:62px; text-align:left; display:grid; grid-template-columns:18px minmax(0,1fr); gap:8px; align-items:start; }}
    .scale-filter-btn:hover {{ border-color:#a9b8ce; background:#fbfdff; }}
    .scale-filter-btn.active {{ border-color:var(--green); background:#e9f7ef; color:#006b33; box-shadow:inset 0 0 0 1px rgba(0,131,62,.18); }}
    .scale-filter-check {{ width:16px; height:16px; margin:2px 0 0; accent-color:var(--green); cursor:pointer; }}
    .scale-filter-copy {{ min-width:0; display:grid; gap:2px; }}
    .scale-filter-btn .range {{ font-size:12px; }}
    .scale-filter-btn .count {{ color:var(--muted); font-size:10.5px; font-weight:800; }}
    .scale-filter-btn.active .count {{ color:#007238; }}
    .kpis {{ display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; margin-bottom:12px; }}
    .kpi {{ position:relative; padding:13px 14px; min-height:82px; }}
    .kpi-head {{ display:flex; align-items:center; justify-content:space-between; gap:8px; }}
    .kpi .label {{ font-size:11px; color:var(--muted); text-transform:uppercase; font-weight:800; }}
    .kpi .value {{ margin-top:8px; font-size:30px; color:var(--green); font-weight:900; }}
    .kpi .note {{ margin-top:5px; font-size:12px; color:var(--muted); }}
    .kpi-filter-button {{ flex:0 0 auto; width:24px; height:24px; border:1px solid #cbd6e7; border-radius:4px; background:#fff; color:#17275d; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; }}
    .kpi-filter-button:hover {{ border-color:#9fb0c9; background:#f9fbfe; }}
    .kpi-filter-button.active {{ border-color:var(--green); background:#eaf7ef; color:var(--green); }}
    .kpi-filter-button svg {{ width:13px; height:13px; stroke:currentColor; stroke-width:2.2; fill:none; stroke-linecap:round; stroke-linejoin:round; pointer-events:none; }}
    .upcoming-panel {{ padding:14px; margin-bottom:12px; }}
    .upcoming-head {{ display:flex; align-items:flex-start; justify-content:space-between; gap:14px; margin-bottom:11px; }}
    .upcoming-head h2 {{ margin:0 0 4px; font-size:16px; text-transform:uppercase; }}
    .upcoming-hint {{ color:var(--muted); font-size:12px; line-height:1.3; }}
    .upcoming-count {{ flex:0 0 auto; color:#006f35; background:#e9f7ef; border:1px solid #b9dfc9; border-radius:6px; padding:7px 10px; font-size:12px; font-weight:900; }}
    .upcoming-grid {{ display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:9px; align-items:start; }}
    .upcoming-column {{ display:grid; gap:9px; align-content:start; min-width:0; }}
    .upcoming-mall {{ border:1px solid #e1e8f2; border-radius:7px; overflow:hidden; background:#fbfcfe; min-width:0; width:100%; }}
    .upcoming-mall-head {{ display:flex; align-items:center; justify-content:space-between; gap:8px; padding:9px 10px; background:#f2f6fa; border-bottom:1px solid #e1e8f2; }}
    .upcoming-mall-title {{ font-size:12px; font-weight:900; text-transform:uppercase; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }}
    .upcoming-mall-total {{ color:var(--green); font-size:11px; font-weight:900; white-space:nowrap; }}
    .upcoming-list {{ display:grid; }}
    .upcoming-item {{ display:grid; grid-template-columns:minmax(0, 1fr) auto; gap:8px; padding:9px 10px; border-bottom:1px solid #e8eef5; }}
    .upcoming-item:last-child {{ border-bottom:0; }}
    .upcoming-brand {{ font-size:13px; font-weight:900; line-height:1.15; overflow-wrap:anywhere; }}
    .upcoming-meta {{ margin-top:3px; color:var(--muted); font-size:10.5px; line-height:1.25; overflow-wrap:anywhere; }}
    .upcoming-side {{ display:flex; flex-direction:column; align-items:flex-end; gap:5px; }}
    .upcoming-date {{ color:#31426f; font-size:10.5px; font-weight:800; white-space:nowrap; }}
    .upcoming-link {{ display:inline-flex; align-items:center; gap:4px; color:#006f35; font-size:10.5px; font-weight:900; text-decoration:none; white-space:nowrap; }}
    .upcoming-link:hover {{ text-decoration:underline; }}
    .upcoming-confidence {{ display:inline-block; border-radius:4px; padding:2px 5px; font-size:9px; font-weight:900; text-transform:uppercase; }}
    .upcoming-confidence.high {{ background:#e8f6ee; color:#007238; }}
    .upcoming-confidence.medium {{ background:#fff4dc; color:#8a5b00; }}
    .upcoming-empty {{ grid-column:1 / -1; padding:14px; color:var(--muted); background:#fbfcfe; border:1px dashed #cdd8e8; border-radius:7px; font-size:12px; }}
    .mall-summary {{ display:grid; gap:10px; margin-bottom:12px; }}
    .mall-card {{ padding:13px 14px 10px; min-height:132px; }}
    .mall-card-title {{ text-align:center; font-size:11px; font-weight:900; color:var(--ink); text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:8px; }}
    .mall-card-main {{ display:grid; grid-template-columns:48px 1fr; gap:9px; align-items:center; }}
    .mall-card-head {{ display:grid; grid-template-columns:1fr 20px; gap:8px; align-items:center; margin-bottom:8px; }}
    .mall-badge {{ width:44px; height:44px; border-radius:50%; display:grid; place-items:center; color:#fff; background:var(--green); font-size:18px; font-weight:900; letter-spacing:0; }}
    .mall-highlight {{ display:grid; place-items:center; width:18px; height:18px; border:1px solid #b9c6da; border-radius:4px; cursor:pointer; background:#fff; }}
    .mall-highlight input {{ width:13px; height:13px; margin:0; accent-color:var(--green); cursor:pointer; }}
    .mall-card-value {{ color:var(--green); font-size:30px; line-height:.95; font-weight:900; }}
    .mall-card-label {{ color:var(--green); font-size:12px; font-weight:900; margin-top:2px; }}
    .mall-card-note {{ border-top:1px solid #e7edf5; margin-top:10px; padding-top:8px; text-align:center; font-size:11px; color:var(--ink); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }}
    .mall-card-area {{ margin-top:5px; min-height:25px; text-align:center; font-size:10.5px; line-height:1.2; color:var(--muted); white-space:normal; overflow:visible; }}
    .grid {{ display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:12px; margin-bottom:12px; }}
    .section {{ padding:14px; }}
    .section h2 {{ margin:0 0 4px; font-size:16px; text-transform:uppercase; }}
    .section .hint {{ color:var(--muted); font-size:12px; margin-bottom:10px; }}
    .bars {{ display:grid; gap:8px; }}
    .bar-row {{ display:grid; grid-template-columns:210px 1fr 62px; gap:10px; align-items:center; min-height:26px; }}
    .bar-label {{ font-size:12px; font-weight:800; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }}
    .bar-track {{ height:15px; background:#eef3f8; border-radius:4px; position:relative; overflow:hidden; }}
    .bar-fill {{ height:100%; border-radius:4px; background:var(--green); min-width:2px; }}
    .bar-value {{ font-size:12px; font-weight:900; text-align:right; }}
    .scale-list {{ display:grid; gap:10px; }}
    .scale-row {{ position:relative; display:grid; grid-template-columns:170px minmax(305px,1fr) 132px; gap:12px; align-items:center; min-height:92px; padding:9px 10px; border:1px solid #e1e8f2; border-radius:6px; background:#fff; box-shadow:0 1px 2px rgba(18,36,70,.035); overflow:hidden; }}
    .scale-row:nth-child(even) {{ background:#f8fafc; }}
    .scale-row::after {{ content:""; position:absolute; inset:auto 10px 0; height:1px; background:linear-gradient(90deg, transparent, #e6ecf4 12%, #e6ecf4 88%, transparent); opacity:.8; }}
    .scale-label {{ position:relative; padding-left:12px; font-size:12px; font-weight:900; line-height:1.16; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }}
    .scale-label::before {{ content:""; position:absolute; left:0; top:50%; width:3px; height:34px; max-height:90%; border-radius:2px; background:var(--green); transform:translateY(-50%); }}
    .scale-wrap {{ position:relative; height:80px; min-width:0; }}
    .scale-svg {{ width:100%; height:80px; display:block; overflow:visible; }}
    .axis-band {{ stroke:#eef3f8; stroke-width:10; stroke-linecap:round; }}
    .axis-line {{ stroke:#8b98bd; stroke-width:1.45; stroke-linecap:round; }}
    .marker-line {{ stroke-width:1.25; opacity:.46; }}
    .marker-dot {{ stroke:#fff; stroke-width:2.1; filter:drop-shadow(0 1px 1px rgba(18,36,70,.18)); }}
    .marker-flag {{ filter:drop-shadow(0 1px 2px rgba(18,36,70,.24)); }}
    .tick-label {{ fill:#071a4b; font-size:9.8px; font-weight:900; }}
    .scale-legend {{ display:grid; grid-template-columns:1fr 1fr; gap:3px 8px; align-content:center; min-width:0; min-height:58px; padding:8px 12px; border:1px solid #e0e7f1; border-left:3px solid #c5d1e2; border-radius:5px; background:rgba(242,246,251,.9); }}
    .scale-legend span {{ font-size:9.5px; font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }}
    .split {{ display:grid; gap:9px; }}
    .split-row {{ display:grid; grid-template-columns:78px 1fr 48px; gap:8px; align-items:center; }}
    .stack {{ display:flex; height:16px; border-radius:4px; overflow:hidden; background:#edf2f7; }}
    .seg {{ height:100%; min-width:1px; }}
    .seg.retail {{ background:var(--blue); }} .seg.food {{ background:var(--green); }}
    .seg.service {{ background:var(--teal); }} .seg.leisure {{ background:var(--rose); }}
    .legend {{ display:flex; gap:12px; flex-wrap:wrap; margin-top:10px; color:var(--muted); font-size:12px; }}
    .dot {{ display:inline-block; width:9px; height:9px; border-radius:50%; margin-right:5px; vertical-align:middle; }}
    .matrix {{ display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:8px; }}
    .pair {{ display:grid; grid-template-columns:1fr 48px; gap:8px; padding:7px 8px; background:#f6f9fc; border:1px solid #e5ebf4; border-radius:6px; font-size:12px; }}
    .pair b {{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }}
    .table-panel {{ padding:14px; }}
    .table-tools {{ display:flex; gap:10px; justify-content:space-between; align-items:center; margin-bottom:10px; }}
    .select {{ border:1px solid #cad5e7; background:#fff; color:var(--ink); border-radius:6px; padding:8px 10px; font-weight:700; max-width:260px; }}
    table {{ width:100%; border-collapse:collapse; font-size:12px; table-layout:fixed; }}
    col.col-brand {{ width:22%; }}
    col.col-status {{ width:15%; }}
    col.col-category {{ width:22%; }}
    col.col-malls {{ width:19%; }}
    col.col-source {{ width:22%; }}
    th, td {{ border-bottom:1px solid #e7edf5; padding:8px 7px; text-align:left; vertical-align:top; }}
    td {{ overflow:hidden; text-overflow:ellipsis; overflow-wrap:anywhere; }}
    th {{ color:#17275d; font-size:11px; text-transform:uppercase; background:#f7f9fc; position:sticky; top:0; z-index:1; }}
    .th-filter {{ display:flex; align-items:center; justify-content:space-between; gap:6px; min-width:0; }}
    .th-filter span:first-child {{ overflow:hidden; text-overflow:ellipsis; }}
    .filter-cell {{ position:relative; flex:0 0 auto; }}
    .excel-filter {{ width:22px; height:22px; border:1px solid #cbd6e7; border-radius:4px; background:#fff; color:#17275d; display:inline-flex; align-items:center; justify-content:center; box-shadow:0 1px 2px rgba(16,32,64,.04); cursor:pointer; }}
    .excel-filter:hover {{ border-color:#9fb0c9; background:#f9fbfe; }}
    .excel-filter.active {{ border-color:var(--green); background:#eaf7ef; color:var(--green); }}
    .excel-filter svg {{ width:13px; height:13px; stroke:currentColor; stroke-width:2.2; fill:none; stroke-linecap:round; stroke-linejoin:round; pointer-events:none; }}
    thead, thead tr, th {{ overflow:visible; }}
    thead th {{ z-index:40; }}
    .filter-menu {{ position:fixed; top:var(--filter-menu-top, 0px); left:var(--filter-menu-left, 0px); width:var(--filter-menu-width, 320px); max-width:calc(100vw - 24px); background:#fff; border:1px solid #cbd6e7; border-radius:6px; box-shadow:0 12px 28px rgba(18,36,70,.18); padding:8px; z-index:1000; display:none; text-transform:none; color:var(--ink); }}
    .filter-menu.open {{ display:block; }}
    .filter-menu-head {{ display:grid; grid-template-columns:1fr; gap:7px; margin-bottom:7px; padding-bottom:7px; border-bottom:1px solid #e8eef6; }}
    .filter-menu-title {{ font-size:12px; font-weight:900; color:#071a4b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }}
    .filter-sort-actions {{ display:grid; grid-template-columns:1fr 1fr; gap:6px; }}
    .filter-sort {{ border:1px solid #d8e1ee; background:#fff; color:#17275d; border-radius:5px; padding:6px 7px; font:800 11px "Franklin Gothic Book", "Franklin Gothic Medium", Arial, sans-serif; cursor:pointer; }}
    .filter-sort:hover, .filter-sort.active {{ border-color:#9bc9ae; background:#eaf7ef; color:#006f35; }}
    .filter-search {{ width:100%; min-width:0; border:1px solid #cbd6e7; border-radius:5px; padding:7px 8px; color:var(--ink); background:#fff; font-size:12px; outline:none; }}
    .filter-search:focus {{ border-color:var(--green); box-shadow:0 0 0 2px rgba(0,131,62,.1); }}
    .filter-actions {{ display:grid; grid-template-columns:1fr 1fr; gap:6px; }}
    .filter-action {{ border:0; background:#eef3f8; color:#17275d; border-radius:5px; padding:6px 7px; font:800 11px "Franklin Gothic Book", "Franklin Gothic Medium", Arial, sans-serif; cursor:pointer; }}
    .filter-action:hover {{ background:#dfe8f4; }}
    .filter-action.clear {{ background:#fff0ed; color:#b13d20; }}
    .filter-action.clear:hover {{ background:#ffe3dc; }}
    .filter-options {{ max-height:var(--filter-options-height, 310px); overflow:auto; display:grid; gap:3px; overscroll-behavior:contain; }}
    .filter-option {{ display:flex; align-items:center; gap:7px; padding:5px 4px; border-radius:4px; font-size:12px; font-weight:700; color:#24345d; cursor:pointer; }}
    .filter-option:hover {{ background:#f4f7fb; }}
    .filter-option input {{ width:14px; height:14px; accent-color:var(--green); flex:0 0 auto; }}
    .filter-option span {{ min-width:0; overflow-wrap:anywhere; }}
    .filter-empty {{ padding:7px 4px; color:var(--muted); font-size:12px; }}
    .table-reset[hidden] {{ display:none; }}
    tbody tr:hover {{ background:#fbfcff; }}
    .badge {{ display:inline-block; border-radius:999px; padding:3px 8px; font-weight:800; font-size:11px; }}
    .badge.unique {{ background:#e8f6ee; color:#007238; }}
    .badge.intersect {{ background:#eef3ff; color:#214dba; }}
    .muted {{ color:var(--muted); }}
    .scroll {{ max-height:520px; overflow:auto; border:1px solid #e5ebf4; border-radius:6px; }}
    .source-link {{ color:#0b6f3c; font-weight:800; text-decoration:underline; text-decoration-thickness:1px; text-underline-offset:2px; overflow-wrap:anywhere; }}
    .source-link:hover {{ color:#07572f; }}
    .source-link:focus-visible {{ outline:2px solid #7bc79b; outline-offset:2px; border-radius:2px; }}
    @media (max-width: 980px) {{
      header, .control-top, .grid, .table-tools {{ display:block; }}
      .kpis {{ grid-template-columns:repeat(2, 1fr); }}
      .mall-summary {{ grid-template-columns:repeat(2, minmax(0,1fr)) !important; }}
      .mall-card-value {{ font-size:24px; }}
      .scale-filter-grid, .scale-filter-grid.gba-grid, .scale-filter-grid.geo-grid {{ grid-template-columns:repeat(2, minmax(0,1fr)); }}
      .upcoming-grid {{ grid-template-columns:repeat(2, minmax(0,1fr)); }}
      .active-scale {{ text-align:left; margin-top:7px; min-width:0; }}
      .matrix {{ grid-template-columns:1fr; }}
      .bar-row {{ grid-template-columns:130px 1fr 48px; }}
      .source {{ text-align:left; margin-top:8px; }}
      .select {{ width:100%; margin-top:8px; }}
    }}
    @media (max-width: 720px) {{
      html, body {{ width:100%; max-width:100%; overflow-x:hidden; }}
      .page {{ padding:14px 10px 22px; }}
      .page, .panel, .controls, .section, .table-panel {{ width:100%; max-width:100%; min-width:0; }}
      header {{ gap:8px; margin-bottom:10px; }}
      h1 {{ font-size:22px; line-height:1.08; }}
      .subtitle, .source {{ font-size:11px; line-height:1.25; overflow-wrap:anywhere; }}
      .subtitle {{ display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }}
      .controls, .section, .table-panel {{ padding:10px; }}
      .btn {{ padding:9px 8px; font-size:12px; }}
      .scale-filter-title {{ font-size:14px; }}
      .scale-filter-note, .active-scale {{ font-size:11px; }}
      .scale-filter-layout {{ gap:8px; }}
      .scale-filter-block {{ padding:9px; }}
      .scale-filter-grid, .scale-filter-grid.gba-grid, .scale-filter-grid.geo-grid {{ grid-template-columns:1fr; gap:6px; }}
      .scale-filter-btn {{ min-height:48px; padding:8px 9px; }}
      .kpis {{ grid-template-columns:1fr; gap:8px; }}
      .kpi {{ min-height:auto; padding:11px 12px; }}
      .kpi .value {{ font-size:26px; margin-top:5px; }}
      .upcoming-panel {{ padding:11px; }}
      .upcoming-head {{ display:block; }}
      .upcoming-hint {{ overflow-wrap:anywhere; }}
      .upcoming-count {{ display:inline-block; margin-top:8px; }}
      .upcoming-grid {{ grid-template-columns:1fr; gap:7px; }}
      .upcoming-grid, .upcoming-mall, .upcoming-list, .upcoming-item {{ min-width:0; max-width:100%; }}
      .upcoming-mall-head > * {{ min-width:0; }}
      .upcoming-item {{ grid-template-columns:1fr; padding:8px 9px; }}
      .upcoming-side {{ flex-direction:row; align-items:center; justify-content:flex-start; flex-wrap:wrap; gap:4px 8px; min-width:0; }}
      .upcoming-date, .upcoming-link {{ white-space:normal; }}
      .mall-summary {{ grid-template-columns:1fr !important; gap:8px; }}
      .mall-card {{ min-height:142px; padding:11px 12px 10px; }}
      .mall-card-title {{ text-align:left; padding-right:2px; }}
      .mall-card-note {{ white-space:normal; line-height:1.2; }}
      .mall-card-area {{ white-space:normal; line-height:1.2; font-size:10px; }}
      .section h2 {{ font-size:14px; line-height:1.15; }}
      .section .hint {{ font-size:11px; }}
      .scale-list {{ gap:10px; }}
      .scale-row {{ grid-template-columns:1fr; gap:6px; align-items:stretch; min-height:0; padding:10px; border:1px solid #e1e8f2; }}
      .scale-row:last-child {{ border-bottom:1px solid #e1e8f2; }}
      .scale-label {{ font-size:12px; -webkit-line-clamp:3; }}
      .scale-wrap {{ height:88px; padding:0 4px; }}
      .scale-svg {{ height:88px; }}
      .scale-legend {{ grid-template-columns:repeat(2, minmax(0,1fr)); gap:3px 10px; min-height:0; padding:8px 10px; }}
      .scale-legend span {{ font-size:10px; }}
      .bar-row {{ grid-template-columns:1fr 52px; gap:6px 8px; }}
      .bar-label {{ grid-column:1 / -1; white-space:normal; line-height:1.15; }}
      .bar-track {{ height:14px; }}
      .matrix {{ grid-template-columns:1fr; }}
      .split-row {{ grid-template-columns:70px 1fr 42px; }}
      .table-tools {{ display:block; }}
      .select {{ max-width:none; }}
      .scroll {{ max-height:70vh; overflow-y:auto; overflow-x:hidden; border:0; border-radius:0; overscroll-behavior:contain; }}
      table {{ min-width:0; display:block; table-layout:auto; font-size:11px; }}
      colgroup {{ display:none; }}
      thead, tbody {{ display:block; }}
      thead {{ position:sticky; top:0; z-index:35; padding:6px; border:1px solid #dfe7f2; border-radius:6px; background:#f4f7fb; box-shadow:0 4px 10px rgba(18,36,70,.08); }}
      thead tr {{ display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:6px; }}
      thead th {{ position:static; display:block; min-width:0; padding:6px 7px; border:1px solid #dbe4f0; border-radius:4px; background:#fff; }}
      thead th:last-child {{ grid-column:1 / -1; }}
      .th-filter {{ min-height:24px; }}
      tbody {{ display:grid; gap:8px; padding-top:8px; }}
      tbody tr {{ display:grid; grid-template-columns:minmax(0,1fr) auto; border:1px solid #dfe7f2; border-radius:6px; background:#fff; box-shadow:0 1px 2px rgba(18,36,70,.035); overflow:hidden; }}
      tbody td {{ display:block; min-width:0; padding:8px 10px; border-bottom:1px solid #e9eef5; background:#fff; overflow:visible; }}
      tbody td::before {{ content:attr(data-label); display:block; margin-bottom:3px; color:#667492; font-size:9px; font-weight:900; text-transform:uppercase; }}
      tbody td:first-child {{ grid-column:1; }}
      tbody td:nth-child(2) {{ grid-column:2; min-width:108px; }}
      tbody td:nth-child(n+3) {{ grid-column:1 / -1; }}
      tbody td:last-child {{ border-bottom:0; }}
      tbody tr:has(td[colspan]) td {{ grid-column:1 / -1; }}
      .source-link {{ display:inline-block; max-width:100%; }}
    }}
    @media (max-width: 520px) {{
      .mall-card-main {{ grid-template-columns:42px 1fr; }}
      .mall-badge {{ width:38px; height:38px; font-size:15px; }}
      .mall-card-value {{ font-size:24px; }}
      .scale-legend span {{ font-size:9.5px; }}
    }}
  </style>
</head>
<body>
<div class="page">
  <header>
    <div>
      <h1>Сравнение tenant mix</h1>
      <div class="subtitle">Интерактивный пересчет уникальных и пересекающихся брендов по выбранным объектам</div>
    </div>
    <div class="source">Источник: База_финальная.csv<br/>Снимок данных: {payload["generatedAt"]}</div>
  </header>

  <section class="panel controls">
    <div class="control-top">
      <div>
        <h2 class="scale-filter-title">Выбрать сопоставимые</h2>
        <div class="scale-filter-note">Классификация по общей площади объекта (GBA). Можно выбрать несколько форматов и географий одновременно.</div>
      </div>
      <div class="active-scale" id="activeScaleLabel"></div>
    </div>
    <div class="scale-filter-layout">
      <div class="scale-filter-block">
        <h3>По GBA</h3>
        <div class="scale-filter-grid gba-grid" id="gbaFilters"></div>
      </div>
      <div class="scale-filter-block">
        <h3>По географии</h3>
        <div class="scale-filter-grid geo-grid" id="geoFilters"></div>
      </div>
    </div>
  </section>

  <section class="kpis">
    <div class="panel kpi" data-kpi-filter="malls"><div class="kpi-head"><div class="label">Выбрано объектов в срезе</div><button class="kpi-filter-button" type="button" title="Фильтр по объектам">{filter_icon}</button></div><div class="value" id="kpiMalls">0</div><div class="filter-menu kpi-filter-menu"></div></div>
    <div class="panel kpi" data-kpi-filter="cities"><div class="kpi-head"><div class="label">Выбрано городов в срезе</div><button class="kpi-filter-button" type="button" title="Фильтр по городам">{filter_icon}</button></div><div class="value" id="kpiCities">0</div><div class="filter-menu kpi-filter-menu"></div></div>
    <div class="panel kpi" data-kpi-filter="tenants"><div class="kpi-head"><div class="label">Арендаторов в срезе</div><button class="kpi-filter-button" type="button" title="Фильтр по арендаторам">{filter_icon}</button></div><div class="value" id="kpiRows">0</div><div class="filter-menu kpi-filter-menu"></div></div>
    <div class="panel kpi" data-kpi-filter="brands"><div class="kpi-head"><div class="label">Брендов в срезе</div><button class="kpi-filter-button" type="button" title="Фильтр по брендам">{filter_icon}</button></div><div class="value" id="kpiBrands">0</div><div class="filter-menu kpi-filter-menu"></div></div>
  </section>

  <section class="panel upcoming-panel" id="upcomingPanel">
    <div class="upcoming-head">
      <div>
        <h2>Скоро открытие</h2>
        <div class="upcoming-hint">Коммерческие арендаторы с актуальным анонсом на официальном сайте ТЦ. Состав меняется вместе с выбранными фильтрами.</div>
      </div>
      <div class="upcoming-count" id="upcomingCount">0 анонсов</div>
    </div>
    <div class="upcoming-grid" id="upcomingGrid"></div>
  </section>

  <section class="mall-summary" id="mallSummary"></section>

  <section class="grid">
    <div class="panel section">
      <h2>1. Уникальные бренды по категориям</h2>
      <div class="hint">Бренд представлен только в одном выбранном объекте</div>
      <div class="scale-list" id="uniqueBars"></div>
    </div>
    <div class="panel section">
      <h2>2. Пересекающиеся бренды по категориям</h2>
      <div class="hint">Бренд представлен в двух и более выбранных объектах</div>
      <div class="scale-list" id="intersectBars"></div>
    </div>
  </section>

  <section class="panel section" style="margin-bottom:12px;">
    <h2>3. Общее количество арендаторов в категориях</h2>
    <div class="hint">Топ категорий по числу брендов в выбранном срезе</div>
    <div class="bars" id="totalBars"></div>
  </section>

  <section class="panel table-panel">
    <div class="table-tools">
      <div>
        <h2 style="margin:0 0 4px;font-size:16px;text-transform:uppercase;">4. Реестр брендов в текущем срезе</h2>
        <div class="hint" id="tableHint" style="margin:0;color:var(--muted);font-size:12px;"></div>
      </div>
      <button class="btn table-reset" id="resetTableFilters" type="button" hidden>Сбросить фильтры</button>
    </div>
    <div class="scroll">
      <table>
        <colgroup>
          <col class="col-brand" />
          <col class="col-status" />
          <col class="col-category" />
          <col class="col-malls" />
          <col class="col-source" />
        </colgroup>
        <thead>
          <tr>
            <th><div class="th-filter"><span>Бренд</span><div class="filter-cell" data-column="brand"><button class="excel-filter" type="button" title="Фильтр по бренду">{filter_icon}</button><div class="filter-menu"></div></div></div></th>
            <th><div class="th-filter"><span>Характеристика</span><div class="filter-cell" data-column="status"><button class="excel-filter" type="button" title="Фильтр по характеристике">{filter_icon}</button><div class="filter-menu"></div></div></div></th>
            <th><div class="th-filter"><span>Категория</span><div class="filter-cell" data-column="category"><button class="excel-filter" type="button" title="Фильтр по категории">{filter_icon}</button><div class="filter-menu"></div></div></div></th>
            <th><div class="th-filter"><span>Объекты</span><div class="filter-cell" data-column="malls"><button class="excel-filter" type="button" title="Фильтр по объекту">{filter_icon}</button><div class="filter-menu"></div></div></div></th>
            <th><div class="th-filter"><span>Источник</span><div class="filter-cell" data-column="source"><button class="excel-filter" type="button" title="Фильтр по источнику">{filter_icon}</button><div class="filter-menu"></div></div></div></th>
          </tr>
        </thead>
        <tbody id="brandTable"></tbody>
      </table>
    </div>
  </section>
</div>

<script>
const DATA = {payload_json};
const rows = DATA.rows;
const malls = DATA.malls;
const areas = DATA.areas || {{}};
const upcomingOpenings = DATA.upcomingOpenings || [];
let baseSelected = new Set();
let selected = new Set();
let activeScaleIds = new Set(["superregional"]);
let activeGeoIds = new Set(["nn", "all_regions"]);
let highlightedMall = "Фантастика";
let kpiFilters = {{malls:[], cities:[], tenants:[], brands:[]}};
let kpiFilterSearch = {{malls:"", cities:"", tenants:"", brands:""}};
let openKpiFilter = null;
let tableColumnFilters = {{brand:[], status:[], category:[], malls:[], source:[]}};
let tableFilterSearch = {{brand:"", status:"", category:"", malls:"", source:""}};
let tableSort = {{column:"brand", direction:"asc"}};
let openColumnFilter = null;
let upcomingColumnLayout = 0;

const fmt = n => new Intl.NumberFormat("ru-RU").format(Math.round(n || 0));
const objectWord = n => {{
  const value = Math.abs(Math.round(n || 0));
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 >= 11 && mod100 <= 14) return "объектов";
  if (mod10 === 1) return "объект";
  if (mod10 >= 2 && mod10 <= 4) return "объекта";
  return "объектов";
}};
const fmtArea = n => n ? `${{fmt(n)}} м²` : "н/д";
const uniq = arr => [...new Set(arr.filter(Boolean))];
const normText = s => String(s || "").toLocaleLowerCase("ru-RU").replaceAll("ё", "е");
const escapeHtml = s => String(s || "").replace(/[&<>"']/g, ch => ({{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}}[ch]));
const normalizedBrandLabels = new Map();
rows.forEach(row => {{
  const key = row.brand_normalized || normText(row.brand);
  if (key && !normalizedBrandLabels.has(key)) normalizedBrandLabels.set(key, row.brand || key);
}});
function safeExternalUrl(value) {{
  let raw = String(value || "").trim();
  if (!raw) return "";
  if (/^www\\./i.test(raw)) raw = `https://${{raw}}`;
  try {{
    const url = new URL(raw);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  }} catch (_error) {{
    return "";
  }}
}}
const palette = ["#2F6FED", "#00A87E", "#F26B42", "#7C3AED", "#008A3D", "#D94F70", "#C88A00", "#00A6A6", "#4B5DBA", "#9C5A2E"];
const knownShort = {{
  "Фантастика":"ФН", "Небо":"НБ", "Жар-Птица":"ЖП", "Океанис":"ОК",
  "Планета Красноярск":"ПК", "Аура":"АУ", "Акварель Волгоград":"АВ", "Галерея Санкт-Петербург":"ГСП", "Павелецкий Плаза":"ПП",
  "МореМолл":"ММ", "Индиго":"ИН", "Ганза":"ГЗ", "РИО":"РИО",
  "Галерея Краснодар":"ГКР", "Галерея Новосибирск":"ГНС", "Горизонт Ростов":"ГОР", "Град Воронеж":"ГВР", "Аура Ярославль":"АЯР",
  "МЕГА Нижний Новгород":"МЕГ", "KazanMall":"КЗМ", "Авиапарк":"АВП"
}};
const scaleShort = {{
  "Автозаводец":"АВТ",
  "Акварель Волгоград":"АКВ",
  "Алмаз Челябинск":"АЛЧ",
  "Аура":"АУР",
  "Галерея Санкт-Петербург":"ГСП",
  "Галерея Краснодар":"ГКР",
  "Галерея Новосибирск":"ГНС",
  "Ганза":"ГАН",
  "Горизонт Ростов":"ГОР",
  "Град Воронеж":"ГВР",
  "Жар-Птица":"ЖП",
  "Золотая Миля":"ЗМ",
  "Индиго":"ИНД",
  "Кристалл Тюмень":"КРТ",
  "KazanMall":"КЗМ",
  "Крым":"КРЫМ",
  "МореМолл":"МОР",
  "МЕГА Нижний Новгород":"МЕГ",
  "Небо":"НЕБ",
  "Океанис":"ОКЕ",
  "Парк Авеню":"ПА",
  "Павелецкий Плаза":"ПП",
  "Планета Красноярск":"ПЛК",
  "Планета Уфа":"ПЛУ",
  "РИО":"РИО",
  "Седьмое небо":"7Н",
  "Счастье":"СЧ",
  "Фантастика":"ФАН",
  "Аура Ярославль":"АЯР"
  ,"Авиапарк":"АВП"
}};
const mallDisplay = {{
  "Автозаводец":"Автозаводец НН",
  "Аура":"Аура Новосибирск",
  "Аура Ярославль":"Аура Ярославль",
  "Галерея Краснодар":"Галерея Краснодар",
  "Галерея Новосибирск":"Галерея Новосибирск",
  "Ганза":"Ганза НН",
  "Горизонт Ростов":"Горизонт Ростов",
  "Град Воронеж":"Град Воронеж",
  "Жар-Птица":"Жар-Птица НН",
  "Золотая Миля":"Золотая Миля НН",
  "Индиго":"Индиго НН",
  "Крым":"Крым НН",
  "KazanMall":"KazanMall Казань",
  "МореМолл":"МореМолл Сочи",
  "МЕГА Нижний Новгород":"МЕГА НН",
  "Небо":"Небо НН",
  "Океанис":"Океанис НН",
  "Павелецкий Плаза":"Павелецкий Плаза Москва",
  "Парк Авеню":"Парк Авеню НН",
  "РИО":"РИО НН",
  "Седьмое небо":"Седьмое небо НН",
  "Счастье":"Счастье НН",
  "Фантастика":"Фантастика НН"
  ,"Авиапарк":"Авиапарк Москва"
}};
function mallColor(mall) {{
  const idx = Math.max(0, malls.indexOf(mall));
  return palette[idx % palette.length];
}}
function displayMall(mall) {{
  return mallDisplay[mall] || mall;
}}
function shortMall(mall) {{
  if (scaleShort[mall]) return scaleShort[mall].toLocaleUpperCase("ru-RU");
  if (knownShort[mall]) return knownShort[mall].toLocaleUpperCase("ru-RU");
  return mall.split(/\\s+/).map(w => w[0]).join("").slice(0, 3).toLocaleUpperCase("ru-RU");
}}
function scaleShortMall(mall) {{
  return shortMall(mall);
}}

const SCALE_FILTERS = [
  {{id:"district", group:"gba", label:"Районные", range:"GBA 7 500-50 000 м²", metric:"gba", min:7500, max:50000}},
  {{id:"regional", group:"gba", label:"Региональные", range:"GBA 50 000-120 000 м²", metric:"gba", min:50000, max:120000}},
  {{id:"superregional", group:"gba", label:"Суперрегиональные", range:"GBA от 120 000 м²", metric:"gba", min:120000, max:null}},
  {{id:"no_area", group:"gba", label:"Нет данных по GBA/GLA", range:"GBA и GLA отсутствуют", kind:"no_area"}}
];

const GEO_FILTERS = [
  {{id:"moscow", label:"Москва", range:"", city:"Москва"}},
  {{id:"spb", label:"Санкт-Петербург", range:"", city:"Санкт-Петербург"}},
  {{id:"nn", label:"Нижний Новгород", range:"", city:"НН"}},
  {{id:"all_regions", label:"Регионы", range:"", kind:"regions"}}
];

function init() {{
  renderScaleFilters();
  applyScaleFilters(false);
  document.addEventListener("click", event => {{
    const kpiButton = event.target.closest(".kpi-filter-button");
    const button = event.target.closest(".excel-filter");
    const menu = event.target.closest(".filter-menu");
    if (kpiButton) {{
      const card = kpiButton.closest("[data-kpi-filter]");
      openKpiFilter = openKpiFilter === card.dataset.kpiFilter ? null : card.dataset.kpiFilter;
      openColumnFilter = null;
      renderKpiMenus();
      document.querySelectorAll("[data-column] .filter-menu").forEach(el => el.classList.remove("open"));
      updateTableHeaderStates();
      positionOpenKpiMenu();
      event.stopPropagation();
      return;
    }}
    if (button) {{
      const cell = button.closest("[data-column]");
      openColumnFilter = openColumnFilter === cell.dataset.column ? null : cell.dataset.column;
      openKpiFilter = null;
      document.querySelectorAll("[data-kpi-filter] .filter-menu").forEach(el => el.classList.remove("open"));
      updateKpiFilterStates();
      renderTableColumnMenus(brandGroups(currentRows()));
      positionOpenColumnMenu();
      event.stopPropagation();
      return;
    }}
    if (!menu) {{
      openKpiFilter = null;
      openColumnFilter = null;
      document.querySelectorAll(".filter-menu").forEach(el => el.classList.remove("open"));
      updateKpiFilterStates();
      updateTableHeaderStates();
    }}
  }});
  window.addEventListener("resize", () => {{
    positionOpenColumnMenu();
    positionOpenKpiMenu();
    if (upcomingColumnCount() !== upcomingColumnLayout) renderUpcoming();
  }});
  document.querySelector(".scroll").addEventListener("scroll", positionOpenColumnMenu, {{passive:true}});
  document.getElementById("resetTableFilters").addEventListener("click", resetTableFilters);
  render();
}}

function areaValue(mall, metric) {{
  const area = areas[mall] || {{}};
  return Number(area[metric] || 0);
}}

function mallCity(mall) {{
  return String((areas[mall] || {{}}).city || "");
}}

function mallsForScaleFilter(filter) {{
  if (!filter) return [];
  if (filter.kind === "all") return malls;
  if (filter.kind === "confirmed") return malls.filter(mall => areaValue(mall, "gla") || areaValue(mall, "gba"));
  if (filter.kind === "no_area") return malls.filter(mall => !areaValue(mall, "gla") && !areaValue(mall, "gba"));
  return malls.filter(mall => {{
    const value = areaValue(mall, filter.metric);
    return value && value >= filter.min && (filter.max === null || value < filter.max);
  }});
}}

function renderScaleFilters() {{
  const renderGroup = (id, group) => {{
    const root = document.getElementById(id);
    root.innerHTML = SCALE_FILTERS.filter(f => f.group === group).map(filter => {{
      const geoFilters = GEO_FILTERS.filter(item => activeGeoIds.has(item.id));
      const count = mallsForGeoFilters(geoFilters, mallsForScaleFilter(filter)).length;
      const checked = activeScaleIds.has(filter.id);
      return `<label class="scale-filter-btn ${{checked ? "active" : ""}}">
        <input class="scale-filter-check" type="checkbox" data-scale-filter="${{filter.id}}" ${{checked ? "checked" : ""}} />
        <span class="scale-filter-copy">
          <span>${{filter.label}}</span>
          ${{filter.range ? `<span class="range">${{filter.range}}</span>` : ""}}
          <span class="count">${{fmt(count)}} ${{objectWord(count)}}</span>
        </span>
      </label>`;
    }}).join("");
  }};
  renderGroup("gbaFilters", "gba");
  document.querySelectorAll("[data-scale-filter]").forEach(input => input.addEventListener("change", () => toggleScaleFilter(input.dataset.scaleFilter)));
}}

function mallsForGeoFilter(filter, sourceMalls) {{
  if (!filter) return [];
  if (filter.kind === "regions") return sourceMalls.filter(mall => !["Москва", "Санкт-Петербург", "НН"].includes(mallCity(mall)));
  return sourceMalls.filter(mall => mallCity(mall) === filter.city);
}}

function mallsForGeoFilters(filters, sourceMalls) {{
  return [...new Set(filters.flatMap(filter => mallsForGeoFilter(filter, sourceMalls)))];
}}

function renderGeoFilters(formatMalls) {{
  const root = document.getElementById("geoFilters");
  root.innerHTML = GEO_FILTERS.map(filter => {{
    const count = mallsForGeoFilter(filter, formatMalls).length;
    const checked = activeGeoIds.has(filter.id);
    return `<label class="scale-filter-btn ${{checked ? "active" : ""}}">
      <input class="scale-filter-check" type="checkbox" data-geo-filter="${{filter.id}}" ${{checked ? "checked" : ""}} />
      <span class="scale-filter-copy">
        <span>${{filter.label}}</span>
        ${{filter.range ? `<span class="range">${{filter.range}}</span>` : ""}}
        <span class="count">${{fmt(count)}} ${{objectWord(count)}}</span>
      </span>
    </label>`;
  }}).join("");
  document.querySelectorAll("[data-geo-filter]").forEach(input => input.addEventListener("change", () => {{
    if (activeGeoIds.has(input.dataset.geoFilter)) activeGeoIds.delete(input.dataset.geoFilter);
    else activeGeoIds.add(input.dataset.geoFilter);
    applyScaleFilters();
  }}));
}}

function toggleScaleFilter(id) {{
  if (activeScaleIds.has(id)) activeScaleIds.delete(id);
  else activeScaleIds.add(id);
  applyScaleFilters();
}}

const KPI_FILTER_TITLES = {{
  malls:"Объекты",
  cities:"Города",
  tenants:"Арендаторы",
  brands:"Бренды"
}};

function kpiFilterMatches(type, value) {{
  const values = kpiFilters[type] || [];
  if (!values.length) return true;
  if (values.includes("__none__")) return false;
  return values.includes(value);
}}

function kpiValueLabel(type, value) {{
  if (type === "malls") return displayMall(value);
  if (type === "cities") return value === "НН" ? "Нижний Новгород" : value;
  if (type === "brands") return normalizedBrandLabels.get(value) || value;
  return value;
}}

function applyKpiDimensionFilters() {{
  selected = new Set([...baseSelected].filter(mall =>
    kpiFilterMatches("malls", mall) && kpiFilterMatches("cities", mallCity(mall))
  ));
  if (highlightedMall !== "none" && !selected.has(highlightedMall)) highlightedMall = "none";
}}

function kpiFilterOptions(type) {{
  let values = [];
  if (type === "malls") values = [...baseSelected];
  if (type === "cities") values = [...new Set([...baseSelected].map(mallCity).filter(Boolean))];
  if (type === "tenants") values = rows.filter(row => selected.has(row.mall)).map(row => row.brand).filter(Boolean);
  if (type === "brands") values = rows.filter(row => selected.has(row.mall)).map(row => row.brand_normalized || normText(row.brand)).filter(Boolean);
  values = [...new Set([...values, ...(kpiFilters[type] || []).filter(value => value !== "__none__")])];
  return values.sort((a,b) => kpiValueLabel(type, a).localeCompare(kpiValueLabel(type, b), "ru", {{numeric:true, sensitivity:"base"}}));
}}

function updateKpiFilterStates() {{
  Object.keys(KPI_FILTER_TITLES).forEach(type => {{
    const card = document.querySelector(`[data-kpi-filter="${{type}}"]`);
    if (!card) return;
    const button = card.querySelector(".kpi-filter-button");
    const active = (kpiFilters[type] || []).length > 0;
    button.classList.toggle("active", active);
    button.setAttribute("aria-expanded", String(openKpiFilter === type));
    button.title = active ? `Фильтр «${{KPI_FILTER_TITLES[type]}}» активен` : `Фильтр «${{KPI_FILTER_TITLES[type]}}»`;
  }});
}}

function applyKpiMenuSelection(type, options, menu) {{
  const checked = [...menu.querySelectorAll("[data-kpi-filter-option]:checked")].map(element => element.value);
  kpiFilters[type] = checked.length === options.length ? [] : (checked.length ? checked : ["__none__"]);
  openKpiFilter = type;
  if (["malls", "cities"].includes(type)) applyKpiDimensionFilters();
  render();
}}

function renderKpiMenu(type) {{
  const card = document.querySelector(`[data-kpi-filter="${{type}}"]`);
  if (!card) return;
  const menu = card.querySelector(".kpi-filter-menu");
  const options = kpiFilterOptions(type);
  const selectedValues = new Set(kpiFilters[type] || []);
  const optionHtml = options.map(value => {{
    const label = kpiValueLabel(type, value);
    const checked = selectedValues.size === 0 || selectedValues.has(value) ? "checked" : "";
    return `<label class="filter-option" data-kpi-filter-label="${{escapeHtml(normText(label))}}" title="${{escapeHtml(label)}}"><input type="checkbox" data-kpi-filter-option="${{escapeHtml(type)}}" value="${{escapeHtml(value)}}" ${{checked}} /> <span>${{escapeHtml(label)}}</span></label>`;
  }}).join("");
  menu.innerHTML = `
    <div class="filter-menu-head">
      <div class="filter-menu-title">${{escapeHtml(KPI_FILTER_TITLES[type])}} · ${{fmt(options.length)}} значений</div>
      <input class="filter-search" type="search" data-kpi-filter-search="${{type}}" value="${{escapeHtml(kpiFilterSearch[type] || "")}}" placeholder="Поиск в списке" autocomplete="off" />
      <div class="filter-actions">
        <button class="filter-action" type="button" data-kpi-select-all="${{type}}">Выбрать все</button>
        <button class="filter-action clear" type="button" data-kpi-clear-all="${{type}}">Снять все</button>
      </div>
    </div>
    <div class="filter-options">${{optionHtml || `<div class="filter-empty">Нет значений</div>`}}</div>
  `;
  menu.classList.toggle("open", openKpiFilter === type);
  const search = menu.querySelector("[data-kpi-filter-search]");
  const applySearch = () => {{
    const query = normText(search.value).trim();
    menu.querySelectorAll(".filter-option").forEach(option => option.hidden = Boolean(query) && !option.dataset.kpiFilterLabel.includes(query));
  }};
  search.addEventListener("input", event => {{
    event.stopPropagation();
    kpiFilterSearch[type] = event.target.value;
    applySearch();
  }});
  search.addEventListener("click", event => event.stopPropagation());
  applySearch();
  menu.querySelectorAll("[data-kpi-filter-option]").forEach(input => input.addEventListener("change", event => {{
    event.stopPropagation();
    applyKpiMenuSelection(type, options, menu);
  }}));
  menu.querySelector("[data-kpi-select-all]").addEventListener("click", event => {{
    event.preventDefault();
    event.stopPropagation();
    kpiFilters[type] = [];
    openKpiFilter = type;
    if (["malls", "cities"].includes(type)) applyKpiDimensionFilters();
    render();
  }});
  menu.querySelector("[data-kpi-clear-all]").addEventListener("click", event => {{
    event.preventDefault();
    event.stopPropagation();
    kpiFilters[type] = ["__none__"];
    openKpiFilter = type;
    if (["malls", "cities"].includes(type)) applyKpiDimensionFilters();
    render();
  }});
}}

function renderKpiMenus() {{
  Object.keys(KPI_FILTER_TITLES).forEach(renderKpiMenu);
  updateKpiFilterStates();
  positionOpenKpiMenu();
}}

function positionKpiMenu(type) {{
  if (openKpiFilter !== type) return;
  const card = document.querySelector(`[data-kpi-filter="${{type}}"]`);
  if (!card) return;
  const button = card.querySelector(".kpi-filter-button");
  const menu = card.querySelector(".kpi-filter-menu");
  const rect = button.getBoundingClientRect();
  const width = Math.min(type === "tenants" || type === "brands" ? 380 : 330, window.innerWidth - 24);
  const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.right - width));
  const below = Math.max(0, window.innerHeight - rect.bottom - 12);
  const above = Math.max(0, rect.top - 12);
  const openAbove = below < 300 && above > below;
  const available = Math.max(170, openAbove ? above : below);
  const menuHeight = Math.min(430, available);
  const top = openAbove ? Math.max(12, rect.top - menuHeight - 6) : Math.min(window.innerHeight - menuHeight - 12, rect.bottom + 6);
  menu.style.setProperty("--filter-menu-width", `${{width}}px`);
  menu.style.setProperty("--filter-menu-left", `${{left}}px`);
  menu.style.setProperty("--filter-menu-top", `${{top}}px`);
  menu.style.setProperty("--filter-options-height", `${{Math.max(90, menuHeight - 116)}}px`);
}}

function positionOpenKpiMenu() {{
  if (openKpiFilter) positionKpiMenu(openKpiFilter);
}}

function applyScaleFilters(doRender = true) {{
  const filters = SCALE_FILTERS.filter(filter => activeScaleIds.has(filter.id));
  const formatMalls = [...new Set(filters.flatMap(mallsForScaleFilter))];
  const geoFilters = GEO_FILTERS.filter(filter => activeGeoIds.has(filter.id));
  baseSelected = new Set(mallsForGeoFilters(geoFilters, formatMalls));
  applyKpiDimensionFilters();
  renderScaleFilters();
  renderGeoFilters(formatMalls);
  const label = document.getElementById("activeScaleLabel");
  if (label) label.textContent = activeScaleIds.size
    ? `Форматов: ${{fmt(activeScaleIds.size)}} · Географий: ${{fmt(activeGeoIds.size)}} · ${{fmt(selected.size)}} ${{objectWord(selected.size)}}`
    : "Форматы не выбраны · 0 объектов";
  if (doRender) render();
}}

function currentRows() {{
  return rows.filter(r => selected.has(r.mall)
    && kpiFilterMatches("tenants", r.brand)
    && kpiFilterMatches("brands", r.brand_normalized || normText(r.brand)));
}}

function preferredBrandName(brands, key) {{
  const options = [...brands].filter(Boolean);
  const russian = options.filter(name => /[а-яё]/i.test(name) && !/[a-z]/i.test(name));
  if (russian.length) return russian.sort((a,b) => a.localeCompare(b, "ru"))[0];
  return options.sort((a,b) => a.localeCompare(b, "ru"))[0] || key;
}}

function brandGroups(slice) {{
  const map = new Map();
  for (const r of slice) {{
    const key = r.brand_normalized || normText(r.brand);
    if (!key) continue;
    if (!map.has(key)) map.set(key, {{ key, brands:new Set(), malls:new Set(), categories:new Set(), rows:[] }});
    const g = map.get(key);
    g.brands.add(r.brand);
    g.malls.add(r.mall);
    g.categories.add(r.category || "Прочее");
    g.rows.push(r);
  }}
  return [...map.values()].map(g => ({{
    key:g.key,
    brand:preferredBrandName(g.brands, g.key),
    malls:[...g.malls].sort((a,b) => a.localeCompare(b, "ru")),
    categories:[...g.categories].sort((a,b) => a.localeCompare(b, "ru")),
    rows:g.rows,
    status:g.malls.size === 1 ? "Уникальный" : "Пересекающийся"
  }}));
}}

function countsByCategory(groups, status = null) {{
  const counts = new Map();
  groups.filter(g => !status || g.status === status).forEach(g => {{
    const cat = g.categories[0] || "Прочее";
    counts.set(cat, (counts.get(cat) || 0) + 1);
  }});
  return [...counts.entries()].map(([name, value]) => ({{name, value}})).sort((a,b) => b.value - a.value || a.name.localeCompare(b.name, "ru"));
}}

function categoryMallCounts(groups, status, categoryOrder = []) {{
  const selectedMalls = [...selected].sort((a,b) => a.localeCompare(b, "ru"));
  const emptyCategory = name => ({{name, total:0, values:Object.fromEntries(selectedMalls.map(m => [m, 0]))}});
  const byCategory = new Map(categoryOrder.map(name => [name, emptyCategory(name)]));
  groups.filter(g => g.status === status).forEach(g => {{
    const cat = g.categories[0] || "Прочее";
    if (!byCategory.has(cat)) {{
      byCategory.set(cat, emptyCategory(cat));
    }}
    const item = byCategory.get(cat);
    const mallsForBrand = status === "Уникальный" ? [g.malls[0]] : g.malls;
    mallsForBrand.forEach(mall => {{
      if (!selected.has(mall)) return;
      item.values[mall] = (item.values[mall] || 0) + 1;
      item.total += 1;
    }});
  }});
  if (categoryOrder.length) return categoryOrder.map(name => byCategory.get(name));
  return [...byCategory.values()].sort((a,b) => b.total - a.total || a.name.localeCompare(b.name, "ru"));
}}

function renderScale(id, data, limit = 10) {{
  const root = document.getElementById(id);
  const top = data.slice(0, limit);
  const selectedMalls = [...selected].sort((a,b) => a.localeCompare(b, "ru"));
  root.innerHTML = top.map(row => {{
    const rowValues = selectedMalls.map(mall => row.values[mall] || 0);
    const min = Math.min(...rowValues);
    const max = Math.max(...rowValues);
    const equalValues = min === max;
    const mid = Math.round((min + max) / 2);
    const legend = selectedMalls.map(mall => {{
      const value = row.values[mall] || 0;
      return `<span title="${{displayMall(mall)}}: ${{value}}"><i class="dot" style="background:${{mallColor(mall)}}"></i>${{scaleShortMall(mall)}} ${{value}}</span>`;
    }}).join("");
    const axisY = 52;
    const markerData = selectedMalls.map(mall => ({{
      mall,
      value: row.values[mall] || 0,
      x: equalValues ? 170 : 24 + (((row.values[mall] || 0) - min) / (max - min)) * 292,
      color: mallColor(mall)
    }})).sort((a,b) => a.x - b.x || a.mall.localeCompare(b.mall, "ru"));
    const closeGroups = [];
    markerData.forEach(point => {{
      const group = closeGroups.find(g => Math.abs(g.center - point.x) < 9.5);
      if (group) {{
        group.items.push(point);
        group.center = group.items.reduce((sum, item) => sum + item.x, 0) / group.items.length;
      }} else {{
        closeGroups.push({{center: point.x, items: [point]}});
      }}
    }});
    const offsets = [0, -10, 10, -19, 19, -27, 27];
    closeGroups.forEach(group => group.items.forEach((point, index) => {{
      point.y = Math.max(16, Math.min(45, 30 + offsets[index % offsets.length]));
      point.lineTop = point.y + 5.8;
    }}));
    const orderedMarkers = [
      ...markerData.filter(point => !(highlightedMall !== "none" && point.mall === highlightedMall)),
      ...markerData.filter(point => highlightedMall !== "none" && point.mall === highlightedMall)
    ];
    const markers = orderedMarkers.map(point => {{
      const isHighlighted = highlightedMall !== "none" && point.mall === highlightedMall;
      const flagY = Math.max(7, point.y - 15);
      const flag = isHighlighted ? `<g class="marker-flag">
        <path d="M${{point.x}} ${{point.y - 4}} L${{point.x}} ${{flagY + 19}}" stroke="${{point.color}}" stroke-width="1.8"></path>
        <path d="M${{point.x}} ${{flagY}} H${{point.x + 17}} L${{point.x + 13}} ${{flagY + 8}} H${{point.x}} Z" fill="${{point.color}}"></path>
      </g>` : "";
      return `<g><title>${{displayMall(point.mall)}}: ${{point.value}}</title><line class="marker-line" x1="${{point.x}}" y1="${{axisY}}" x2="${{point.x}}" y2="${{point.lineTop}}" stroke="${{point.color}}"></line><circle class="marker-dot" cx="${{point.x}}" cy="${{point.y}}" r="${{isHighlighted ? 5.9 : 4.6}}" fill="${{isHighlighted ? "#fff" : point.color}}" stroke="${{isHighlighted ? point.color : "#fff"}}" stroke-width="${{isHighlighted ? 3.2 : 2.1}}"></circle>${{flag}}</g>`;
    }}).join("");
    return `<div class="scale-row">
      <div class="scale-label" title="${{row.name}}">${{row.name}}</div>
      <div class="scale-wrap">
        <svg class="scale-svg" viewBox="0 0 340 80" preserveAspectRatio="none" aria-hidden="true">
          <line class="axis-band" x1="24" y1="${{axisY}}" x2="316" y2="${{axisY}}"></line>
          <line class="axis-line" x1="24" y1="${{axisY}}" x2="316" y2="${{axisY}}"></line>
          ${{markers}}
          <text class="tick-label" x="24" y="72" text-anchor="middle">${{equalValues ? "" : min}}</text>
          <text class="tick-label" x="170" y="72" text-anchor="middle">${{equalValues ? min : mid}}</text>
          <text class="tick-label" x="316" y="72" text-anchor="middle">${{equalValues ? "" : max}}</text>
        </svg>
      </div>
      <div class="scale-legend">${{legend}}</div>
    </div>`;
  }}).join("") || `<div class="muted">Нет данных для выбранного среза</div>`;
}}

function renderBars(id, data, limit = 10) {{
  const root = document.getElementById(id);
  const top = data.slice(0, limit);
  const max = Math.max(1, ...top.map(d => d.value));
  root.innerHTML = top.map(d => `
    <div class="bar-row">
      <div class="bar-label" title="${{d.name}}">${{d.name}}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${{Math.max(1, d.value / max * 100)}}%"></div></div>
      <div class="bar-value">${{fmt(d.value)}}</div>
    </div>`).join("") || `<div class="muted">Нет данных для выбранного среза</div>`;
}}

function upcomingColumnCount() {{
  if (window.innerWidth <= 720) return 1;
  if (window.innerWidth <= 980) return 2;
  return 4;
}}

function renderUpcoming() {{
  const root = document.getElementById("upcomingGrid");
  const count = document.getElementById("upcomingCount");
  const items = upcomingOpenings
    .filter(item => selected.has(item.mall)
      && kpiFilterMatches("tenants", item.brand)
      && kpiFilterMatches("brands", normText(item.brand)))
    .sort((a, b) => displayMall(a.mall).localeCompare(displayMall(b.mall), "ru") || a.brand.localeCompare(b.brand, "ru"));
  const grouped = new Map();
  items.forEach(item => {{
    if (!grouped.has(item.mall)) grouped.set(item.mall, []);
    grouped.get(item.mall).push(item);
  }});
  count.textContent = `${{fmt(items.length)}} анонсов · ${{fmt(grouped.size)}} ${{objectWord(grouped.size)}}`;
  if (!items.length) {{
    root.innerHTML = `<div class="upcoming-empty">В выбранной группе официальные анонсы будущих открытий не найдены.</div>`;
    return;
  }}
  const columnCount = upcomingColumnCount();
  upcomingColumnLayout = columnCount;
  const cards = [];
  [...grouped.entries()].forEach(([mall, mallItems]) => {{
    const tenantRows = mallItems.map(item => {{
      const confidence = normText(item.reliability).startsWith("выс") ? "high" : "medium";
      const dateLabel = item.plannedAt ? `Открытие: ${{item.plannedAt}}` : (item.announcedAt ? `Анонс: ${{item.announcedAt}}` : `Проверено: ${{item.checkedAt}}`);
      const detail = [item.category, item.basis].filter(Boolean).join(" · ");
      return `<div class="upcoming-item" title="${{escapeHtml(item.comment || item.basis || '')}}">
        <div>
          <div class="upcoming-brand">${{escapeHtml(item.brand)}}</div>
          <div class="upcoming-meta">${{escapeHtml(detail)}}</div>
        </div>
        <div class="upcoming-side">
          <span class="upcoming-date">${{escapeHtml(dateLabel)}}</span>
          <span class="upcoming-confidence ${{confidence}}">${{escapeHtml(item.reliability || "Средняя")}}</span>
          ${{item.sourceUrl ? `<a class="upcoming-link" href="${{escapeHtml(item.sourceUrl)}}" target="_blank" rel="noopener">Источник ↗</a>` : ""}}
        </div>
      </div>`;
    }}).join("");
    const card = `<article class="upcoming-mall">
      <div class="upcoming-mall-head">
        <div class="upcoming-mall-title">${{escapeHtml(displayMall(mall))}}</div>
        <div class="upcoming-mall-total">${{fmt(mallItems.length)}} скоро</div>
      </div>
      <div class="upcoming-list">${{tenantRows}}</div>
    </article>`;
    cards.push(card);
  }});
  root.innerHTML = cards.map(card => `<div class="upcoming-column">${{card}}</div>`).join("");
  const measuredCards = [...root.querySelectorAll(".upcoming-mall")]
    .map((element, index) => ({{html:cards[index], height:element.getBoundingClientRect().height}}))
    .sort((a, b) => b.height - a.height);
  const columns = Array.from({{length:columnCount}}, () => ({{cards:[], weight:0}}));
  measuredCards.forEach(card => {{
    const target = columns.reduce((best, column) => column.weight < best.weight ? column : best, columns[0]);
    target.cards.push(card.html);
    target.weight += card.height + 9;
  }});
  root.innerHTML = columns.map(column => `<div class="upcoming-column">${{column.cards.join("")}}</div>`).join("");
}}

function renderMallSummary(groups) {{
  const root = document.getElementById("mallSummary");
  const mallStats = [...selected].map(mall => {{
    const total = groups.filter(g => g.malls.includes(mall)).length;
    const unique = groups.filter(g => g.status === "Уникальный" && g.malls.includes(mall)).length;
    const area = areas[mall] || {{}};
    const gla = Number(area.gla || 0);
    return {{mall, total, unique, area, gla}};
  }}).sort((a,b) => (b.gla || -1) - (a.gla || -1) || b.total - a.total || a.mall.localeCompare(b.mall, "ru"));
  const selectedMalls = mallStats.map(item => item.mall);
  const count = selectedMalls.length;
  if (!count) {{
    root.style.display = "none";
    root.innerHTML = "";
    return;
  }}
  root.style.display = "grid";
  if (count <= 5) {{
    root.style.gridTemplateColumns = `repeat(${{count}}, minmax(0, 1fr))`;
  }} else {{
    root.style.gridTemplateColumns = "repeat(auto-fit, minmax(240px, 1fr))";
  }}
  root.innerHTML = mallStats.map(item => {{
    const mall = item.mall;
    const total = item.total;
    const unique = item.unique;
    const area = item.area;
    const gla = Number(area.gla || 0);
    const gba = Number(area.gba || 0);
    const density = gla ? (total / (gla / 1000)).toFixed(1).replace(".", ",") : "н/д";
    const share = total ? Math.round(unique / total * 100) : 0;
    const checked = highlightedMall === mall ? "checked" : "";
    return `<div class="panel mall-card" title="${{displayMall(mall)}}">
      <div class="mall-card-head">
        <div class="mall-card-title">${{displayMall(mall)}}</div>
        <label class="mall-highlight" title="Выделить объект на шкалах">
          <input type="checkbox" data-highlight-mall="${{mall}}" ${{checked}} />
        </label>
      </div>
      <div class="mall-card-main">
        <div class="mall-badge" style="background:${{mallColor(mall)}}">${{shortMall(mall)}}</div>
        <div>
          <div class="mall-card-value">${{fmt(total)}}</div>
          <div class="mall-card-label">брендов всего</div>
        </div>
      </div>
      <div class="mall-card-note">${{fmt(unique)}} уникальных · ${{share}}% от состава</div>
      <div class="mall-card-area" title="${{escapeHtml(area.status || '')}}">GLA ${{fmtArea(gla)}} · GBA ${{fmtArea(gba)}} · ${{density}} бр./1к м²</div>
    </div>`;
  }}).join("");
  root.querySelectorAll("[data-highlight-mall]").forEach(input => input.addEventListener("change", () => {{
    highlightedMall = input.checked ? input.dataset.highlightMall : "none";
    render();
  }}));
}}

function renderBalance(slice) {{
  const roles = ["Ритейл", "Еда", "Сервисы", "Досуг"];
  const css = {{"Ритейл":"retail","Еда":"food","Сервисы":"service","Досуг":"leisure"}};
  const byMall = new Map();
  for (const r of slice) {{
    const key = `${{r.mall}}|${{r.brand_normalized || normText(r.brand)}}|${{r.portfolio_role}}`;
    byMall.set(key, r);
  }}
  const mallRows = [...selected].sort((a,b) => a.localeCompare(b, "ru")).map(mall => {{
    const counts = Object.fromEntries(roles.map(role => [role, 0]));
    [...byMall.values()].filter(r => r.mall === mall).forEach(r => counts[r.portfolio_role] = (counts[r.portfolio_role] || 0) + 1);
    const total = roles.reduce((s, role) => s + (counts[role] || 0), 0);
    return {{mall, counts, total}};
  }});
  document.getElementById("balanceRows").innerHTML = mallRows.map(row => `
    <div class="split-row">
      <b title="${{displayMall(row.mall)}}">${{displayMall(row.mall).length > 11 ? displayMall(row.mall).slice(0, 11) + "…" : displayMall(row.mall)}}</b>
      <div class="stack">
        ${{roles.map(role => `<div class="seg ${{css[role]}}" title="${{role}}: ${{countsSafe(row.counts[role])}}" style="width:${{row.total ? row.counts[role] / row.total * 100 : 0}}%"></div>`).join("")}}
      </div>
      <b>${{fmt(row.total)}}</b>
    </div>`).join("") || `<div class="muted">Выберите хотя бы один объект</div>`;
}}

function countsSafe(v) {{ return fmt(v || 0); }}

function renderPairs(groups) {{
  const root = document.getElementById("pairMatrix");
  const selectedMalls = [...selected].sort((a,b) => a.localeCompare(b, "ru"));
  const pairs = [];
  for (let i = 0; i < selectedMalls.length; i++) {{
    for (let j = i + 1; j < selectedMalls.length; j++) {{
      const a = selectedMalls[i], b = selectedMalls[j];
      const value = groups.filter(g => g.malls.includes(a) && g.malls.includes(b)).length;
      pairs.push({{name:`${{displayMall(a)}} × ${{displayMall(b)}}`, value}});
    }}
  }}
  root.innerHTML = pairs.sort((a,b) => b.value - a.value).slice(0, 12).map(p => `
    <div class="pair"><b title="${{p.name}}">${{p.name}}</b><span>${{fmt(p.value)}}</span></div>`).join("")
    || `<div class="muted">Для матрицы нужно выбрать минимум два объекта</div>`;
}}

const TABLE_COLUMN_TITLES = {{
  brand:"Бренд", status:"Характеристика", category:"Категория", malls:"Объекты", source:"Источник"
}};

function sourceValue(row) {{
  return row.source || row.sourceUrl || "";
}}

function tableColumnValues(group, column) {{
  if (column === "brand") return [group.brand];
  if (column === "status") return [group.status];
  if (column === "category") return group.categories;
  if (column === "malls") return group.malls;
  if (column === "source") return uniq(group.rows.map(sourceValue));
  return [];
}}

function tableGroupMatches(group, column) {{
  const selectedValues = new Set(tableColumnFilters[column] || []);
  if (!selectedValues.size) return true;
  if (selectedValues.has("__none__")) return false;
  return tableColumnValues(group, column).some(value => selectedValues.has(value));
}}

function filteredTableGroups(groups, excludedColumn = null) {{
  return groups.filter(group => Object.keys(TABLE_COLUMN_TITLES).every(column => column === excludedColumn || tableGroupMatches(group, column)));
}}

function updateTableHeaderStates() {{
  Object.entries(TABLE_COLUMN_TITLES).forEach(([column, title]) => {{
    const cell = document.querySelector(`[data-column="${{column}}"]`);
    if (!cell) return;
    const button = cell.querySelector(".excel-filter");
    const active = (tableColumnFilters[column] || []).length > 0;
    button.classList.toggle("active", active);
    button.setAttribute("aria-expanded", String(openColumnFilter === column));
    button.title = active ? `Фильтр «${{title}}» активен` : `Фильтр по столбцу «${{title}}»`;
    const heading = cell.closest("th").querySelector(".th-filter > span");
    const arrow = tableSort.column === column ? (tableSort.direction === "asc" ? " ↑" : " ↓") : "";
    heading.textContent = title + arrow;
  }});
}}

function refreshTableOnly() {{
  updateTableHeaderStates();
  renderTable(brandGroups(currentRows()));
  positionOpenColumnMenu();
}}

function resetTableFilters() {{
  tableColumnFilters = {{brand:[], status:[], category:[], malls:[], source:[]}};
  tableFilterSearch = {{brand:"", status:"", category:"", malls:"", source:""}};
  openColumnFilter = null;
  const groups = brandGroups(currentRows());
  renderTableColumnMenus(groups);
  renderTable(groups);
}}

function applyMenuSelection(column, options, menu) {{
  const checked = [...menu.querySelectorAll("[data-filter-option]:checked")].map(element => element.value);
  tableColumnFilters[column] = checked.length === options.length ? [] : (checked.length ? checked : ["__none__"]);
  openColumnFilter = column;
  refreshTableOnly();
}}

function renderColumnMenu(column, title, values, valueLabels = null) {{
  const cell = document.querySelector(`[data-column="${{column}}"]`);
  const button = cell.querySelector(".excel-filter");
  const menu = cell.querySelector(".filter-menu");
  const selectedRaw = (tableColumnFilters[column] || []).filter(value => value !== "__none__");
  const options = [...new Set([...values.filter(Boolean), ...selectedRaw])].sort((a,b) => String(a).localeCompare(String(b), "ru", {{numeric:true, sensitivity:"base"}}));
  const selectedValues = new Set(tableColumnFilters[column]);
  const optionHtml = options.map(value => {{
    const label = valueLabels ? valueLabels(value) : value;
    const checked = selectedValues.size === 0 || selectedValues.has(value) ? "checked" : "";
    return `<label class="filter-option" data-filter-label="${{escapeHtml(normText(label))}}" title="${{escapeHtml(label)}}"><input type="checkbox" data-filter-option="${{escapeHtml(column)}}" value="${{escapeHtml(value)}}" ${{checked}} /> <span>${{escapeHtml(label)}}</span></label>`;
  }}).join("");
  const searchValue = tableFilterSearch[column] || "";
  menu.innerHTML = `
    <div class="filter-menu-head">
      <div class="filter-menu-title">${{escapeHtml(title)}} · ${{fmt(options.length)}} значений</div>
      <div class="filter-sort-actions">
        <button class="filter-sort ${{tableSort.column === column && tableSort.direction === "asc" ? "active" : ""}}" type="button" data-filter-sort="${{column}}" data-sort-direction="asc">А → Я</button>
        <button class="filter-sort ${{tableSort.column === column && tableSort.direction === "desc" ? "active" : ""}}" type="button" data-filter-sort="${{column}}" data-sort-direction="desc">Я → А</button>
      </div>
      <input class="filter-search" type="search" data-filter-search="${{column}}" value="${{escapeHtml(searchValue)}}" placeholder="Поиск в списке" autocomplete="off" />
      <div class="filter-actions">
        <button class="filter-action" type="button" data-filter-select-all="${{escapeHtml(column)}}">Выбрать все</button>
        <button class="filter-action clear" type="button" data-filter-clear-all="${{escapeHtml(column)}}">Снять все</button>
      </div>
    </div>
    <div class="filter-options">${{optionHtml || `<div class="filter-empty">Нет значений</div>`}}</div>
  `;
  menu.classList.toggle("open", openColumnFilter === column);
  positionColumnMenu(column);
  const search = menu.querySelector("[data-filter-search]");
  const applySearch = () => {{
    const query = normText(search.value).trim();
    menu.querySelectorAll(".filter-option").forEach(option => option.hidden = Boolean(query) && !option.dataset.filterLabel.includes(query));
  }};
  search.addEventListener("input", event => {{
    event.stopPropagation();
    tableFilterSearch[column] = event.target.value;
    applySearch();
  }});
  search.addEventListener("click", event => event.stopPropagation());
  applySearch();
  menu.querySelectorAll("[data-filter-option]").forEach(input => input.addEventListener("change", event => {{
    event.stopPropagation();
    applyMenuSelection(event.target.dataset.filterOption, options, menu);
  }}));
  menu.querySelector("[data-filter-select-all]").addEventListener("click", event => {{
    event.preventDefault();
    event.stopPropagation();
    const columnName = event.target.dataset.filterSelectAll;
    menu.querySelectorAll("[data-filter-option]").forEach(input => input.checked = true);
    tableColumnFilters[columnName] = [];
    openColumnFilter = columnName;
    refreshTableOnly();
  }});
  menu.querySelector("[data-filter-clear-all]").addEventListener("click", event => {{
    event.preventDefault();
    event.stopPropagation();
    const columnName = event.target.dataset.filterClearAll;
    menu.querySelectorAll("[data-filter-option]").forEach(input => input.checked = false);
    tableColumnFilters[columnName] = ["__none__"];
    openColumnFilter = columnName;
    refreshTableOnly();
  }});
  menu.querySelectorAll("[data-filter-sort]").forEach(sortButton => sortButton.addEventListener("click", event => {{
    event.preventDefault();
    event.stopPropagation();
    tableSort = {{column:event.currentTarget.dataset.filterSort, direction:event.currentTarget.dataset.sortDirection}};
    openColumnFilter = column;
    menu.querySelectorAll("[data-filter-sort]").forEach(button => button.classList.toggle("active", button.dataset.sortDirection === tableSort.direction));
    refreshTableOnly();
  }}));
  updateTableHeaderStates();
}}

function positionColumnMenu(column) {{
  if (openColumnFilter !== column) return;
  const cell = document.querySelector(`[data-column="${{column}}"]`);
  if (!cell) return;
  const button = cell.querySelector(".excel-filter");
  const menu = cell.querySelector(".filter-menu");
  if (!button || !menu) return;
  const rect = button.getBoundingClientRect();
  const width = Math.min(column === "brand" ? 380 : 330, window.innerWidth - 24);
  const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.left));
  const below = Math.max(0, window.innerHeight - rect.bottom - 12);
  const above = Math.max(0, rect.top - 12);
  const openAbove = below < 300 && above > below;
  const available = Math.max(170, openAbove ? above : below);
  const menuHeight = Math.min(440, available);
  const top = openAbove ? Math.max(12, rect.top - menuHeight - 6) : Math.min(window.innerHeight - menuHeight - 12, rect.bottom + 6);
  menu.style.setProperty("--filter-menu-width", `${{width}}px`);
  menu.style.setProperty("--filter-menu-left", `${{left}}px`);
  menu.style.setProperty("--filter-menu-top", `${{top}}px`);
  menu.style.setProperty("--filter-options-height", `${{Math.max(90, menuHeight - 156)}}px`);
}}

function positionOpenColumnMenu() {{
  if (openColumnFilter) positionColumnMenu(openColumnFilter);
}}

function renderTableColumnMenus(groups) {{
  Object.entries(TABLE_COLUMN_TITLES).forEach(([column, title]) => {{
    const contextualGroups = filteredTableGroups(groups, column);
    const values = contextualGroups.flatMap(group => tableColumnValues(group, column));
    renderColumnMenu(column, title, values, column === "malls" ? displayMall : null);
  }});
  updateTableHeaderStates();
}}

function tableSortText(group, column) {{
  return tableColumnValues(group, column)
    .map(value => column === "malls" ? displayMall(value) : value)
    .join("; ");
}}

function renderTable(groups) {{
  const direction = tableSort.direction === "desc" ? -1 : 1;
  const items = filteredTableGroups(groups).sort((a, b) => {{
    const primary = tableSortText(a, tableSort.column).localeCompare(tableSortText(b, tableSort.column), "ru", {{numeric:true, sensitivity:"base"}});
    return direction * primary || a.brand.localeCompare(b.brand, "ru", {{numeric:true, sensitivity:"base"}});
  }});
  const activeFilterCount = Object.values(tableColumnFilters).filter(values => values.length > 0).length;
  const sortTitle = TABLE_COLUMN_TITLES[tableSort.column];
  document.getElementById("tableHint").textContent = `${{fmt(items.length)}} из ${{fmt(groups.length)}} брендов · сортировка: ${{sortTitle}} ${{tableSort.direction === "asc" ? "А→Я" : "Я→А"}}${{activeFilterCount ? ` · фильтров: ${{activeFilterCount}}` : ""}}`;
  document.getElementById("resetTableFilters").hidden = activeFilterCount === 0;
  document.getElementById("brandTable").innerHTML = items.map(g => {{
    const firstSource = g.rows.find(r => r.sourceUrl) || g.rows[0] || {{}};
    const sourceUrl = safeExternalUrl(firstSource.sourceUrl);
    const sourceLabel = firstSource.source || (sourceUrl ? "Открыть источник" : "");
    const cls = g.status === "Уникальный" ? "unique" : "intersect";
    return `<tr>
      <td data-label="Бренд"><b>${{escapeHtml(g.brand)}}</b></td>
      <td data-label="Характеристика"><span class="badge ${{cls}}">${{escapeHtml(g.status)}}</span></td>
      <td data-label="Категория">${{g.categories.map(escapeHtml).join("; ")}}</td>
      <td data-label="Объекты">${{g.malls.map(mall => escapeHtml(displayMall(mall))).join("; ")}}</td>
      <td data-label="Источник" class="muted">${{sourceUrl ? `<a class="source-link" href="${{escapeHtml(sourceUrl)}}" target="_blank" rel="noopener noreferrer" title="${{escapeHtml(sourceUrl)}}">${{escapeHtml(sourceLabel)}}</a>` : escapeHtml(sourceLabel)}}</td>
    </tr>`;
  }}).join("") || `<tr><td colspan="5" data-label="Результат" class="muted">Нет строк под выбранные фильтры</td></tr>`;
}}

function render() {{
  const slice = currentRows();
  const groups = brandGroups(slice);
  const totalCategories = countsByCategory(groups);
  const categoryOrder = totalCategories.map(item => item.name);
  document.getElementById("kpiMalls").textContent = fmt(selected.size);
  document.getElementById("kpiCities").textContent = fmt(new Set([...selected].map(mallCity).filter(Boolean)).size);
  document.getElementById("kpiRows").textContent = fmt(slice.length);
  document.getElementById("kpiBrands").textContent = fmt(groups.length);
  renderKpiMenus();
  if (highlightedMall !== "none" && !selected.has(highlightedMall)) highlightedMall = "none";
  renderUpcoming();
  renderMallSummary(groups);
  renderScale("uniqueBars", categoryMallCounts(groups, "Уникальный", categoryOrder), categoryOrder.length);
  renderScale("intersectBars", categoryMallCounts(groups, "Пересекающийся", categoryOrder), categoryOrder.length);
  renderBars("totalBars", totalCategories, totalCategories.length);
  renderTableColumnMenus(groups);
  renderTable(groups);
}}

function sameSet(a, b) {{
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}}

init();
</script>
</body>
</html>"""


if __name__ == "__main__":
    main()
