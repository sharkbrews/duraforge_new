"""Native (text-layer) page primitives via PyMuPDF.

Design notes
------------
* Words come from ``get_text("words")`` (exact geometry); style (size, bold,
  italic, mono, superscript) is looked up from the ``dict`` spans of the *same*
  (block, line), so we never do an O(words x spans) search.
* Ruling lines are harvested from the vector drawings.  Many generators (this
  project's source PDF included) draw table borders as zero-thickness filled
  rectangles; stock table finders ignore those, so we normalise strokes, thin
  rectangles and rectangle outlines into one list of :class:`Rule` objects.
"""

from __future__ import annotations

import hashlib
from pathlib import Path

import pymupdf

from .config import ConvertConfig
from .models import BBox, ImageRef, RawPage, Rule, Shade, Word

THIN_MAX = 2.5  # a filled rect thinner than this (pt) is a ruling line
MIN_RULE_LEN = 3.0
_TEXT_FLAGS = pymupdf.TEXTFLAGS_DICT & ~pymupdf.TEXT_PRESERVE_IMAGES
_MONO_HINTS = ("mono", "courier", "consolas", "menlo", "lucidaconsole", "code", "typewriter")


def luminance(color: tuple[float, ...] | None) -> float:
    """Approximate luminance of a gray/RGB/CMYK PDF colour (0 black .. 1 white)."""
    if not color:
        return 1.0
    if len(color) == 1:
        return float(color[0])
    if len(color) == 3:
        r, g, b = color
        return 0.299 * r + 0.587 * g + 0.114 * b
    if len(color) == 4:
        c, m, y, k = color
        return 0.299 * (1 - c) * (1 - k) + 0.587 * (1 - m) * (1 - k) + 0.114 * (1 - y) * (1 - k)
    return 1.0


def _style_from_span(span: dict) -> tuple[float, bool, bool, bool, bool]:
    font = str(span.get("font", "")).lower()
    flags = int(span.get("flags", 0))
    bold = bool(flags & 16) or any(k in font for k in ("bold", "black", "heavy", "semibold", "demi"))
    italic = bool(flags & 2) or any(k in font for k in ("italic", "oblique"))
    mono = bool(flags & 8) or any(k in font for k in _MONO_HINTS)
    sup = bool(flags & 1)
    return float(span.get("size", 0.0)), bold, italic, mono, sup


def collect_words(page: pymupdf.Page) -> list[Word]:
    raw_words = page.get_text("words")
    if not raw_words:
        return []
    spans_by_line: dict[tuple[int, int], list[dict]] = {}
    for block in page.get_text("dict", flags=_TEXT_FLAGS)["blocks"]:
        if block.get("type") != 0:
            continue
        for li, line in enumerate(block["lines"]):
            spans_by_line[(block["number"], li)] = line["spans"]

    words: list[Word] = []
    for x0, y0, x1, y1, text, bno, lno, _wno in raw_words:
        if not text.strip():
            continue
        spans = spans_by_line.get((bno, lno)) or []
        chosen = None
        cx = (x0 + x1) / 2
        for span in spans:
            sx0, _, sx1, _ = span["bbox"]
            if sx0 - 0.5 <= cx <= sx1 + 0.5:
                chosen = span
                break
        if chosen is None and spans:
            chosen = spans[0]
        size, bold, italic, mono, sup = _style_from_span(chosen) if chosen else (y1 - y0, False, False, False, False)
        # MuPDF glues a trailing superscript onto the previous word ("out1"): split it back off.
        tail_span = next(
            (
                s for s in spans
                if (int(s.get("flags", 0)) & 1) and s["text"].strip() and text.endswith(s["text"].strip())
                and len(text) > len(s["text"].strip()) and x0 < s["bbox"][0] < x1 and s is not chosen
            ),
            None,
        )
        if tail_span is not None:
            tail = tail_span["text"].strip()
            ssize, sbold, sital, smono, _ = _style_from_span(tail_span)
            boundary = tail_span["bbox"][0]
            words.append(Word(text[: -len(tail)], x0, y0, boundary, y1, size, bold, italic, mono, False, None, None, bno, lno))
            words.append(Word(tail, boundary, tail_span["bbox"][1], x1, tail_span["bbox"][3], ssize, sbold, sital, smono, True, None, None, bno, lno))
            continue
        words.append(Word(text, x0, y0, x1, y1, size, bold, italic, mono, sup, None, None, bno, lno))
    return words


def attach_links(page: pymupdf.Page, words: list[Word]) -> None:
    """Copy URI / internal-page link targets onto the words they cover."""
    for link in page.get_links():
        rect = link.get("from")
        if rect is None:
            continue
        uri = link.get("uri") if link.get("kind") == pymupdf.LINK_URI else None
        goto = link.get("page") if link.get("kind") == pymupdf.LINK_GOTO else None
        if uri is None and goto is None:
            continue
        for w in words:
            if rect.x0 - 1 <= w.cx <= rect.x1 + 1 and rect.y0 - 1 <= w.cy <= rect.y1 + 1:
                w.uri, w.goto = uri, (int(goto) if goto is not None and goto >= 0 else None)


def collect_geometry(page: pymupdf.Page) -> tuple[list[Rule], list[Shade], list[BBox]]:
    """Return (rules, shades, other_drawings) with all coordinates in points."""
    rules: list[Rule] = []
    shades: list[Shade] = []
    other: list[BBox] = []
    page_area = page.rect.width * page.rect.height

    def add_rule(x0: float, y0: float, x1: float, y1: float, width: float) -> None:
        w, h = x1 - x0, y1 - y0
        if w >= h and w >= MIN_RULE_LEN:
            rules.append(Rule("h", (y0 + y1) / 2, x0, x1, max(width, h)))
        elif h > w and h >= MIN_RULE_LEN:
            rules.append(Rule("v", (x0 + x1) / 2, y0, y1, max(width, w)))

    for drawing in page.get_drawings():
        fill, color = drawing.get("fill"), drawing.get("color")
        stroke_w = float(drawing.get("width") or 0.0)
        complex_path = False
        for item in drawing["items"]:
            op = item[0]
            if op == "re" or op == "qu":
                r = item[1].rect if op == "qu" else item[1]
                w, h = r.width, r.height
                if fill is not None:
                    lum = luminance(fill)
                    if min(w, h) <= THIN_MAX and max(w, h) >= MIN_RULE_LEN:
                        if lum < 0.985:
                            add_rule(r.x0, r.y0, r.x1, r.y1, min(w, h))
                    elif lum < 0.985 and w >= 20 and h >= 5 and w * h < 0.6 * page_area:
                        shades.append(Shade((r.x0, r.y0, r.x1, r.y1), lum))
                if color is not None:
                    add_rule(r.x0, r.y0, r.x1, r.y0, stroke_w)
                    add_rule(r.x0, r.y1, r.x1, r.y1, stroke_w)
                    add_rule(r.x0, r.y0, r.x0, r.y1, stroke_w)
                    add_rule(r.x1, r.y0, r.x1, r.y1, stroke_w)
            elif op == "l":
                p1, p2 = item[1], item[2]
                if color is None:
                    continue
                if abs(p1.y - p2.y) <= 1.0 and abs(p1.x - p2.x) >= MIN_RULE_LEN:
                    add_rule(min(p1.x, p2.x), p1.y, max(p1.x, p2.x), p1.y, stroke_w)
                elif abs(p1.x - p2.x) <= 1.0 and abs(p1.y - p2.y) >= MIN_RULE_LEN:
                    add_rule(p1.x, min(p1.y, p2.y), p1.x, max(p1.y, p2.y), stroke_w)
                else:
                    complex_path = True
            else:  # curves and anything else
                complex_path = True
        if complex_path:
            r = drawing["rect"]
            if r.width > 1 or r.height > 1:
                other.append((r.x0, r.y0, r.x1, r.y1))
    return rules, shades, other


def build_native_page(page: pymupdf.Page) -> RawPage:
    words = collect_words(page)
    attach_links(page, words)
    rules, shades, other = collect_geometry(page)
    return RawPage(page.number + 1, page.rect.width, page.rect.height, words, rules, shades, other)


# --- images -------------------------------------------------------------------


def _write_atomic(path: Path, data: bytes) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_bytes(data)
    tmp.replace(path)


def save_raster_image(doc: pymupdf.Document, xref: int, dest_stem: Path) -> tuple[Path, int, int, bytes] | None:
    """Save an image XObject, keeping transparency; returns (path, w, h, bytes)."""
    info = doc.extract_image(xref)
    if not info:
        return None
    smask = info.get("smask", 0)
    colorspace_n = info.get("colorspace", 3)
    if not smask and info["ext"] in ("png", "jpeg", "jpg") and colorspace_n in (1, 3):
        ext = "jpg" if info["ext"] in ("jpeg", "jpg") else "png"
        path = dest_stem.with_suffix("." + ext)
        _write_atomic(path, info["image"])
        return path, int(info["width"]), int(info["height"]), info["image"]

    pix = pymupdf.Pixmap(doc, xref)
    if pix.alpha or (pix.colorspace is not None and pix.colorspace.n != 3):
        pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
    if smask:
        try:
            pix = pymupdf.Pixmap(pix, pymupdf.Pixmap(doc, smask))
        except Exception:  # mask of a different size etc.: keep the opaque image
            pass
    path = dest_stem.with_suffix(".png")
    data = pix.tobytes("png")
    _write_atomic(path, data)
    return path, pix.width, pix.height, data


def extract_raster_images(
    doc: pymupdf.Document, page: pymupdf.Page, cfg: ConvertConfig, warnings: list[str]
) -> list[ImageRef]:
    refs: list[ImageRef] = []
    page_no = page.number + 1
    seq = 0
    for info in page.get_image_info(xrefs=True):
        x0, y0, x1, y1 = info["bbox"]
        if min(x1 - x0, y1 - y0) < cfg.min_image_pt:
            continue  # hairline decorative rules stored as images
        seq += 1
        stem = cfg.images_dir / f"p{page_no:03d}_img{seq:02d}"
        try:
            xref = int(info.get("xref") or 0)
            saved = save_raster_image(doc, xref, stem) if xref else None
            if saved is None:  # inline image: rasterise its footprint instead
                pix = page.get_pixmap(clip=pymupdf.Rect(info["bbox"]), dpi=150)
                path = stem.with_suffix(".png")
                data = pix.tobytes("png")
                _write_atomic(path, data)
                saved = (path, pix.width, pix.height, data)
            path, w, h, data = saved
            refs.append(ImageRef(page_no, (x0, y0, x1, y1), path.name, w, h, "raster", hashlib.sha1(data).hexdigest()))
        except Exception as exc:  # noqa: BLE001 - a bad image must not kill the page
            warnings.append(f"page {page_no}: image {seq} could not be extracted ({exc})")
    return refs


# --- vector figures -----------------------------------------------------------


def _expand(b: BBox, m: float) -> BBox:
    return (b[0] - m, b[1] - m, b[2] + m, b[3] + m)


def _overlaps(a: BBox, b: BBox) -> bool:
    return a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]


def cluster_rects(rects: list[BBox], margin: float = 6.0) -> list[tuple[BBox, int]]:
    """Merge rectangles that touch within ``margin``; returns (bbox, member_count)."""
    clusters: list[list[object]] = [[r, 1] for r in rects]
    merged = True
    while merged:
        merged = False
        out: list[list[object]] = []
        for bbox, count in clusters:
            for other in out:
                if _overlaps(_expand(bbox, margin), other[0]):  # type: ignore[arg-type]
                    ob = other[0]
                    other[0] = (min(bbox[0], ob[0]), min(bbox[1], ob[1]), max(bbox[2], ob[2]), max(bbox[3], ob[3]))  # type: ignore[index]
                    other[1] += count  # type: ignore[operator]
                    merged = True
                    break
            else:
                out.append([bbox, count])
        clusters = out
    return [(c[0], c[1]) for c in clusters]  # type: ignore[misc]


def detect_vector_figures(raw: RawPage, exclude: list[BBox]) -> list[BBox]:
    """Dense clusters of curves / diagonals that are not table furniture."""
    candidates = []
    for bbox, count in cluster_rects(raw.other_drawings):
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        if count < 6 or w < 30 or h < 30:
            continue
        if any(_overlaps(bbox, ex) for ex in exclude):
            continue
        candidates.append(bbox)
    return candidates


def render_vector_figure(page: pymupdf.Page, bbox: BBox, cfg: ConvertConfig, seq: int) -> ImageRef:
    page_no = page.number + 1
    clip = pymupdf.Rect(bbox) & page.rect
    pix = page.get_pixmap(clip=clip, dpi=150)
    path = cfg.images_dir / f"p{page_no:03d}_fig{seq:02d}.png"
    data = pix.tobytes("png")
    _write_atomic(path, data)
    return ImageRef(page_no, (clip.x0, clip.y0, clip.x1, clip.y1), path.name, pix.width, pix.height, "vector", hashlib.sha1(data).hexdigest())
