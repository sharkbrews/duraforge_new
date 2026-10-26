"""Markdown generation.

Format decisions (all verified against markdown-it, the parser VS Code uses):

* Page boundaries are single-line HTML comments ``<!-- page=N ... -->`` that
  carry geometry the PDF regenerator needs (size, content box, furniture).
* Tables become GFM pipe tables when they are rectangular, otherwise (merged
  cells, banner rows) one-row-per-line HTML tables with ``colspan``.
* Running headers/footers/page numbers live once in the YAML front matter, not
  in the body, and pages reference them by role.
"""

from __future__ import annotations

import html
import os
import re
from pathlib import Path

import yaml

from . import __version__
from .layout import FurnitureModel
from .models import Cell, Element, PageLayout, Run, Table

PAGE_MARKER_RE = re.compile(r"<!--\s*page=(\d+)\b([^>]*?)-->")
TABLE_MARKER_RE = re.compile(r"<!--\s*table\s+(\S+)\b([^>]*?)-->")
KV_RE = re.compile(r"(\w+)=(\S+)")

# --------------------------------------------------------------------------- inline


def escape_md(text: str) -> str:
    text = text.replace("\\", "\\\\")
    text = re.sub(r"([`*\[\]])", r"\\\1", text)
    text = re.sub(r"<(?=[A-Za-z/!?])", r"\\<", text)
    text = re.sub(r"(?<![A-Za-z0-9])_|_(?![A-Za-z0-9])", r"\\_", text)
    text = re.sub(r"&(?=#?\w+;)", r"\\&", text)
    text = text.replace("~~", "\\~\\~")
    return text


def protect_line_start(text: str) -> str:
    text = text.lstrip()
    if text[:1] in "#>+-=":
        text = "\\" + text
    return re.sub(r"^(\d{1,9})([.)])(\s|$)", r"\1\\\2\3", text)


def _split_ws(text: str) -> tuple[str, str, str]:
    core = text.strip()
    if not core:
        return text, "", ""
    lead = text[: len(text) - len(text.lstrip())]
    trail = text[len(text.rstrip()) :]
    return lead, core, trail


def _link_target(uri: str) -> str:
    return uri.replace(" ", "%20").replace("(", "%28").replace(")", "%29")


def runs_to_md(runs: list[Run], pipes: bool = False, allow_bold: bool = True) -> str:
    out: list[str] = []
    for run in runs:
        lead, core, trail = _split_ws(run.text)
        if not core:
            out.append(lead)
            continue
        if run.uri and run.uri.startswith("footnote:"):
            out.append(f"{lead}[^{run.uri[9:]}]{trail}")
            continue
        if run.mono:
            fence = "``" if "`" in core else "`"
            piece = f"{fence}{core}{fence}"
        else:
            piece = escape_md(core)
        if pipes:
            piece = piece.replace("|", "\\|")
        bold = run.bold and allow_bold
        if bold and run.italic:
            piece = f"***{piece}***"
        elif bold:
            piece = f"**{piece}**"
        elif run.italic:
            piece = f"*{piece}*"
        if run.sup:
            piece = f"<sup>{piece}</sup>"
        if run.uri:
            piece = f"[{piece}]({_link_target(run.uri)})"
        elif run.goto is not None:
            piece = f"[{piece}](#page-{run.goto + 1})"
        out.append(f"{lead}{piece}{trail}")
    return "".join(out)


def runs_to_html(runs: list[Run], allow_bold: bool = True) -> str:
    out: list[str] = []
    for run in runs:
        lead, core, trail = _split_ws(run.text)
        if not core:
            out.append(lead)
            continue
        piece = html.escape(core, quote=False)
        if run.mono:
            piece = f"<code>{piece}</code>"
        if run.bold and allow_bold:
            piece = f"<strong>{piece}</strong>"
        if run.italic:
            piece = f"<em>{piece}</em>"
        if run.sup:
            piece = f"<sup>{piece}</sup>"
        if run.uri and not run.uri.startswith("footnote:"):
            piece = f'<a href="{html.escape(run.uri, quote=True)}">{piece}</a>'
        elif run.goto is not None:
            piece = f'<a href="#page-{run.goto + 1}">{piece}</a>'
        out.append(f"{lead}{piece}{trail}")
    return "".join(out).strip()


# --------------------------------------------------------------------------- tables


def _fmt_bbox(b: tuple[float, ...]) -> str:
    return ",".join(f"{v:.1f}".rstrip("0").rstrip(".") for v in b)


def table_marker(t: Table) -> str:
    return f"<!-- table {t.table_id} panel={t.panel}/{t.panels} bbox={_fmt_bbox(t.bbox)} cols={_fmt_bbox(t.col_bounds)} detector={t.detector} -->"


def _is_rectangular(t: Table) -> bool:
    return all(c.colspan == 1 and c.rowspan == 1 for c in t.cells)


def table_to_html(t: Table) -> str:
    total = t.col_bounds[-1] - t.col_bounds[0]
    widths = [(t.col_bounds[i + 1] - t.col_bounds[i]) / total * 100 for i in range(t.n_cols)] if total > 0 else []
    lines = [table_marker(t), "<table>"]
    if widths and len(widths) == t.n_cols:
        lines.append("<colgroup>" + "".join(f'<col style="width:{w:.1f}%">' for w in widths) + "</colgroup>")

    def row_html(cells: list[Cell]) -> str:
        parts = []
        for c in cells:
            tag = "th" if c.is_header or c.is_banner else "td"
            attrs = ""
            if c.colspan > 1:
                attrs += f' colspan="{c.colspan}"'
            if c.rowspan > 1:
                attrs += f' rowspan="{c.rowspan}"'
            if c.is_banner:
                attrs += ' class="banner"'
            parts.append(f"<{tag}{attrs}>{runs_to_html(c.runs, allow_bold=tag == 'td')}</{tag}>")
        return "<tr>" + "".join(parts) + "</tr>"

    rows = t.rows()
    if t.header_rows:
        lines.append("<thead>")
        lines += [row_html(r) for r in rows[: t.header_rows]]
        lines.append("</thead>")
    lines.append("<tbody>")
    lines += [row_html(r) for r in rows[t.header_rows :]]
    lines += ["</tbody>", "</table>"]
    return "\n".join(lines)


def table_to_pipe(t: Table) -> str:
    grid: list[list[str]] = []
    for row in t.rows():
        cells = [""] * t.n_cols
        for c in row:
            text = runs_to_md(c.runs, pipes=True, allow_bold=not (c.is_header or c.is_banner)).strip()
            if c.is_banner and text:
                text = f"**{text}**"
            cells[c.col] = text
        grid.append(cells)
    if t.header_rows == 0:
        grid.insert(0, [""] * t.n_cols)
    widths = [max(3, max(len(r[i]) for r in grid)) for i in range(t.n_cols)]

    def fmt(r: list[str]) -> str:
        return "| " + " | ".join(r[i].ljust(widths[i]) for i in range(t.n_cols)) + " |"

    lines = [table_marker(t), fmt(grid[0]), "| " + " | ".join("-" * widths[i] for i in range(t.n_cols)) + " |"]
    lines += [fmt(r) for r in grid[1:]]
    return "\n".join(lines)


def render_table(t: Table, table_format: str) -> str:
    if table_format == "pipe" or (table_format == "auto" and _is_rectangular(t)):
        return table_to_pipe(t)
    return table_to_html(t)


# --------------------------------------------------------------------------- blocks


def _comment_safe(text: str) -> str:
    return re.sub(r"-{2,}", "- -", text.replace(">", " "))


def _render_code(lines: list[list[Run]]) -> str:
    body = "\n".join("".join(r.text for r in ln) for ln in lines)
    longest = max((len(m) for m in re.findall(r"`+", body)), default=0)
    fence = "`" * max(3, longest + 1)
    return f"{fence}\n{body}\n{fence}"


def _render_list(items: list[Element]) -> str:
    base = min(it.bbox[0] for it in items)
    out: list[str] = []
    prev_level = 0
    for it in items:
        level = min(prev_level + 1, max(0, round((it.bbox[0] - base) / 12.0)))
        prev_level = level
        text = runs_to_md(it.runs).strip()
        marker = it.marker
        if it.ordered:
            m = re.match(r"^\(?(\d{1,3})[.)]?\)?$", marker)
            if m:
                marker = f"{m.group(1)}."
                text_line = f"{marker} {text}"
            else:
                text_line = f"- {escape_md(marker)} {text}"
        else:
            text_line = f"- {text}"
        out.append("    " * level + text_line)
    return "\n".join(out)


def _render_elements(elements: list[Element], table_format: str, images_rel: str) -> list[str]:
    blocks: list[str] = []
    i = 0
    while i < len(elements):
        el = elements[i]
        if el.kind == "list_item":
            j = i
            while j < len(elements) and elements[j].kind == "list_item":
                j += 1
            blocks.append(_render_list(elements[i:j]))
            i = j
            continue
        if el.kind == "leader":
            lines: list[str] = []
            j = i
            while j < len(elements) and elements[j].kind == "leader":
                lines += [escape_md_line("".join(r.text for r in ln)) for ln in elements[j].lines]
                j += 1
            blocks.append("  \n".join(lines))
            i = j
            continue
        blocks.append(_render_one(el, table_format, images_rel))
        i += 1
    return [b for b in blocks if b.strip()]


def escape_md_line(text: str) -> str:
    return protect_line_start(escape_md(text))


def _render_one(el: Element, table_format: str, images_rel: str) -> str:
    if el.kind == "heading":
        text = runs_to_md(el.runs, allow_bold=False).strip()
        return "#" * max(1, min(6, el.level)) + " " + text
    if el.kind == "paragraph":
        return protect_line_start(runs_to_md(el.runs).strip())
    if el.kind == "code":
        return _render_code(el.lines)
    if el.kind == "footnote":
        return f"[^{el.label}]: {runs_to_md(el.runs).strip()}"
    if el.kind == "table" and el.table is not None:
        return render_table(el.table, table_format)
    if el.kind == "image" and el.image is not None:
        im = el.image
        alt = f"Figure on page {im.page}" if im.kind == "vector" else f"Image on page {im.page}"
        out = f"<!-- image bbox={_fmt_bbox(im.bbox)} kind={im.kind} -->\n![{alt}]({images_rel}/{im.file})"
        if im.words_inside:
            out += f"\n<!-- figure-text: {_comment_safe(' '.join(im.words_inside))} -->"
        return out
    if el.kind == "callout":
        inner = "\n\n".join(_render_elements(el.children, table_format, images_rel))
        return "\n".join(("> " + ln) if ln.strip() else ">" for ln in inner.splitlines())
    return ""


# --------------------------------------------------------------------------- pages / document


def page_marker(p: PageLayout) -> str:
    parts = [f"page={p.page_no}"]
    if p.label:
        parts.append(f"label={p.label.replace(' ', '_')}")
    parts.append(f"size={p.width:.1f}x{p.height:.1f}")
    parts.append(f"box={_fmt_bbox(p.box)}")
    parts.append(f"body={_fmt_bbox(p.body)}")
    if p.furniture:
        parts.append("furniture=" + ",".join(p.furniture))
    if p.ocr_used:
        parts.append("ocr=1")
    return "<!-- " + " ".join(parts) + " -->"


def render_page(p: PageLayout, table_format: str, images_rel: str) -> str:
    body = _render_elements(p.elements, table_format, images_rel)
    return "\n\n".join([page_marker(p), *body]) + "\n"


def front_matter(
    title: str,
    source_name: str,
    n_pages: int,
    furniture: FurnitureModel,
    body_size: float,
    heading_sizes: list[float] | None = None,
) -> str:
    data = {
        "title": title,
        "source": source_name,
        "pages": n_pages,
        "generator": f"pdfmd {__version__}",
        "body_font_size": round(body_size, 2),
        "heading_sizes": [round(s, 1) for s in (heading_sizes or [])],
        "furniture": [
            {"role": e.role, "text": e.text, "bbox": [round(v, 1) for v in e.bbox], "size": round(e.size, 1), "pages": e.pages}
            for e in furniture.entries.values()
        ],
    }
    return "---\n" + yaml.safe_dump(data, sort_keys=False, allow_unicode=True, width=100) + "---\n\n"


def relative_images_dir(md_path: Path, images_dir: Path) -> str:
    return Path(os.path.relpath(images_dir, md_path.parent)).as_posix()


def parse_marker_attrs(attr_text: str) -> dict[str, str]:
    return dict(KV_RE.findall(attr_text))
