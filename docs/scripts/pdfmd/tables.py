"""Table detection and reconstruction.

Why a custom detector?  The source catalogue draws its tables with
zero-thickness filled rectangles (row hairlines) plus shaded banner rows and has
*no* vertical rules.  PyMuPDF/pdfplumber/Camelot either find no table or return
a single garbled grid (see README "Toolchain evaluation").  The geometry is,
however, perfectly regular, so we reconstruct tables directly:

1. Horizontal rules (plus shaded-rect edges) are collected from the vector layer.
2. Their x-coverage profile splits the page into *panels* (side-by-side tables).
3. Rules that span a panel define row boundaries; wrapped text inside one row
   band belongs to the same row - no guessing about line wrapping.
4. Column edges come from long vertical rules if present, otherwise from
   persistent vertical whitespace gutters across all rows of the panel.
5. Shaded full-width rows and words that cross a gutter become spanning
   (colspan) cells, which the Markdown writer emits as HTML <th colspan>.

Page-level PyMuPDF ``find_tables`` is kept as a fallback for ordinary ruled
tables when the rule-based pass finds nothing.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import pymupdf

from .models import Cell, RawPage, Rule, Run, Table, Word
from .textflow import join_words

THICK_RULE = 1.5


@dataclass(frozen=True)
class TableParams:
    gutter_min: float = 5.0
    merge_tol: float = 3.0
    panel_coverage: float = 0.10
    min_split_gap: float = 24.0
    min_rows: int = 2
    min_cols: int = 2
    banner_width_frac: float = 0.6
    outlier_frac: float = 0.02
    min_rule_len: float = 30.0


@dataclass
class _Boundary:
    top: float
    bottom: float

    @property
    def mid(self) -> float:
        return (self.top + self.bottom) / 2


def _panels(rules: list[Rule], width: float, params: TableParams) -> list[tuple[float, float]]:
    size = int(math.ceil(width)) + 3
    diff = [0] * (size + 2)
    for r in rules:
        a = max(0, int(r.start))
        b = min(size, int(math.ceil(r.end)))
        diff[a] += 1
        diff[b + 1] -= 1
    cov, run = [], 0
    for d in diff:
        run += d
        cov.append(run)
    peak = max(cov)
    if peak < 3:
        return []
    threshold = max(3.0, params.panel_coverage * peak)
    spans: list[list[float]] = []
    for x, c in enumerate(cov):
        if c >= threshold:
            if spans and x - spans[-1][1] <= 4:
                spans[-1][1] = x
            else:
                spans.append([x, x])
    return [(a, b + 1) for a, b in spans if b - a >= 40]


def _cluster_boundaries(rules: list[Rule], tol: float) -> list[_Boundary]:
    edges = sorted(((r.pos - r.width / 2, r.pos + r.width / 2) for r in rules))
    out: list[_Boundary] = []
    for top, bottom in edges:
        if out and top - out[-1].bottom <= tol:
            out[-1].bottom = max(out[-1].bottom, bottom)
        else:
            out.append(_Boundary(top, bottom))
    return out


def _split_stacks(
    bounds: list[_Boundary], words: list[Word], px0: float, px1: float, params: TableParams
) -> list[list[_Boundary]]:
    """Split a panel into stacked tables only where a sizeable gap holds no text.

    A tall multi-line row has a large rule-to-rule gap *with* text in it and must
    stay one row, so the gap alone is not enough.
    """
    stacks: list[list[_Boundary]] = []
    for b in bounds:
        if stacks:
            prev = stacks[-1][-1]
            gap = b.top - prev.bottom
            empty = gap > params.min_split_gap and not any(
                prev.bottom < w.cy < b.top and px0 - 2 <= w.cx <= px1 + 2 for w in words
            )
            if not empty:
                stacks[-1].append(b)
                continue
        stacks.append([b])
    return stacks


def _column_edges(
    bands: list[list[Word]],
    banner_rows: set[int],
    x0: float,
    x1: float,
    vrules: list[Rule],
    y_range: tuple[float, float],
    params: TableParams,
) -> tuple[list[float], list[float]]:
    """Interior column edges (absolute x) and the subset defined by vertical rules."""
    res = 2  # samples per point
    n = int((x1 - x0) * res) + 1
    occupancy = [0] * n
    counted_rows = 0
    for i, band in enumerate(bands):
        if i in banner_rows or not band:
            continue
        counted_rows += 1
        mark = bytearray(n)
        for w in band:
            a = max(0, int((w.x0 - x0) * res))
            b = min(n - 1, int((w.x1 - x0) * res))
            for k in range(a, b + 1):
                mark[k] = 1
        for k in range(n):
            occupancy[k] += mark[k]

    tol = int(params.outlier_frac * counted_rows)
    gutters: list[tuple[float, float]] = []
    k = 0
    while k < n:
        if occupancy[k] <= tol:
            j = k
            while j < n and occupancy[j] <= tol:
                j += 1
            width = (j - k) / res
            if k > 0 and j < n and width >= params.gutter_min:  # interior gutters only
                gutters.append((x0 + k / res, x0 + j / res))
            k = j
        else:
            k += 1

    height = y_range[1] - y_range[0]
    rule_edges: list[float] = []
    for v in sorted(vrules, key=lambda v: v.pos):
        overlap = min(v.end, y_range[1]) - max(v.start, y_range[0])
        if x0 + 3 < v.pos < x1 - 3 and height > 0 and overlap >= 0.6 * height:
            if not rule_edges or v.pos - rule_edges[-1] > 3:
                rule_edges.append(v.pos)
    edges = list(rule_edges)
    for a, b in gutters:
        # whitespace beside a real vertical rule is just that column's padding
        if all(not (a - 3 <= e <= b + 3) for e in rule_edges):
            edges.append((a + b) / 2)
    return sorted(edges), rule_edges


def _col_index(x: float, edges: list[float]) -> int:
    idx = 0
    for e in edges:
        if x >= e:
            idx += 1
    return idx


def _edge_present(vrules: list[Rule], pos: float, band: tuple[float, float]) -> bool:
    need = 0.5 * (band[1] - band[0])
    return any(
        abs(v.pos - pos) <= 3 and min(v.end, band[1]) - max(v.start, band[0]) >= need for v in vrules
    )


def _build_cells(
    bands: list[list[Word]],
    band_ranges: list[tuple[float, float]],
    banner_rows: set[int],
    edges: list[float],
    rule_edges: list[float],
    vrules: list[Rule],
    n_cols: int,
) -> list[Cell]:
    cells: list[Cell] = []
    for r, band in enumerate(bands):
        if r in banner_rows:
            cells.append(Cell(r, 0, 1, n_cols, join_words(band), is_banner=True))
            continue
        spans: list[list[object]] = []  # [c_start, c_end, words]
        for w in sorted(band, key=lambda w: w.x0):
            cs = _col_index(w.x0 + 0.5, edges)
            ce = _col_index(w.x1 - 0.5, edges)
            # an edge drawn as a rule but absent in this row means the cell is merged across it
            while ce < n_cols - 1 and edges[ce] in rule_edges and not _edge_present(vrules, edges[ce], band_ranges[r]):
                ce += 1
            while cs > 0 and edges[cs - 1] in rule_edges and not _edge_present(vrules, edges[cs - 1], band_ranges[r]):
                cs -= 1
            if spans and cs <= spans[-1][1]:  # type: ignore[operator]
                spans[-1][1] = max(spans[-1][1], ce)  # type: ignore[type-var]
                spans[-1][2].append(w)  # type: ignore[union-attr]
            else:
                spans.append([cs, ce, [w]])
        covered = 0
        for cs, ce, ws in spans:  # type: ignore[misc]
            for gap in range(covered, cs):
                cells.append(Cell(r, gap))
            cells.append(Cell(r, cs, 1, ce - cs + 1, join_words(ws)))
            covered = ce + 1
        for gap in range(covered, n_cols):
            cells.append(Cell(r, gap))
    return cells


def _row_is_bold(cells: list[Cell]) -> bool:
    runs = [run for c in cells for run in c.runs if run.text.strip()]
    return bool(runs) and all(run.bold for run in runs)


def detect_tables(raw: RawPage, params: TableParams) -> list[Table]:
    """Rule-based table reconstruction for one page."""
    hrules = [r for r in raw.rules if r.orient == "h" and r.length >= params.min_rule_len]
    shade_rules: list[Rule] = []
    for s in raw.shades:
        if s.bbox[2] - s.bbox[0] >= params.min_rule_len:
            shade_rules.append(Rule("h", s.bbox[1], s.bbox[0], s.bbox[2], 0.0))
            shade_rules.append(Rule("h", s.bbox[3], s.bbox[0], s.bbox[2], 0.0))
    if len(hrules) + len(shade_rules) < params.min_rows + 1:
        return []
    vrules = [r for r in raw.rules if r.orient == "v"]

    tables: list[Table] = []
    for px0, px1 in _panels(hrules + shade_rules, raw.width, params):
        pw = px1 - px0
        mine = [r for r in hrules if min(r.end, px1) - max(r.start, px0) >= 0.8 * pw]
        # A shaded band belongs to the table only if it does not stick out of the
        # panel (banner rows do not; a call-out box next to a table does).
        slack = 0.1 * pw
        mine += [r for r in shade_rules if r.start >= px0 - slack and r.end <= px1 + slack and r.length >= 0.8 * pw]
        if len(mine) < params.min_rows + 1:
            continue
        for stack in _split_stacks(_cluster_boundaries(mine, params.merge_tol), raw.words, px0, px1, params):
            table = _build_stack(raw, stack, px0, px1, vrules, params)
            if table is not None:
                tables.append(table)
    _number_tables(tables)
    return tables


def _build_stack(
    raw: RawPage,
    stack: list[_Boundary],
    px0: float,
    px1: float,
    vrules: list[Rule],
    params: TableParams,
) -> Table | None:
    if len(stack) < params.min_rows + 1:
        return None
    y_top, y_bottom = stack[0].mid, stack[-1].mid
    words = [w for w in raw.words if px0 - 2 <= w.cx <= px1 + 2 and y_top <= w.cy <= y_bottom]
    if not words:
        return None

    bands: list[list[Word]] = []
    band_ranges: list[tuple[float, float]] = []
    for i in range(len(stack) - 1):
        lo, hi = stack[i].mid, stack[i + 1].mid
        band = [w for w in words if lo <= w.cy < hi or (i == len(stack) - 2 and w.cy == hi)]
        if band:
            bands.append(band)
            band_ranges.append((lo, hi))
    if len(bands) < params.min_rows:
        return None

    shades = [s for s in raw.shades if s.bbox[2] - s.bbox[0] >= params.banner_width_frac * (px1 - px0)]
    banner_rows: set[int] = set()
    for i, band in enumerate(bands):
        cy = sum(w.cy for w in band) / len(band)
        for s in shades:
            if s.bbox[1] - 1 <= cy <= s.bbox[3] + 1 and s.bbox[0] <= px1 and s.bbox[2] >= px0:
                banner_rows.add(i)
                break

    edges, rule_edges = _column_edges(bands, banner_rows, px0, px1, vrules, (y_top, y_bottom), params)
    n_cols = len(edges) + 1
    if n_cols < params.min_cols:
        return None

    cells = _build_cells(bands, band_ranges, banner_rows, edges, rule_edges, vrules, n_cols)

    header_rows = 0
    first_row = [c for c in cells if c.row == 0]
    if 0 not in banner_rows and all(c.text.strip() for c in first_row if c.colspan == 1) and len(first_row) == n_cols:
        thick_below = any(
            r.orient == "h" and r.width >= THICK_RULE and abs(r.pos - band_ranges[0][1]) <= 4 and r.length >= 0.8 * (px1 - px0)
            for r in raw.rules
        )
        if thick_below or _row_is_bold(first_row):
            header_rows = 1
    for c in cells:
        if c.row < header_rows:
            c.is_header = True

    col_bounds = [px0, *edges, px1]
    return Table(
        page=raw.page_no,
        index=0,
        bbox=(px0, y_top, px1, y_bottom),
        n_rows=len(bands),
        n_cols=n_cols,
        header_rows=header_rows,
        cells=cells,
        col_bounds=col_bounds,
    )


def _number_tables(tables: list[Table]) -> None:
    """Assign index (reading order: column groups left->right, then top->bottom) and panel info."""
    if not tables:
        return
    tables.sort(key=lambda t: (round(t.bbox[0] / 20), t.bbox[1]))
    for i, t in enumerate(tables, 1):
        t.index = i
    for t in tables:
        peers = [
            o
            for o in tables
            if min(o.bbox[3], t.bbox[3]) - max(o.bbox[1], t.bbox[1]) >= 0.5 * min(o.bbox[3] - o.bbox[1], t.bbox[3] - t.bbox[1])
        ]
        peers.sort(key=lambda o: o.bbox[0])
        t.panels = len(peers)
        t.panel = peers.index(t) + 1


def words_in_tables(words: list[Word], tables: list[Table]) -> tuple[list[Word], list[Word]]:
    """Split words into (outside any table, inside a table)."""
    outside: list[Word] = []
    inside: list[Word] = []
    for w in words:
        if any(t.bbox[0] - 2 <= w.cx <= t.bbox[2] + 2 and t.bbox[1] <= w.cy <= t.bbox[3] for t in tables):
            inside.append(w)
        else:
            outside.append(w)
    return outside, inside


# --- fallback: PyMuPDF ruled-table finder ---------------------------------------


def detect_with_pymupdf(page: pymupdf.Page, raw: RawPage) -> list[Table]:
    """Visible-border tables the rule pass missed (e.g. rules drawn as curves)."""
    tables: list[Table] = []
    try:
        found = page.find_tables(strategy="lines_strict").tables
    except Exception:  # noqa: BLE001
        return []
    for t in found:
        data = t.extract()
        if len(data) < 2 or not data or len(data[0]) < 2:
            continue
        n_cols = max(len(r) for r in data)
        cells: list[Cell] = []
        for r, row in enumerate(data):
            c = 0
            while c < n_cols:
                value = row[c] if c < len(row) else ""
                if value is None:
                    c += 1
                    continue
                span = 1
                while c + span < n_cols and c + span < len(row) and row[c + span] is None:
                    span += 1
                text = " ".join(str(value).split())
                cells.append(Cell(r, c, 1, span, [Run(text)] if text else [], is_header=(r == 0)))
                c += span
        non_empty = sum(1 for c in cells if c.text.strip())
        if non_empty < 0.4 * len(cells):
            continue
        tables.append(
            Table(raw.page_no, 0, tuple(t.bbox), len(data), n_cols, 1, cells, [t.bbox[0], t.bbox[2]], detector="pymupdf-lines")  # type: ignore[arg-type]
        )
    _number_tables(tables)
    return tables
