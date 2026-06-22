#!/usr/bin/env python3
"""
Generate a PDF from docs/RUNBOOK_W1437.md using ReportLab.

Usage:
  python scripts/generate-runbook-pdf.py [input.md] [output.pdf]

Defaults:
  input  = docs/RUNBOOK_W1437.md
  output = docs/RUNBOOK_W1437.pdf
"""

import re
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def parse_markdown(text: str):
    """Very small markdown parser sufficient for the W1437 runbook."""
    lines = text.splitlines()
    blocks = []
    i = 0

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        # Horizontal rule
        if stripped == "---":
            blocks.append({"type": "hr"})
            i += 1
            continue

        # Headings
        if stripped.startswith("# "):
            blocks.append({"type": "h1", "text": stripped[2:]})
            i += 1
            continue
        if stripped.startswith("## "):
            blocks.append({"type": "h2", "text": stripped[3:]})
            i += 1
            continue
        if stripped.startswith("### "):
            blocks.append({"type": "h3", "text": stripped[4:]})
            i += 1
            continue

        # Code block
        if stripped.startswith("```"):
            lang = stripped[3:].strip()
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i])
                i += 1
            blocks.append({"type": "code", "lang": lang, "lines": code_lines})
            i += 1
            continue

        # Table
        if "|" in stripped and stripped.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                row = [cell.strip() for cell in lines[i].strip().strip("|").split("|")]
                rows.append(row)
                i += 1
            # Skip separator rows (contain only ---)
            rows = [r for r in rows if not all("---" in c for c in r)]
            blocks.append({"type": "table", "rows": rows})
            continue

        # Unordered list
        if re.match(r"^[-*]\s", stripped):
            items = []
            while i < len(lines) and re.match(r"^[-*]\s", lines[i].strip()):
                items.append(re.sub(r"^[-*]\s", "", lines[i].strip()))
                i += 1
            blocks.append({"type": "ul", "items": items})
            continue

        # Ordered list
        if re.match(r"^\d+\.\s", stripped):
            items = []
            while i < len(lines) and re.match(r"^\d+\.\s", lines[i].strip()):
                items.append(re.sub(r"^\d+\.\s", "", lines[i].strip()))
                i += 1
            blocks.append({"type": "ol", "items": items})
            continue

        # Checkbox list
        if re.match(r"^\[([ xX])\]\s", stripped):
            items = []
            while i < len(lines) and re.match(r"^\[[ xX]\]\s", lines[i].strip()):
                match = re.match(r"^\[([ xX])\]\s(.*)", lines[i].strip())
                items.append((match.group(1).lower() == "x", match.group(2)))
                i += 1
            blocks.append({"type": "checklist", "items": items})
            continue

        # Paragraph
        para_lines = []
        while i < len(lines) and lines[i].strip():
            para_lines.append(lines[i].strip())
            i += 1
        blocks.append({"type": "p", "text": " ".join(para_lines)})

    return blocks


def escape_html(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def inline_to_html(text: str) -> str:
    text = escape_html(text)
    # Bold
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    # Italic
    text = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"<i>\1</i>", text)
    # Inline code
    text = re.sub(r"`([^`]+)`", r"<font face='Courier'>\1</font>", text)
    # Links [text](url)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"<a href='\2' color='blue'>\1</a>", text)
    return text


def build_pdf(input_path: Path, output_path: Path):
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    custom_styles = {
        "h1": ParagraphStyle(
            "H1",
            parent=styles["Heading1"],
            fontSize=20,
            textColor=colors.HexColor("#1a365d"),
            spaceAfter=14,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=styles["Heading2"],
            fontSize=16,
            textColor=colors.HexColor("#2c5282"),
            spaceAfter=10,
            spaceBefore=12,
        ),
        "h3": ParagraphStyle(
            "H3",
            parent=styles["Heading3"],
            fontSize=13,
            textColor=colors.HexColor("#2b6cb0"),
            spaceAfter=8,
            spaceBefore=10,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=styles["BodyText"],
            fontSize=10,
            leading=14,
            spaceAfter=8,
        ),
        "code": ParagraphStyle(
            "Code",
            parent=styles["Code"],
            fontSize=8,
            fontName="Courier",
            leading=10,
            leftIndent=0.5 * cm,
            textColor=colors.HexColor("#2d3748"),
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=styles["BodyText"],
            fontSize=10,
            leading=14,
            leftIndent=0.5 * cm,
            bulletIndent=0.2 * cm,
            spaceAfter=4,
        ),
    }

    story = []
    blocks = parse_markdown(input_path.read_text(encoding="utf-8"))

    for block in blocks:
        if block["type"] == "h1":
            story.append(Paragraph(inline_to_html(block["text"]), custom_styles["h1"]))
        elif block["type"] == "h2":
            story.append(Paragraph(inline_to_html(block["text"]), custom_styles["h2"]))
        elif block["type"] == "h3":
            story.append(Paragraph(inline_to_html(block["text"]), custom_styles["h3"]))
        elif block["type"] == "p":
            story.append(Paragraph(inline_to_html(block["text"]), custom_styles["body"]))
        elif block["type"] == "hr":
            story.append(Spacer(1, 0.3 * cm))
            story.append(HRFlowable(width="100%", thickness=1, color=colors.grey))
            story.append(Spacer(1, 0.3 * cm))
        elif block["type"] == "code":
            code_text = "<br/>".join(escape_html(line) for line in block["lines"])
            story.append(
                Table(
                    [[Paragraph(code_text or " ", custom_styles["code"])]],
                    colWidths=[doc.width],
                    style=TableStyle([
                        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f7fafc")),
                        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                        ("LEFTPADDING", (0, 0), (-1, -1), 8),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                        ("TOPPADDING", (0, 0), (-1, -1), 8),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ]),
                )
            )
            story.append(Spacer(1, 0.2 * cm))
        elif block["type"] == "ul":
            for item in block["items"]:
                story.append(
                    Paragraph(f"• {inline_to_html(item)}", custom_styles["bullet"])
                )
            story.append(Spacer(1, 0.1 * cm))
        elif block["type"] == "ol":
            for idx, item in enumerate(block["items"], 1):
                story.append(
                    Paragraph(f"{idx}. {inline_to_html(item)}", custom_styles["bullet"])
                )
            story.append(Spacer(1, 0.1 * cm))
        elif block["type"] == "checklist":
            for checked, item in block["items"]:
                box = "☑" if checked else "☐"
                story.append(
                    Paragraph(f"{box} {inline_to_html(item)}", custom_styles["bullet"])
                )
            story.append(Spacer(1, 0.1 * cm))
        elif block["type"] == "table":
            data = [[Paragraph(inline_to_html(cell), custom_styles["body"]) for cell in row] for row in block["rows"]]
            if data:
                table = Table(data, colWidths=[doc.width / len(data[0])] * len(data[0]))
                table.setStyle(TableStyle([
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#edf2f7")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]))
                story.append(table)
                story.append(Spacer(1, 0.2 * cm))

    doc.build(story)
    print(f"Generated PDF: {output_path}")


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    input_file = Path(sys.argv[1]) if len(sys.argv) > 1 else root / "docs" / "RUNBOOK_W1437.md"
    output_file = Path(sys.argv[2]) if len(sys.argv) > 2 else root / "docs" / "RUNBOOK_W1437.pdf"

    if not input_file.exists():
        print(f"Input not found: {input_file}", file=sys.stderr)
        sys.exit(1)

    build_pdf(input_file, output_file)
