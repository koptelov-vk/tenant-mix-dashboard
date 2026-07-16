from __future__ import annotations

import html
import os
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
README = ROOT / "README.md"
OUTPUT = ROOT / "output" / "pdf" / "tenant-mix-dashboard-readme.pdf"
FONT_DIR = Path(os.environ["LOCALAPPDATA"]) / "Microsoft" / "FontCache" / "4" / "CloudFonts" / "Franklin Gothic Book"
FONT_REGULAR = FONT_DIR / "35148505830.ttf"
FONT_ITALIC = FONT_DIR / "38646770055.ttf"

NAVY = colors.HexColor("#071A4B")
GREEN = colors.HexColor("#008A3D")
MUTED = colors.HexColor("#5F6F91")
LINE = colors.HexColor("#DDE5F0")
PALE = colors.HexColor("#F5F8FC")
PALE_GREEN = colors.HexColor("#EAF6EF")


def register_fonts() -> None:
    if not FONT_REGULAR.exists() or not FONT_ITALIC.exists():
        raise FileNotFoundError("Franklin Gothic Book is not available in the Microsoft font cache")
    pdfmetrics.registerFont(TTFont("FranklinBook", str(FONT_REGULAR)))
    pdfmetrics.registerFont(TTFont("FranklinBookItalic", str(FONT_ITALIC)))
    pdfmetrics.registerFontFamily(
        "FranklinBook",
        normal="FranklinBook",
        bold="FranklinBook",
        italic="FranklinBookItalic",
        boldItalic="FranklinBookItalic",
    )


def normalize_text(value: str) -> str:
    return (
        value.replace("\u2011", "-")
        .replace("\u2012", "-")
        .replace("\u2013", "-")
        .replace("\u2014", "-")
        .replace("\u2212", "-")
    )


def inline_markup(value: str) -> str:
    value = normalize_text(value)
    links: list[tuple[str, str]] = []

    def hold_link(match: re.Match[str]) -> str:
        links.append((match.group(1), match.group(2)))
        return f"@@LINK{len(links) - 1}@@"

    value = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", hold_link, value)
    value = html.escape(value)
    value = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", value)
    value = re.sub(r"`([^`]+)`", r'<font color="#24457D">\1</font>', value)
    for index, (label, url) in enumerate(links):
        safe_label = html.escape(label)
        safe_url = html.escape(url, quote=True)
        value = value.replace(
            f"@@LINK{index}@@",
            f'<a href="{safe_url}" color="#008A3D"><u>{safe_label}</u></a>',
        )
    return value


def make_styles() -> dict[str, ParagraphStyle]:
    sample = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "Title",
            parent=sample["Title"],
            fontName="FranklinBook",
            fontSize=27,
            leading=30,
            textColor=NAVY,
            alignment=TA_LEFT,
            spaceAfter=8,
            keepWithNext=True,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=sample["Heading2"],
            fontName="FranklinBook",
            fontSize=16,
            leading=19,
            textColor=NAVY,
            spaceBefore=13,
            spaceAfter=6,
            keepWithNext=True,
        ),
        "h3": ParagraphStyle(
            "H3",
            parent=sample["Heading3"],
            fontName="FranklinBook",
            fontSize=12.5,
            leading=15,
            textColor=GREEN,
            spaceBefore=9,
            spaceAfter=4,
            keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=sample["BodyText"],
            fontName="FranklinBook",
            fontSize=9.6,
            leading=13.2,
            textColor=NAVY,
            spaceAfter=5,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=sample["BodyText"],
            fontName="FranklinBook",
            fontSize=9.4,
            leading=12.5,
            textColor=NAVY,
            leftIndent=3,
        ),
        "code": ParagraphStyle(
            "Code",
            parent=sample["Code"],
            fontName="FranklinBook",
            fontSize=8.3,
            leading=11,
            textColor=colors.HexColor("#23345E"),
            leftIndent=8,
            rightIndent=8,
            borderColor=LINE,
            borderWidth=0.6,
            borderPadding=7,
            backColor=PALE,
            spaceBefore=3,
            spaceAfter=7,
        ),
        "table_header": ParagraphStyle(
            "TableHeader",
            parent=sample["BodyText"],
            fontName="FranklinBook",
            fontSize=8.7,
            leading=10.5,
            textColor=colors.white,
            alignment=TA_LEFT,
        ),
        "table_cell": ParagraphStyle(
            "TableCell",
            parent=sample["BodyText"],
            fontName="FranklinBook",
            fontSize=8.1,
            leading=10.4,
            textColor=NAVY,
        ),
        "footer": ParagraphStyle(
            "Footer",
            parent=sample["BodyText"],
            fontName="FranklinBook",
            fontSize=7.5,
            leading=9,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
    }


def parse_table(lines: list[str], styles: dict[str, ParagraphStyle], width: float) -> Table:
    raw_rows = []
    for line in lines:
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if all(re.fullmatch(r":?-{3,}:?", cell.replace(" ", "")) for cell in cells):
            continue
        raw_rows.append(cells)

    columns = max(len(row) for row in raw_rows)
    for row in raw_rows:
        row.extend([""] * (columns - len(row)))

    data = []
    for row_index, row in enumerate(raw_rows):
        style = styles["table_header"] if row_index == 0 else styles["table_cell"]
        data.append([Paragraph(inline_markup(cell), style) for cell in row])

    if columns == 2:
        first_header = raw_rows[0][0].lower()
        if "дата" in first_header:
            col_widths = [43 * mm, width - 43 * mm]
        elif "файл" in first_header:
            col_widths = [65 * mm, width - 65 * mm]
        else:
            col_widths = [width * 0.66, width * 0.34]
    else:
        col_widths = [width / columns] * columns

    table = Table(data, colWidths=col_widths, repeatRows=1, hAlign="LEFT")
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for row_index in range(1, len(data)):
        if row_index % 2 == 0:
            commands.append(("BACKGROUND", (0, row_index), (-1, row_index), PALE))
    table.setStyle(TableStyle(commands))
    return table


def markdown_to_story(text: str, styles: dict[str, ParagraphStyle], content_width: float):
    lines = normalize_text(text).splitlines()
    story = []
    paragraph: list[str] = []
    bullets: list[str] = []
    code_lines: list[str] = []
    in_code = False
    index = 0

    def flush_paragraph() -> None:
        if paragraph:
            story.append(Paragraph(inline_markup(" ".join(paragraph)), styles["body"]))
            paragraph.clear()

    def flush_bullets() -> None:
        if bullets:
            items = [ListItem(Paragraph(inline_markup(item), styles["bullet"]), leftIndent=8) for item in bullets]
            story.append(
                ListFlowable(
                    items,
                    bulletType="bullet",
                    start="circle",
                    leftIndent=15,
                    bulletFontName="FranklinBook",
                    bulletFontSize=6,
                    bulletColor=GREEN,
                    spaceAfter=5,
                )
            )
            bullets.clear()

    def flush_code() -> None:
        if code_lines:
            body = "<br/>".join(html.escape(line) if line else "&nbsp;" for line in code_lines)
            story.append(Paragraph(body, styles["code"]))
            code_lines.clear()

    while index < len(lines):
        line = lines[index].rstrip()
        stripped = line.strip()

        if stripped.startswith("```"):
            flush_paragraph()
            flush_bullets()
            if in_code:
                flush_code()
                in_code = False
            else:
                in_code = True
            index += 1
            continue
        if in_code:
            code_lines.append(line)
            index += 1
            continue

        if stripped.startswith("|") and index + 1 < len(lines) and lines[index + 1].strip().startswith("|"):
            flush_paragraph()
            flush_bullets()
            table_lines = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                table_lines.append(lines[index])
                index += 1
            story.append(parse_table(table_lines, styles, content_width))
            story.append(Spacer(1, 6))
            continue

        heading = re.match(r"^(#{1,3})\s+(.+)$", stripped)
        if heading:
            flush_paragraph()
            flush_bullets()
            level = len(heading.group(1))
            title = heading.group(2)
            if title.startswith("Значимые обновления") and story:
                story.append(PageBreak())
            if level == 1:
                story.append(Spacer(1, 3 * mm))
                story.append(Paragraph(inline_markup(title), styles["title"]))
                story.append(
                    Table(
                        [[""]],
                        colWidths=[34 * mm],
                        rowHeights=[2.2 * mm],
                        style=TableStyle(
                            [
                                ("BACKGROUND", (0, 0), (-1, -1), GREEN),
                                ("FONTNAME", (0, 0), (-1, -1), "FranklinBook"),
                            ]
                        ),
                    )
                )
                story.append(Spacer(1, 5 * mm))
            else:
                story.append(Paragraph(inline_markup(title), styles["h2" if level == 2 else "h3"]))
            index += 1
            continue

        bullet = re.match(r"^-\s+(.+)$", stripped)
        numbered = re.match(r"^\d+\.\s+(.+)$", stripped)
        if bullet or numbered:
            flush_paragraph()
            bullets.append((bullet or numbered).group(1))
            index += 1
            continue

        if not stripped:
            flush_paragraph()
            flush_bullets()
        else:
            paragraph.append(stripped)
        index += 1

    flush_paragraph()
    flush_bullets()
    flush_code()
    return story


def draw_page(canvas, doc) -> None:
    canvas.saveState()
    width, height = A4
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(doc.leftMargin, height - 13 * mm, width - doc.rightMargin, height - 13 * mm)
    canvas.setFont("FranklinBook", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(doc.leftMargin, height - 10 * mm, "TENANT MIX ONLINE DASHBOARD")
    canvas.drawRightString(width - doc.rightMargin, height - 10 * mm, "README | 16.07.2026")
    canvas.line(doc.leftMargin, 13 * mm, width - doc.rightMargin, 13 * mm)
    canvas.drawString(doc.leftMargin, 9 * mm, "Сравнение арендного состава торговых центров")
    canvas.drawRightString(width - doc.rightMargin, 9 * mm, f"Страница {doc.page}")
    canvas.restoreState()


def main() -> None:
    register_fonts()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    styles = make_styles()
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="Tenant Mix Online Dashboard - README",
        author="Tenant Mix Dashboard",
        subject="Описание, методика и журнал обновлений дашборда",
    )
    story = markdown_to_story(README.read_text(encoding="utf-8"), styles, A4[0] - doc.leftMargin - doc.rightMargin)
    doc.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
    print(OUTPUT)


if __name__ == "__main__":
    main()
