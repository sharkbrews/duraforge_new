"""Independent PDF-side measurements used by the validator.

Deliberately re-implemented with different logic from the converter so a bug in
the converter cannot silently validate itself:

* tables  : ruling lines are clustered by *x-extent* (converter: x-coverage
  profile); columns are counted from visual-line *start anchors* (converter:
  whitespace gutters).
* text    : PyMuPDF words *and* pdfminer (via pdfplumber) text.
* headings: font-size outliers vs. the document body size.
"""

from __future__ import annotations

import re
import statistics
import time
from collections import Counter
from concurrent.futures import ProcessPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path

import pymupdf

from .extract import detect_vector_figures, luminance
from .models import BBox, RawPage

_DOC: pymupdf.Document | None = None
_PLUMBER = None
_OPTS: dict[str, object] = {}
_MARKER = re.compile(r"^(?:[•●○◦▪■□▫‣⁃∙·\u2013\u2014*-]|\d{1,3}[.)]|\(\d{1,3}\)|\(?[a-zA-Z]\))\s+\S")


@dataclass
class ProbeTable:
    bbox: BBox
    rows: int
    cols: int
    tokens: list[str]


@dataclass
class ProbeBlock:
    bbox: BBox
    size: float
    text: str
    in_table: bool
    items: int = 0  # lines that start with a list marker (rendered as separate <li>)


@dataclass
class PdfPageProbe:
    number: int
    width: float
    height: float
    tokens: list[str] = field(default_factory=list)  # PyMuPDF words, native order
    pdfminer_text: str | None = None
    size_hist: dict[float, int] = field(default_factory=dict)
    blocks: list[ProbeBlock] = field(default_factory=list)
    tables: list[ProbeTable] = field(default_factory=list)
    n_images: int = 0
    n_vector_figures: int = 0
    scanned: bool = False
    seconds: float = 0.0
    error: str | None = None


# --------------------------------------------------------------------------- table probe


def _rules_and_shades(page: pymupdf.Page) -> tuple[list[tuple[float, float, float, float]], list[tuple[float, float, float, float]]]:
    """Return (rules as (y, x0, x1, thickness), shades as (x0, y0, x1, y1))."""
    rules: list[tuple[float, float, float, float]] = []
    shades: list[tuple[float, float, float, float]] = []
    for d in page.get_drawings():
        fill, color = d.get("fill"), d.get("color")
        for it in d["items"]:
            if it[0] == "re":
                r = it[1]
                if fill is not None and luminance(fill) < 0.985:
                    if r.height <= 2.5 and r.width >= 30:
                        rules.append(((r.y0 + r.y1) / 2, r.x0, r.x1, r.height))
                    elif r.height >= 5 and r.width >= 60 and r.height * r.width < 0.6 * page.rect.width * page.rect.height:
                        shades.append((r.x0, r.y0, r.x1, r.y1))
                if color is not None and r.width >= 30:
                    rules.append((r.y0, r.x0, r.x1, d.get("width") or 0.0))
                    rules.append((r.y1, r.x0, r.x1, d.get("width") or 0.0))
            elif it[0] == "l" and color is not None:
                p, q = it[1], it[2]
                if abs(p.y - q.y) <= 1 and abs(p.x - q.x) >= 30:
                    rules.append((p.y, min(p.x, q.x), max(p.x, q.x), d.get("width") or 0.0))
    return rules, shades


def _cluster_extents(rules: list[tuple[float, float, float, float]]) -> list[list[tuple[float, float, float, float]]]:
    clusters: list[list[tuple[float, float, float, float]]] = []
    for r in sorted(rules, key=lambda r: (r[1], r[2])):
        for c in clusters:
            if abs(c[0][1] - r[1]) <= 12 and abs(c[0][2] - r[2]) <= 12:
                c.append(r)
                break
        else:
            clusters.append([r])
    return clusters


def probe_tables(page: pymupdf.Page, words: list[tuple[float, float, float, float, str, int, int, int]]) -> list[ProbeTable]:
    rules, shades = _rules_and_shades(page)
    out: list[ProbeTable] = []
    for cluster in _cluster_extents(rules):
        if len(cluster) < 3:
            continue
        x0 = statistics.median(r[1] for r in cluster)
        x1 = statistics.median(r[2] for r in cluster)
        width = x1 - x0
        if width < 40:
            continue
        # boundaries: this cluster's rules + any rule/shade edge that spans most of it
        ys = [r[0] for r in rules if min(r[2], x1) - max(r[1], x0) >= 0.8 * width]
        for sx0, sy0, sx1, sy1 in shades:
            # same containment idea as the converter: a call-out wider than the table is not part of it
            if x0 - 0.1 * width <= sx0 and sx1 <= x1 + 0.1 * width and min(sx1, x1) - max(sx0, x0) >= 0.6 * width:
                ys += [sy0, sy1]
        ys.sort()
        merged: list[float] = []
        for y in ys:
            if merged and y - merged[-1] <= 3.0:
                continue
            merged.append(y)
        if len(merged) < 3:
            continue
        # split on text-free gaps (stacked tables)
        groups: list[list[float]] = [[merged[0]]]
        for y in merged[1:]:
            gap_empty = y - groups[-1][-1] > 24 and not any(
                groups[-1][-1] < (w[1] + w[3]) / 2 < y and x0 - 2 <= (w[0] + w[2]) / 2 <= x1 + 2 for w in words
            )
            if gap_empty:
                groups.append([y])
            else:
                groups[-1].append(y)
        for g in groups:
            if len(g) < 3:
                continue
            inside = [w for w in words if x0 - 2 <= (w[0] + w[2]) / 2 <= x1 + 2 and g[0] <= (w[1] + w[3]) / 2 <= g[-1]]
            if not inside:
                continue
            rows = sum(
                1
                for lo, hi in zip(g, g[1:])
                if any(lo <= (w[1] + w[3]) / 2 < hi for w in inside)
            )
            # centred banner text would masquerade as column anchors: skip shaded rows
            plain = [
                w for w in inside
                if not any(s[1] - 1 <= (w[1] + w[3]) / 2 <= s[3] + 1 and s[0] - 2 <= (w[0] + w[2]) / 2 <= s[2] + 2 for s in shades)
            ]
            out.append(ProbeTable((x0, g[0], x1, g[-1]), rows, _count_columns(plain or inside), [w[4] for w in inside]))
    return sorted(out, key=lambda t: (round(t.bbox[0] / 20), t.bbox[1]))


def _count_columns(words: list[tuple[float, float, float, float, str, int, int, int]]) -> int:
    """Columns = recurring x-anchors where visual-line segments start."""
    ordered = sorted(words, key=lambda w: ((w[1] + w[3]) / 2, w[0]))
    lines: list[list[tuple[float, float, float, float, str, int, int, int]]] = []
    for w in ordered:
        cy = (w[1] + w[3]) / 2
        if lines and abs(cy - (lines[-1][0][1] + lines[-1][0][3]) / 2) <= 3.0:
            lines[-1].append(w)
        else:
            lines.append([w])
    anchors: list[float] = []
    total_lines = 0
    for ln in lines:
        ln.sort(key=lambda w: w[0])
        total_lines += 1
        start = ln[0][0]
        anchors.append(start)
        for prev, cur in zip(ln, ln[1:]):
            if cur[0] - prev[2] >= 8.0:
                anchors.append(cur[0])
    clusters: list[list[float]] = []
    for a in sorted(anchors):
        if clusters and a - clusters[-1][-1] <= 3.0:
            clusters[-1].append(a)
        else:
            clusters.append([a])
    need = max(3, int(0.15 * total_lines))
    return max(1, sum(1 for c in clusters if len(c) >= need))


# --------------------------------------------------------------------------- page probe


def probe_page(doc: pymupdf.Document, index: int, min_image_pt: float, use_pdfminer: bool) -> PdfPageProbe:
    t0 = time.perf_counter()
    page = doc[index]
    probe = PdfPageProbe(index + 1, page.rect.width, page.rect.height)
    try:
        words = [w for w in page.get_text("words") if w[4].strip()]
        probe.tokens = [w[4] for w in words]
        probe.scanned = len(words) < 4 and bool(page.get_image_info())
        probe.tables = probe_tables(page, words)

        hist: Counter[float] = Counter()
        for block in page.get_text("dict")["blocks"]:
            if block.get("type") != 0:
                continue
            spans = [s for ln in block["lines"] for s in ln["spans"] if s["text"].strip()]
            if not spans:
                continue
            for s in spans:
                hist[round(s["size"] * 2) / 2] += len(s["text"])
            bx = block["bbox"]
            cx, cy = (bx[0] + bx[2]) / 2, (bx[1] + bx[3]) / 2
            in_table = any(t.bbox[0] - 2 <= cx <= t.bbox[2] + 2 and t.bbox[1] <= cy <= t.bbox[3] for t in probe.tables)
            items = sum(
                1 for ln in block["lines"] if _MARKER.match("".join(s["text"] for s in ln["spans"]).strip())
            )
            probe.blocks.append(
                ProbeBlock(tuple(bx), max(s["size"] for s in spans), " ".join(s["text"] for s in spans), in_table, items)  # type: ignore[arg-type]
            )
        probe.size_hist = dict(hist)

        probe.n_images = sum(
            1 for info in page.get_image_info() if min(info["bbox"][2] - info["bbox"][0], info["bbox"][3] - info["bbox"][1]) >= min_image_pt
        )
        from .extract import collect_geometry

        _, _, other = collect_geometry(page)
        raw = RawPage(index + 1, page.rect.width, page.rect.height, other_drawings=other)
        probe.n_vector_figures = len(detect_vector_figures(raw, [t.bbox for t in probe.tables]))

        if use_pdfminer and _PLUMBER is not None:
            probe.pdfminer_text = _PLUMBER.pages[index].extract_text() or ""
    except Exception as exc:  # noqa: BLE001
        probe.error = f"{type(exc).__name__}: {exc}"
    probe.seconds = time.perf_counter() - t0
    return probe


def _init(pdf_path: Path, min_image_pt: float, use_pdfminer: bool) -> None:
    global _DOC, _PLUMBER
    _DOC = pymupdf.open(pdf_path)
    _OPTS["min_image_pt"] = min_image_pt
    _OPTS["pdfminer"] = use_pdfminer
    if use_pdfminer:
        import pdfplumber

        _PLUMBER = pdfplumber.open(pdf_path)


def _work(index: int) -> PdfPageProbe:
    assert _DOC is not None
    return probe_page(_DOC, index, float(_OPTS["min_image_pt"]), bool(_OPTS["pdfminer"]))  # type: ignore[arg-type]


def probe_pdf(
    pdf_path: Path, indices: list[int], workers: int, min_image_pt: float = 6.0, use_pdfminer: bool = True
) -> list[PdfPageProbe]:
    if workers <= 1 or len(indices) < 8:
        _init(pdf_path, min_image_pt, use_pdfminer)
        return [_work(i) for i in indices]
    with ProcessPoolExecutor(
        max_workers=workers, initializer=_init, initargs=(pdf_path, min_image_pt, use_pdfminer)
    ) as pool:
        return list(pool.map(_work, indices, chunksize=4))
