"""PDF -> Markdown orchestration.

Pipeline
--------
1. *Extract* (parallel, one task per page): words/rules/shades/images -> tables
   -> text blocks.  Scanned pages go through OCR first.
2. *Analyse* (parent process, needs the whole document): running headers/footers,
   body font size & heading tiers, reading order, lists/footnotes/call-outs.
3. *Write*: front matter + one ``<!-- page=N -->`` section per page, atomically.
"""

from __future__ import annotations

import json
import time
import traceback
from collections import defaultdict
from concurrent.futures import ProcessPoolExecutor
from dataclasses import asdict, dataclass, field
from pathlib import Path

import pymupdf

from .config import ConvertConfig
from .extract import (
    build_native_page,
    detect_vector_figures,
    extract_raster_images,
    render_vector_figure,
)
from .layout import classify_page, compute_stats, detect_furniture, strip_furniture
from .logging_setup import get_logger
from .markdown_writer import front_matter, relative_images_dir, render_page
from .models import (
    BBox,
    ImageRef,
    Line,
    PageContent,
    PageLayout,
    RawPage,
    Shade,
    Table,
    TextBlock,
    Word,
    union_bbox,
)
from .tables import TableParams, detect_tables, detect_with_pymupdf, words_in_tables

log = get_logger("convert")

_DOC: pymupdf.Document | None = None
_CFG: ConvertConfig | None = None


# --------------------------------------------------------------------------- worker side


def _init_worker(cfg: ConvertConfig) -> None:
    global _DOC, _CFG
    _CFG = cfg
    _DOC = pymupdf.open(cfg.pdf_path)


def _worker(index: int) -> PageContent:
    assert _DOC is not None and _CFG is not None
    return extract_page_content(_DOC, index, _CFG)


def build_blocks(words: list[Word], page_no: int) -> list[TextBlock]:
    """Group words into blocks of lines using the (block, line) ids from the text layer."""
    by_block: dict[int, dict[int, list[Word]]] = defaultdict(lambda: defaultdict(list))
    for w in words:
        by_block[w.block][w.line].append(w)
    blocks: list[TextBlock] = []
    for _, lines in by_block.items():
        ordered = [Line(sorted(ws, key=lambda w: w.x0)) for ws in lines.values()]
        ordered.sort(key=lambda ln: (round(ln.bbox[1] / 2), ln.bbox[0]))
        blocks.append(TextBlock(ordered, page_no))
    return blocks


def _image_coverage(page: pymupdf.Page) -> float:
    area = page.rect.width * page.rect.height
    covered = 0.0
    for info in page.get_image_info():
        x0, y0, x1, y1 = info["bbox"]
        covered += max(0.0, min(x1, page.rect.x1) - max(x0, page.rect.x0)) * max(0.0, min(y1, page.rect.y1) - max(y0, page.rect.y0))
    return covered / area if area else 0.0


def table_params(cfg: ConvertConfig) -> TableParams:
    return TableParams(gutter_min=cfg.gutter_min, merge_tol=cfg.rule_merge_tol, panel_coverage=cfg.panel_coverage)


def extract_page_content(doc: pymupdf.Document, index: int, cfg: ConvertConfig) -> PageContent:
    t0 = time.perf_counter()
    page = doc[index]
    page_no = index + 1
    warnings: list[str] = []
    try:
        raw: RawPage = build_native_page(page)
        ocr_used = False
        if cfg.ocr != "off":
            scanned = cfg.ocr == "force" or (
                len(raw.words) < cfg.min_scanned_words and _image_coverage(page) >= 0.4
            )
            if scanned:
                try:
                    from .ocr import build_ocr_page

                    raw = build_ocr_page(page, cfg)
                    ocr_used = True
                except Exception as exc:  # noqa: BLE001
                    warnings.append(f"page {page_no}: OCR unavailable or failed ({exc}); using native text")

        params = table_params(cfg)
        tables = detect_tables(raw, params)
        if not tables and not ocr_used and len(raw.rules) >= 4:
            tables = detect_with_pymupdf(page, raw)
        outside, _inside = words_in_tables(raw.words, tables)

        images: list[ImageRef] = []
        if not ocr_used:
            images = extract_raster_images(doc, page, cfg, warnings)
            body_words = [w for w in outside if 0.1 * raw.height < w.cy < 0.9 * raw.height]
            if len(body_words) >= cfg.background_min_words:
                page_area = raw.width * raw.height
                kept = []
                for im in images:
                    area = (im.bbox[2] - im.bbox[0]) * (im.bbox[3] - im.bbox[1])
                    if area >= 0.85 * page_area:
                        warnings.append(f"page {page_no}: full-page background image dropped (text layer present)")
                    else:
                        kept.append(im)
                images = kept

        if cfg.vector_figures and not ocr_used:
            exclude: list[BBox] = [t.bbox for t in tables]
            for seq, bbox in enumerate(detect_vector_figures(raw, exclude), 1):
                fig = render_vector_figure(page, bbox, cfg, seq)
                swallowed = [w for w in outside if bbox[0] <= w.cx <= bbox[2] and bbox[1] <= w.cy <= bbox[3]]
                fig.words_inside = [w.text for w in swallowed]
                outside = [w for w in outside if w not in swallowed]
                images.append(fig)

        shades: list[Shade] = [
            s
            for s in raw.shades
            if not any(t.bbox[0] - 1 <= (s.bbox[0] + s.bbox[2]) / 2 <= t.bbox[2] + 1 and t.bbox[1] - 1 <= (s.bbox[1] + s.bbox[3]) / 2 <= t.bbox[3] + 1 for t in tables)
        ]
        return PageContent(
            page_no, raw.width, raw.height, build_blocks(outside, page_no), tables, images, shades,
            ocr_used, len(raw.words), warnings + raw.warnings, None, time.perf_counter() - t0,
        )
    except Exception as exc:  # noqa: BLE001 - one bad page must not abort a 300-page run
        detail = f"{type(exc).__name__}: {exc}"
        warnings.append(f"page {page_no}: extraction failed ({detail})")
        try:  # last resort: plain text so no content is silently lost
            words = build_native_page(page).words
            blocks = build_blocks(words, page_no)
        except Exception:  # noqa: BLE001
            blocks = []
        return PageContent(
            page_no, page.rect.width, page.rect.height, blocks, [], [], [], False, 0, warnings,
            traceback.format_exc(limit=3), time.perf_counter() - t0,
        )


# --------------------------------------------------------------------------- parent side


@dataclass
class ConversionResult:
    md_path: Path
    manifest_path: Path
    pages: int = 0
    tables: int = 0
    images: int = 0
    headings: int = 0
    ocr_pages: int = 0
    seconds: float = 0.0
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


def _dedupe_images(contents: list[PageContent], images_dir: Path) -> int:
    """Point identical images at one file and delete the duplicates."""
    first: dict[str, str] = {}
    removed = 0
    for pc in contents:
        for im in pc.images:
            if not im.sha1:
                continue
            if im.sha1 in first and first[im.sha1] != im.file:
                (images_dir / im.file).unlink(missing_ok=True)
                im.file = first[im.sha1]
                removed += 1
            else:
                first.setdefault(im.sha1, im.file)
    return removed


def _page_range(cfg: ConvertConfig, total: int) -> list[int]:
    lo, hi = (1, total) if cfg.pages is None else (max(1, cfg.pages[0]), min(total, cfg.pages[1]))
    return list(range(lo - 1, hi))


def convert(cfg: ConvertConfig) -> ConversionResult:
    start = time.perf_counter()
    cfg.images_dir.mkdir(parents=True, exist_ok=True)
    cfg.md_path.parent.mkdir(parents=True, exist_ok=True)

    doc = pymupdf.open(cfg.pdf_path)
    total = doc.page_count
    toc = [(lvl, title) for lvl, title, _ in doc.get_toc()]
    pdf_title = (doc.metadata or {}).get("title") or ""
    indices = _page_range(cfg, total)
    log.info("converting", pdf=str(cfg.pdf_path), pages=len(indices), of=total, workers=cfg.effective_workers)
    doc.close()

    contents: list[PageContent] = []
    workers = min(cfg.effective_workers, max(1, len(indices)))
    if workers == 1 or len(indices) < 8:
        _init_worker(cfg)
        for n, i in enumerate(indices, 1):
            contents.append(_worker(i))
            if n % 25 == 0:
                log.info("progress", pages_done=n, of=len(indices))
    else:
        with ProcessPoolExecutor(max_workers=workers, initializer=_init_worker, initargs=(cfg,)) as pool:
            for n, pc in enumerate(pool.map(_worker, indices, chunksize=4), 1):
                contents.append(pc)
                if n % 25 == 0:
                    log.info("progress", pages_done=n, of=len(indices))

    result = ConversionResult(cfg.md_path, cfg.md_path.with_name(cfg.md_path.stem + ".manifest.json"))
    for pc in contents:
        for w in pc.warnings:
            log.warning(w)
            result.warnings.append(w)
        if pc.error:
            result.errors.append(f"page {pc.page_no}: {pc.error.splitlines()[-1]}")
            log.error("page failed", page=pc.page_no, detail=pc.error)

    removed = _dedupe_images(contents, cfg.images_dir)
    if removed:
        log.info("deduplicated images", removed=removed)

    furniture = detect_furniture(contents, cfg)
    for e in furniture.entries.values():
        log.info("running element", role=e.role, text=e.text[:60], pages=e.pages)

    stripped = [strip_furniture(pc, furniture) for pc in contents]
    stats = compute_stats([s[0] for s in stripped], toc, cfg)
    log.info("document stats", body_size=stats.body_size, heading_tiers=stats.heading_tiers)

    images_rel = relative_images_dir(cfg.md_path, cfg.images_dir)
    layouts: list[PageLayout] = []
    for pc, (blocks, roles, label, fboxes) in zip(contents, stripped):
        elements = classify_page(pc, blocks, stats, cfg)
        body_boxes = [e.bbox for e in elements]
        body = union_bbox(body_boxes) if body_boxes else (0.0, 0.0, 0.0, 0.0)
        box = union_bbox(body_boxes + fboxes) if (body_boxes or fboxes) else body
        layouts.append(PageLayout(pc.page_no, pc.width, pc.height, elements, label, roles, box, body, pc.ocr_used))

    title = next(
        (
            "".join(r.text for r in e.runs).strip()
            for lay in layouts
            for e in lay.elements
            if e.kind == "heading" and e.level == 1
        ),
        pdf_title or cfg.pdf_path.stem,
    )
    parts = [front_matter(title, cfg.pdf_path.name, total, furniture, stats.body_size, stats.heading_tiers)]
    parts += [render_page(lay, cfg.table_format, images_rel) for lay in layouts]
    text = "\n".join(parts)
    tmp = cfg.md_path.with_suffix(".md.tmp")
    tmp.write_text(text, encoding="utf-8", newline="\n")
    tmp.replace(cfg.md_path)

    result.pages = len(layouts)
    result.tables = sum(len(pc.tables) for pc in contents)
    result.images = sum(len(pc.images) for pc in contents)
    result.headings = sum(1 for lay in layouts for e in lay.elements if e.kind == "heading")
    result.ocr_pages = sum(1 for pc in contents if pc.ocr_used)
    result.seconds = time.perf_counter() - start
    _write_manifest(cfg, result, contents, layouts, total)
    log.info(
        "conversion complete", md=str(cfg.md_path), pages=result.pages, tables=result.tables,
        images=result.images, headings=result.headings, ocr_pages=result.ocr_pages,
        warnings=len(result.warnings), errors=len(result.errors), seconds=round(result.seconds, 1),
    )
    return result


def _write_manifest(
    cfg: ConvertConfig, result: ConversionResult, contents: list[PageContent], layouts: list[PageLayout], total: int
) -> None:
    def table_row(t: Table) -> dict[str, object]:
        return {
            "id": t.table_id, "page": t.page, "index": t.index, "panel": f"{t.panel}/{t.panels}",
            "rows": t.n_rows, "cols": t.n_cols, "header_rows": t.header_rows,
            "merged_cells": sum(1 for c in t.cells if c.colspan > 1 or c.rowspan > 1),
            "bbox": [round(v, 1) for v in t.bbox], "detector": t.detector,
        }

    manifest = {
        "source": str(cfg.pdf_path), "markdown": str(cfg.md_path), "pdf_pages": total,
        "converted_pages": result.pages, "tables": [table_row(t) for pc in contents for t in pc.tables],
        "images": [
            {"page": im.page, "file": im.file, "kind": im.kind, "bbox": [round(v, 1) for v in im.bbox]}
            for pc in contents for im in pc.images
        ],
        "ocr_pages": [pc.page_no for pc in contents if pc.ocr_used],
        "page_seconds": {pc.page_no: round(pc.seconds, 3) for pc in contents},
        "warnings": result.warnings, "errors": result.errors,
        "totals": {k: v for k, v in asdict(result).items() if k in ("pages", "tables", "images", "headings", "ocr_pages", "seconds")},
    }
    result.manifest_path.write_text(json.dumps(manifest, indent=1, ensure_ascii=False), encoding="utf-8")
