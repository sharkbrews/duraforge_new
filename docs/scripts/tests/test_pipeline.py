"""End-to-end tests on synthetic PDFs (features absent from the real catalogue) plus
regression checks on the real catalogue when it is present.

Run:  .venv\\Scripts\\python.exe -m pytest docs\\scripts\\tests -q
"""

from __future__ import annotations

import re
import shutil
import sys
from pathlib import Path

import pymupdf
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pdfmd.config import ConvertConfig  # noqa: E402
from pdfmd.converter import convert  # noqa: E402
from pdfmd.markdown_writer import escape_md, protect_line_start  # noqa: E402
from pdfmd.render import build_html  # noqa: E402
from pdfmd.validation import f1, parse_markdown, tokenize, validate  # noqa: E402

REAL_PDF = Path(__file__).resolve().parents[2] / "source" / "EMD_EXCON2025.pdf"


# --------------------------------------------------------------------------- fixtures


def make_feature_pdf(path: Path) -> None:
    doc = pymupdf.open()
    for n in (1, 2, 3):
        page = doc.new_page(width=595, height=842)
        page.insert_text((230, 30), "ACME HYDRAULICS MANUAL", fontsize=8)  # running header
        page.insert_text((250, 820), "Confidential", fontsize=8)  # running footer
        if n == 1:
            page.insert_text((72, 90), "Technical Manual TM-100", fontsize=24, fontname="hebo")
            page.insert_text((72, 130), "1 Introduction", fontsize=16, fontname="hebo")
            page.insert_textbox(
                pymupdf.Rect(72, 140, 520, 200),
                "This manual explains how to maintain a hydraulic cylinder and its seal kit. "
                "The text wraps over several lines so that it forms one paragraph in the output.",
                fontsize=10, fontname="helv",
            )
            for i, item in enumerate(("First item", "Second item")):
                page.insert_text((72, 230 + 14 * i), "\u2022 " + item, fontsize=10)
            for i, item in enumerate(("Alpha step", "Beta step")):
                page.insert_text((72, 270 + 14 * i), f"{i + 1}. {item}", fontsize=10)
            page.insert_text((72, 310), "Visit example", fontsize=10)
            page.insert_link({"kind": pymupdf.LINK_URI, "from": pymupdf.Rect(72, 300, 140, 314), "uri": "https://example.com/seals"})
            page.insert_text((72, 330), "Normal", fontsize=10)
            page.insert_text((110, 330), "bold", fontsize=10, fontname="hebo")
            page.insert_text((140, 330), "italic", fontsize=10, fontname="heit")
            page.draw_rect(pymupdf.Rect(72, 345, 420, 380), fill=(0.9, 0.9, 0.9), color=None)
            page.insert_text((80, 367), "Note: Keep hydraulic fluid clean.", fontsize=10)
            # visible-border table with a merged header spanning three columns
            xs, ys = [72, 172, 272, 372], [400, 420, 440, 460, 480]
            for y in ys:
                page.draw_line((xs[0], y), (xs[-1], y), width=0.6)
            for x in (xs[0], xs[-1]):
                page.draw_line((x, ys[0]), (x, ys[-1]), width=0.6)
            for x in xs[1:-1]:
                page.draw_line((x, ys[1]), (x, ys[-1]), width=0.6)
            page.insert_text((76, 414), "Specifications of rod seal kits for cylinders", fontsize=9)
            for r, row in enumerate((("Part", "Bore", "Rod"), ("RS-1", "120", "85"), ("RS-2", "140", "100")), 1):
                for c, text in enumerate(row):
                    page.insert_text((xs[c] + 4, ys[r] + 14), text, fontsize=9)
            page.insert_textbox(pymupdf.Rect(72, 505, 400, 540), "def seal(rod):\n    return rod * 2", fontsize=9, fontname="cour")
            page.insert_htmlbox(pymupdf.Rect(72, 560, 400, 590), "Rod seals wear out<sup>1</sup>", css="* {font-size: 10pt; font-family: sans-serif}")
            page.insert_text((72, 780), "1", fontsize=6)
            page.insert_text((80, 780), "Replace seals every 2000 hours.", fontsize=7)
        elif n == 2:
            page.insert_text((72, 90), "2 Diagrams", fontsize=16, fontname="hebo")
            for i in range(10):
                page.draw_circle((200 + i * 12, 300), 40, color=(0, 0, 0))
            page.insert_text((250, 303), "Cylinder", fontsize=9)
            page.insert_text((72, 380), "Figure 1 cylinder diagram", fontsize=10)
        else:
            page.insert_text((72, 90), "3 Closing", fontsize=16, fontname="hebo")
            page.insert_textbox(pymupdf.Rect(72, 100, 520, 140), "That is all for this short manual about seals.", fontsize=10)
    doc.save(path)


@pytest.fixture(scope="module")
def feature_pdf(tmp_path_factory: pytest.TempPathFactory) -> Path:
    path = tmp_path_factory.mktemp("pdf") / "features.pdf"
    make_feature_pdf(path)
    return path


def run_convert(pdf: Path, tmp: Path, **kw: object) -> tuple[Path, str]:
    out = tmp / "out"
    cfg = ConvertConfig(pdf_path=pdf, md_path=out / f"{pdf.stem}.md", images_dir=out / "images", log_dir=tmp / "logs", workers=1, ocr="off", **kw)  # type: ignore[arg-type]
    convert(cfg)
    return cfg.md_path, cfg.md_path.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def feature_md(feature_pdf: Path, tmp_path_factory: pytest.TempPathFactory) -> tuple[Path, str]:
    return run_convert(feature_pdf, tmp_path_factory.mktemp("conv"))


# --------------------------------------------------------------------------- structure


def test_headings_levels_follow_font_size(feature_md: tuple[Path, str]) -> None:
    text = feature_md[1]
    assert re.search(r"^# Technical Manual TM-100$", text, re.M)
    assert re.search(r"^## 1 Introduction$", text, re.M)
    assert re.search(r"^## 2 Diagrams$", text, re.M)


def test_running_header_footer_moved_to_front_matter(feature_md: tuple[Path, str]) -> None:
    text = feature_md[1]
    front, body = text.split("\n---\n", 1)
    assert "ACME HYDRAULICS MANUAL" in front and "Confidential" in front
    assert "ACME HYDRAULICS MANUAL" not in body
    assert "furniture=header,footer" in body


def test_paragraph_is_a_single_joined_block(feature_md: tuple[Path, str]) -> None:
    assert "seal kit. The text wraps over several lines" in feature_md[1].replace("\n", " ")


def test_lists_links_and_emphasis(feature_md: tuple[Path, str]) -> None:
    text = feature_md[1]
    assert re.search(r"^- First item$", text, re.M) and re.search(r"^- Second item$", text, re.M)
    assert re.search(r"^1\. Alpha step$", text, re.M) and re.search(r"^2\. Beta step$", text, re.M)
    assert "[Visit example](https://example.com/seals)" in text
    assert "**bold**" in text and "*italic*" in text


def test_callout_code_and_footnote(feature_md: tuple[Path, str]) -> None:
    text = feature_md[1]
    assert re.search(r"^> Note: Keep hydraulic fluid clean\.$", text, re.M)
    assert re.search(r"```\ndef seal\(rod\):\n\s+return rod \* 2\n```", text)
    assert re.search(r"\[\^p001-1\]", text) and re.search(r"^\[\^p001-1\]: Replace seals every 2000 hours\.$", text, re.M)


def test_bordered_table_with_merged_header(feature_md: tuple[Path, str]) -> None:
    text = feature_md[1]
    assert '<th colspan="3">' in text or 'colspan="3"' in text
    doc = parse_markdown(text)
    table = doc.pages[0].tables[0]
    assert (table.rows, table.cols) == (4, 3) and table.merged == 1
    assert {"RS", "1", "120", "85", "140", "100"} <= set(table.tokens)


def test_vector_figure_rasterised_and_text_kept(feature_md: tuple[Path, str]) -> None:
    md_path, text = feature_md
    assert re.search(r"!\[Figure on page 2\]\(images/p002_fig01\.png\)", text)
    assert (md_path.parent / "images" / "p002_fig01.png").is_file()
    assert "figure-text: Cylinder" in text


def test_validator_passes_on_clean_conversion(feature_pdf: Path, feature_md: tuple[Path, str]) -> None:
    report = validate(feature_pdf, feature_md[0], workers=1, use_pdfminer=True)
    failing = [(c.name, c.detail) for c in report.checks if c.status == "FAIL"]
    assert report.overall == "PASS", failing


def test_validator_detects_a_dropped_table_row(feature_pdf: Path, feature_md: tuple[Path, str], tmp_path: Path) -> None:
    broken = tmp_path / "broken.md"
    lines = [ln for ln in feature_md[1].splitlines() if "RS-2" not in ln]
    assert len(lines) < len(feature_md[1].splitlines())
    broken.write_text("\n".join(lines), encoding="utf-8")
    images = tmp_path / "images"
    shutil.copytree(feature_md[0].parent / "images", images)
    report = validate(feature_pdf, broken, workers=1, use_pdfminer=False)
    assert report.overall == "FAIL"
    assert any(t.status == "FAIL" for t in report.tables)


def test_html_regeneration_keeps_one_section_per_page(feature_md: tuple[Path, str]) -> None:
    html_doc, sections = build_html(feature_md[1], feature_md[0].parent)
    assert sections == 3
    assert html_doc.count('<section class="page') == 3
    assert "ACME HYDRAULICS MANUAL" in html_doc


# --------------------------------------------------------------------------- scanned / OCR


def test_scanned_page_goes_through_ocr_and_tables_survive(feature_pdf: Path, tmp_path: Path) -> None:
    pytest.importorskip("rapidocr_onnxruntime")
    scan = tmp_path / "scan.pdf"
    src = pymupdf.open(feature_pdf)
    out = pymupdf.open()
    page = out.new_page(width=595, height=842)
    page.insert_image(page.rect, pixmap=src[0].get_pixmap(dpi=200))
    out.save(scan)

    cfg_dir = tmp_path / "o"
    cfg = ConvertConfig(pdf_path=scan, md_path=cfg_dir / "scan.md", images_dir=cfg_dir / "images", log_dir=tmp_path / "logs", workers=1, ocr="auto")
    result = convert(cfg)
    text = cfg.md_path.read_text(encoding="utf-8")
    assert result.ocr_pages == 1 and "ocr=1" in text
    plain = " ".join(parse_markdown(text).pages[0].text.split()).lower()
    for needle in ("technical manual", "introduction", "hydraulic cylinder", "keep hydraulic fluid clean"):
        assert needle in plain, needle
    assert parse_markdown(text).pages[0].tables, "ruled table in the scan should be rebuilt from raster lines"


# --------------------------------------------------------------------------- unit


def test_escape_and_line_start_protection() -> None:
    assert escape_md("a*b_c [x] <b>") == "a\\*b_c \\[x\\] \\<b>"
    assert protect_line_start("# not a heading") == "\\# not a heading"
    assert protect_line_start("1. not a list") == "1\\. not a list"


def test_tokenizer_ignores_leaders_and_wrap_hyphens() -> None:
    assert tokenize("ABEL ------------------------------ 1") == ["ABEL", "1"]
    assert tokenize("AB06C-BOOM-050-") + tokenize("090") == tokenize("AB06C-BOOM-050-090")
    assert f1(["a", "b"], ["b", "a"]) == 1.0 and f1(["a"], ["b"]) == 0.0


# --------------------------------------------------------------------------- real catalogue


@pytest.mark.skipif(not REAL_PDF.is_file(), reason="catalogue PDF not present")
def test_real_catalogue_two_panel_page(tmp_path: Path) -> None:
    md_path, text = run_convert(REAL_PDF, tmp_path, pages=(8, 8))
    page = parse_markdown(text).pages[0]
    assert [(t.rows, t.cols) for t in page.tables] == [(43, 2), (44, 2)]
    assert any("AB06C-BOOM-050-090" in t.tokens or "AB06C" in t.tokens for t in page.tables)
    assert "AB06C-BOOM-050-090" in text  # wrapped cell was re-joined
    assert 'colspan="2" class="banner">ABEL-AB06C' in text
