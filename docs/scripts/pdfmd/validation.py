"""Compare the source PDF with the generated Markdown.

The Markdown is parsed the same way VS Code (and our PDF regenerator) will read
it: markdown-it -> HTML -> a small HTML walker.  That makes the table counts,
row/column counts and text measured here exactly what a reader sees.
"""

from __future__ import annotations

import re
import statistics
import unicodedata
from collections import Counter
from dataclasses import asdict, dataclass, field
from html.parser import HTMLParser
from pathlib import Path

import pymupdf
import yaml
from markdown_it import MarkdownIt
from rapidfuzz import fuzz

from .layout import norm_key
from .logging_setup import get_logger
from .markdown_writer import KV_RE, PAGE_MARKER_RE
from .pdf_probe import ProbeTable, probe_pdf

log = get_logger("validate")

# --------------------------------------------------------------------------- tokens

_LEADER = re.compile(r"(?:[-–—._·…]\s?){4,}")
_INLINE = {"a", "strong", "em", "code", "sup", "sub", "b", "i", "span", "u", "del", "mark", "small"}
_BULLET_ONLY = set("•●○◦▪■□▫‣⁃∙·–—*")
_TOKEN_EDGE = ".,;:()[]{}\"'“”‘’"


def tokenize(text: str) -> list[str]:
    """Normalise so benign formatting differences do not count as content loss.

    * Hyphens are separators: a part number wrapped across two PDF lines
      ("AB06C-BOOM-050-" + "090") and its re-joined form give identical tokens,
      and a trailing hyphen can never glue unrelated neighbouring cells together.
    * Edge punctuation and bare bullet glyphs are dropped: Markdown renders
      list markers and footnote refs differently from the PDF's literal glyphs.
    Hyphen/punctuation presence itself is covered by the character-level oracle.
    """
    text = unicodedata.normalize("NFKC", text).replace("\u200b", "").replace("\u00ad", "")
    text = _LEADER.sub(" ", text).replace("[", "").replace("]", "")
    tokens: list[str] = []
    for raw in re.split(r"[\s-]+", text):
        tok = raw.strip(_TOKEN_EDGE)
        if tok and not set(tok) <= _BULLET_ONLY:
            tokens.append(tok)
    return tokens


def f1(a: list[str], b: list[str]) -> float:
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    ca, cb = Counter(a), Counter(b)
    common = sum((ca & cb).values())
    if common == 0:
        return 0.0
    precision, recall = common / len(b), common / len(a)
    return 2 * precision * recall / (precision + recall)


def char_stream(text: str) -> list[str]:
    text = unicodedata.normalize("NFKC", text).replace("\u200b", "").replace("\u00ad", "")
    return [c for c in _LEADER.sub(" ", text) if not c.isspace()]


def char_f1(a: str, b: str) -> float:
    """Character-bag F1 on raw text (hyphens included).

    Insensitive to token joins and reading order, which is exactly what is
    needed for pdfminer: it interleaves side-by-side columns line by line,
    gluing wrapped fragments from different columns together, so it can only
    serve as an oracle for *which characters exist*.
    """
    return f1(char_stream(a), char_stream(b))


# --------------------------------------------------------------------------- markdown side


@dataclass
class MdTable:
    page: int
    table_id: str | None
    bbox: tuple[float, ...] | None
    rows: int = 0
    cols: int = 0
    header_rows: int = 0
    merged: int = 0
    tokens: list[str] = field(default_factory=list)


@dataclass
class MdPage:
    number: int
    attrs: dict[str, str]
    headings: list[tuple[int, str]] = field(default_factory=list)
    paragraphs: int = 0
    list_items: int = 0
    line_breaks: int = 0
    code_blocks: int = 0
    images: list[str] = field(default_factory=list)
    links: int = 0
    tables: list[MdTable] = field(default_factory=list)
    text: str = ""
    figure_text: str = ""

    @property
    def paragraph_units(self) -> int:
        return self.paragraphs + self.line_breaks + self.code_blocks


@dataclass
class MdDocument:
    front: dict[str, object]
    pages: list[MdPage]


class _PageHtml(HTMLParser):
    def __init__(self, page: MdPage) -> None:
        super().__init__(convert_charrefs=True)
        self.page = page
        self.parts: list[str] = []
        self.heading: list[str] | None = None
        self.heading_level = 0
        self.tables: list[MdTable] = []
        self.stack: list[dict[str, object]] = []
        self.pending_marker: dict[str, object] | None = None
        self.in_thead = False
        self.in_li = 0
        self.lists: list[list[object]] = []  # [tag, counter]
        self.skip_data = 0

    # -- comments carry page geometry / table ids -----------------------------
    def handle_comment(self, data: str) -> None:
        stripped = data.strip()
        if stripped.startswith("table "):
            ident = stripped.split()[1]
            attrs = dict(KV_RE.findall(stripped))
            bbox = tuple(float(v) for v in attrs["bbox"].split(",")) if "bbox" in attrs else None
            self.pending_marker = {"id": ident, "bbox": bbox}
        elif stripped.startswith("figure-text:"):
            self.page.figure_text += " " + stripped[len("figure-text:") :]

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = dict(attrs)
        if tag not in _INLINE:
            self.parts.append(" ")
        if tag == "table":
            marker, self.pending_marker = self.pending_marker, None
            table = MdTable(self.page.number, marker["id"] if marker else None, marker["bbox"] if marker else None)  # type: ignore[arg-type,index]
            self.stack.append({"t": table, "cols": 0, "row_open": False})
            return
        if self.stack:
            ctx = self.stack[-1]
            table: MdTable = ctx["t"]  # type: ignore[assignment]
            if tag == "thead":
                self.in_thead = True
            elif tag == "tr":
                table.rows += 1
                ctx["cols"] = 0
                if self.in_thead:
                    table.header_rows += 1
            elif tag in ("td", "th"):
                span = int(a.get("colspan") or 1)
                ctx["cols"] = int(ctx["cols"]) + span  # type: ignore[call-overload]
                table.cols = max(table.cols, int(ctx["cols"]))  # type: ignore[call-overload]
                if span > 1 or int(a.get("rowspan") or 1) > 1:
                    table.merged += 1
            elif tag == "img":
                self.page.images.append(a.get("src") or "")
            return
        if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            self.heading, self.heading_level = [], int(tag[1])
        elif tag == "p":
            self.page.paragraphs += 1
        elif tag == "li":
            self.in_li += 1
            self.page.list_items += 1
            if self.lists and self.lists[-1][0] == "ol":
                self.lists[-1][1] = int(self.lists[-1][1]) + 1  # type: ignore[call-overload]
                self.parts.append(f" {self.lists[-1][1]}. ")  # the PDF shows the ordinal literally
        elif tag in ("ol", "ul"):
            self.lists.append([tag, int(a.get("start") or 1) - 1])
        elif tag == "br":
            self.page.line_breaks += 1
        elif tag == "pre":
            self.page.code_blocks += 1
        elif tag == "img":
            self.page.images.append(a.get("src") or "")
        elif tag == "a" and a.get("href"):
            if "footnote-backref" in (a.get("class") or ""):
                self.skip_data += 1  # the "back to text" arrow is not document text
            else:
                self.page.links += 1

    def handle_endtag(self, tag: str) -> None:
        if tag not in _INLINE:
            self.parts.append(" ")
        if tag == "table" and self.stack:
            ctx = self.stack.pop()
            self.page.tables.append(ctx["t"])  # type: ignore[arg-type]
        elif tag == "thead":
            self.in_thead = False
        elif tag.startswith("h") and len(tag) == 2 and self.heading is not None:
            self.page.headings.append((self.heading_level, " ".join("".join(self.heading).split())))
            self.heading = None
        elif tag == "li":
            self.in_li = max(0, self.in_li - 1)
        elif tag in ("ol", "ul") and self.lists:
            self.lists.pop()
        elif tag == "a" and self.skip_data:
            self.skip_data -= 1

    def handle_data(self, data: str) -> None:
        if self.skip_data:
            return
        self.parts.append(data)
        if self.stack:
            table: MdTable = self.stack[-1]["t"]  # type: ignore[assignment]
            table.tokens.extend(tokenize(data))
        if self.heading is not None:
            self.heading.append(data)


def _renderer() -> MarkdownIt:
    md = MarkdownIt("commonmark", {"html": True}).enable("table")
    try:
        from mdit_py_plugins.footnote import footnote_plugin

        md.use(footnote_plugin)
    except ImportError:
        pass
    return md


_FRONT = re.compile(r"\A---\n(.*?)\n---\n", re.S)


def parse_markdown(text: str) -> MdDocument:
    front: dict[str, object] = {}
    m = _FRONT.match(text)
    if m:
        front = yaml.safe_load(m.group(1)) or {}
        text = text[m.end() :]
    markers = list(PAGE_MARKER_RE.finditer(text))
    md = _renderer()
    pages: list[MdPage] = []
    for i, mk in enumerate(markers):
        end = markers[i + 1].start() if i + 1 < len(markers) else len(text)
        segment = text[mk.end() : end]
        page = MdPage(int(mk.group(1)), dict(KV_RE.findall(mk.group(2))))
        walker = _PageHtml(page)
        walker.feed(md.render(segment))
        walker.close()
        page.text = "".join(walker.parts)
        pages.append(page)
    return MdDocument(front, pages)


# --------------------------------------------------------------------------- results


@dataclass
class TableResult:
    page: int
    index: int
    pdf_rows: int | None
    pdf_cols: int | None
    md_rows: int | None
    md_cols: int | None
    text_f1: float | None
    status: str
    notes: str = ""
    md_id: str | None = None
    merged: int = 0


@dataclass
class PageResult:
    page: int
    f1_pymupdf: float | None
    f1_pdfminer: float | None
    order_score: float | None
    pdf_tokens: int
    md_tokens: int
    status: str
    notes: str = ""


@dataclass
class Check:
    name: str
    pdf_value: str
    md_value: str
    status: str  # PASS | FAIL | WARN | INFO
    detail: str = ""


@dataclass
class ValidationReport:
    pdf: str
    markdown: str
    checks: list[Check] = field(default_factory=list)
    tables: list[TableResult] = field(default_factory=list)
    pages: list[PageResult] = field(default_factory=list)
    roundtrip: dict[str, object] | None = None
    overall: str = "PASS"
    seconds: float = 0.0
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


# --------------------------------------------------------------------------- comparison


def _iou(a: tuple[float, ...], b: tuple[float, ...]) -> float:
    ix = max(0.0, min(a[2], b[2]) - max(a[0], b[0]))
    iy = max(0.0, min(a[3], b[3]) - max(a[1], b[1]))
    inter = ix * iy
    union = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / union if union > 0 else 0.0


def _match_tables(pdf_tables: list[ProbeTable], md_tables: list[MdTable]) -> list[tuple[ProbeTable | None, MdTable | None]]:
    pairs: list[tuple[ProbeTable | None, MdTable | None]] = []
    used: set[int] = set()
    for pt in pdf_tables:
        best, best_i = 0.0, -1
        for i, mt in enumerate(md_tables):
            if i in used or mt.bbox is None:
                continue
            score = _iou(pt.bbox, mt.bbox)
            if score > best:
                best, best_i = score, i
        if best >= 0.5:
            used.add(best_i)
            pairs.append((pt, md_tables[best_i]))
        else:
            pairs.append((pt, None))
    unmatched = [mt for i, mt in enumerate(md_tables) if i not in used]
    # Markdown without bbox markers: fall back to document order
    leftovers = [p for p in pairs if p[1] is None]
    if leftovers and unmatched and all(mt.bbox is None for mt in unmatched):
        it = iter(unmatched)
        pairs = [(pt, mt if mt is not None else next(it, None)) for pt, mt in pairs]
        unmatched = list(it)
    pairs += [(None, mt) for mt in unmatched]
    return pairs


def _furniture_text(front: dict[str, object], page: MdPage) -> str:
    roles = set((page.attrs.get("furniture") or "").split(","))
    parts: list[str] = []
    for entry in front.get("furniture", []) or []:  # type: ignore[union-attr]
        if entry["role"] in roles and entry["role"] != "pagenum":
            parts.append(str(entry["text"]))
    if "label" in page.attrs:
        parts.append(page.attrs["label"].replace("_", " "))
    return " ".join(parts)


def validate(
    pdf_path: Path,
    md_path: Path,
    workers: int = 4,
    use_pdfminer: bool = True,
    page_threshold: float = 0.98,
    table_threshold: float = 0.995,
    paragraph_tolerance: float = 0.10,
    page_range: tuple[int, int] | None = None,
) -> ValidationReport:
    import time

    start = time.perf_counter()
    report = ValidationReport(str(pdf_path), str(md_path))
    doc = parse_markdown(md_path.read_text(encoding="utf-8"))
    with pymupdf.open(pdf_path) as pdf:
        total_pages = pdf.page_count
    lo, hi = page_range or (1, total_pages)
    hi = min(hi, total_pages)
    indices = list(range(lo - 1, hi))
    log.info("probing PDF", pages=len(indices), pdfminer=use_pdfminer)
    probes = {p.number: p for p in probe_pdf(pdf_path, indices, workers, use_pdfminer=use_pdfminer)}
    md_pages = {p.number: p for p in doc.pages if lo <= p.number <= hi}

    for p in probes.values():
        if p.error:
            report.notes.append(f"probe error on page {p.number}: {p.error}")

    # ---- page count -----------------------------------------------------------------
    expected_numbers = set(probes)
    missing = sorted(expected_numbers - set(md_pages))
    extra = sorted(set(md_pages) - expected_numbers)
    report.checks.append(
        Check(
            "Total page count", str(len(probes)), str(len(md_pages)),
            "PASS" if not missing and not extra else "FAIL",
            f"missing page markers: {missing[:10]}" if missing else (f"unexpected: {extra[:10]}" if extra else "every PDF page has exactly one page marker"),
        )
    )

    # ---- headings -----------------------------------------------------------------
    furniture_keys = {norm_key(str(e["text"])) for e in doc.front.get("furniture", []) or []}  # type: ignore[union-attr]
    hist: Counter[float] = Counter()
    for p in probes.values():
        for size, n in p.size_hist.items():
            hist[size] += n
    body = hist.most_common(1)[0][0] if hist else 10.0
    pdf_headings = 0
    pdf_paragraph_units = 0
    for p in probes.values():
        prev_size, prev_bottom = None, None
        for b in sorted((b for b in p.blocks if not b.in_table), key=lambda b: (b.bbox[1], b.bbox[0])):
            if norm_key(b.text) in furniture_keys:
                continue
            is_heading = b.size >= 1.15 * body and len(b.text) <= 200
            if is_heading:
                joined = (
                    prev_size is not None and abs(b.size - prev_size) <= 0.75 and prev_bottom is not None
                    and -1.0 <= b.bbox[1] - prev_bottom <= 0.8 * (b.bbox[3] - b.bbox[1])
                )
                if not joined:
                    pdf_headings += 1
                prev_size, prev_bottom = b.size, b.bbox[3]
            else:
                prev_size = prev_bottom = None
                pdf_paragraph_units += max(1, b.items)
    md_headings = sum(len(p.headings) for p in md_pages.values())
    report.checks.append(
        Check("Heading count", str(pdf_headings), str(md_headings), "PASS" if pdf_headings == md_headings else "FAIL",
              f"PDF estimate = font-size outliers (> 1.15 x body {body:g} pt), wrapped lines merged")
    )

    # ---- images ----------------------------------------------------------------------
    pdf_images = sum(p.n_images + p.n_vector_figures for p in probes.values())
    md_image_refs = [(p.number, src) for p in md_pages.values() for src in p.images]
    report.checks.append(
        Check("Image count", str(pdf_images), str(len(md_image_refs)), "PASS" if pdf_images == len(md_image_refs) else "FAIL",
              "raster images >= 6 pt thick + rasterised vector figures")
    )
    unresolved = [src for _, src in md_image_refs if not (md_path.parent / src).is_file()]
    report.checks.append(
        Check("Image references resolve", str(len(md_image_refs)), str(len(md_image_refs) - len(unresolved)),
              "PASS" if not unresolved else "FAIL", f"missing files: {unresolved[:5]}" if unresolved else "all image files exist")
    )

    # ---- tables ---------------------------------------------------------------------
    results: list[TableResult] = []
    for number in sorted(probes):
        probe = probes[number]
        md_page = md_pages.get(number)
        md_tables = md_page.tables if md_page else []
        for idx, (pt, mt) in enumerate(_match_tables(probe.tables, md_tables), 1):
            if pt is None and mt is not None:
                results.append(TableResult(number, idx, None, None, mt.rows, mt.cols, None, "FAIL", "table in Markdown has no counterpart in the PDF", mt.table_id, mt.merged))
            elif pt is not None and mt is None:
                results.append(TableResult(number, idx, pt.rows, pt.cols, None, None, None, "FAIL", "PDF table missing from Markdown"))
            elif pt is not None and mt is not None:
                score = f1(tokenize(" ".join(pt.tokens)), mt.tokens)
                notes = []
                if pt.rows != mt.rows:
                    notes.append(f"rows {pt.rows} != {mt.rows}")
                if pt.cols != mt.cols:
                    notes.append(f"cols {pt.cols} != {mt.cols}")
                if score < table_threshold:
                    notes.append(f"text F1 {score:.4f} < {table_threshold}")
                results.append(TableResult(number, idx, pt.rows, pt.cols, mt.rows, mt.cols, score, "PASS" if not notes else "FAIL", "; ".join(notes), mt.table_id, mt.merged))
    report.tables = results
    pdf_tables = sum(len(p.tables) for p in probes.values())
    md_tables_n = sum(len(p.tables) for p in md_pages.values())
    report.checks.append(Check("Table count", str(pdf_tables), str(md_tables_n), "PASS" if pdf_tables == md_tables_n else "FAIL", "PDF side = ruling-line clusters (independent of converter)"))
    matched = [r for r in results if r.pdf_rows is not None and r.md_rows is not None]
    rows_ok = sum(1 for r in matched if r.pdf_rows == r.md_rows)
    cols_ok = sum(1 for r in matched if r.pdf_cols == r.md_cols)
    report.checks.append(Check("Table row counts", str(sum(r.pdf_rows or 0 for r in matched)), str(sum(r.md_rows or 0 for r in matched)),
                               "PASS" if rows_ok == len(matched) else "FAIL", f"{rows_ok}/{len(matched)} tables match exactly"))
    report.checks.append(Check("Table column counts", str(sum(r.pdf_cols or 0 for r in matched)), str(sum(r.md_cols or 0 for r in matched)),
                               "PASS" if cols_ok == len(matched) else "FAIL", f"{cols_ok}/{len(matched)} tables match exactly"))
    failed = [r for r in results if r.status != "PASS"]
    report.checks.append(Check("Per-table validation", str(len(results)), str(len(results) - len(failed)),
                               "PASS" if not failed else "FAIL", f"{len(failed)} table(s) failed (rows, columns or text)"))

    # ---- paragraphs --------------------------------------------------------------
    md_units = sum(p.paragraph_units for p in md_pages.values()) + sum(p.list_items for p in md_pages.values())
    allowed = max(2, paragraph_tolerance * pdf_paragraph_units)
    report.checks.append(Check("Paragraph count", str(pdf_paragraph_units), str(md_units),
                               "PASS" if abs(pdf_paragraph_units - md_units) <= allowed else "FAIL",
                               f"PDF text blocks (non-table, non-heading) vs paragraphs+hard-line-breaks+list items; tolerance +/-{paragraph_tolerance:.0%}"))

    # ---- text similarity -----------------------------------------------------------
    page_results: list[PageResult] = []
    all_pdf: list[str] = []
    all_md: list[str] = []
    for number in sorted(probes):
        probe = probes[number]
        md_page = md_pages.get(number)
        if md_page is None:
            page_results.append(PageResult(number, 0.0, None, None, len(probe.tokens), 0, "FAIL", "page missing in Markdown"))
            continue
        md_raw = " ".join([md_page.text, md_page.figure_text, _furniture_text(doc.front, md_page)])
        md_tokens = tokenize(md_raw)
        if probe.scanned or md_page.attrs.get("ocr") == "1":
            page_results.append(PageResult(number, None, None, None, len(probe.tokens), len(md_tokens), "INFO", "scanned page: OCR text cannot be verified against a text layer"))
            continue
        pdf_tokens = tokenize(" ".join(probe.tokens))
        s1 = f1(pdf_tokens, md_tokens)
        s2 = char_f1(probe.pdfminer_text, md_raw) if probe.pdfminer_text is not None else None
        order = fuzz.ratio(" ".join(pdf_tokens), " ".join(md_tokens)) / 100.0
        scores = [s for s in (s1, s2) if s is not None]
        ok = min(scores) >= page_threshold
        page_results.append(PageResult(number, s1, s2, order, len(pdf_tokens), len(md_tokens), "PASS" if ok else "FAIL",
                                       "" if ok else f"min F1 {min(scores):.4f} < {page_threshold}"))
        all_pdf += pdf_tokens
        all_md += md_tokens
    report.pages = page_results
    doc_f1 = f1(all_pdf, all_md)
    seq = fuzz.ratio(" ".join(all_pdf), " ".join(all_md)) / 100.0 if len(all_pdf) < 400_000 else float("nan")
    bad_pages = [r.page for r in page_results if r.status == "FAIL"]
    report.checks.append(Check("Text similarity (token F1, PyMuPDF words)", f"{len(all_pdf)} tokens", f"{doc_f1:.5f}",
                               "PASS" if doc_f1 >= 0.995 and not bad_pages else "FAIL",
                               f"{len(bad_pages)} page(s) below {page_threshold}; ordered similarity {seq:.4f} (informational)"))
    miners = [r.f1_pdfminer for r in page_results if r.f1_pdfminer is not None]
    if miners:
        report.checks.append(Check("Text similarity (character F1, pdfminer oracle)", f"{len(miners)} pages", f"mean {statistics.mean(miners):.5f}",
                                   "PASS" if min(miners) >= page_threshold else "FAIL", f"worst page {min(miners):.4f}; independent text engine via pdfplumber, order/spacing-insensitive"))

    report.overall = "PASS" if all(c.status in ("PASS", "INFO", "WARN") for c in report.checks) else "FAIL"
    report.seconds = time.perf_counter() - start
    return report


# --------------------------------------------------------------------------- round trip


def roundtrip_check(original: Path, regenerated: Path, threshold: float = 0.98) -> dict[str, object]:
    """PDF -> MD -> PDF: compare the regenerated PDF with the original."""

    def page_tokens(path: Path) -> list[list[str]]:
        with pymupdf.open(path) as d:
            return [tokenize(" ".join(w[4] for w in p.get_text("words"))) for p in d]

    a, b = page_tokens(original), page_tokens(regenerated)
    flat_a = [t for p in a for t in p]
    flat_b = [t for p in b for t in p]
    result: dict[str, object] = {
        "pages_original": len(a),
        "pages_regenerated": len(b),
        "page_count_match": len(a) == len(b),
        "document_token_f1": f1(flat_a, flat_b),
    }
    if len(a) == len(b):
        per = [f1(x, y) for x, y in zip(a, b)]
        result["page_f1_min"] = min(per) if per else 1.0
        result["page_f1_mean"] = statistics.mean(per) if per else 1.0
        result["pages_below_threshold"] = [i + 1 for i, s in enumerate(per) if s < threshold][:50]
    result["status"] = "PASS" if result["document_token_f1"] >= threshold and result["page_count_match"] else "FAIL"  # type: ignore[operator]
    return result
