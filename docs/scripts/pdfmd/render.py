"""Markdown -> PDF regeneration.

Engine: markdown-it-py (the same CommonMark engine VS Code's preview uses) ->
one HTML ``<section class="page">`` per ``<!-- page=N -->`` marker -> headless
Chrome/Edge ``--print-to-pdf``.  Chromium is used because it ships with Windows
(Edge) / is almost always installed, needs no extra install, and implements CSS
named pages so mixed A4/Letter documents keep their page sizes.

Fidelity aids carried in the Markdown comments:

* ``page=… size=… box=… body=… furniture=… label=…``  page geometry, running
  header/footer placement (text lives once in the YAML front matter).
* ``table … panel=k/n bbox=… cols=…``  side-by-side tables are laid out in a grid
  with their original proportions and average row height.
* ``image bbox=…``  images keep their original width and offset.
"""

from __future__ import annotations

import html
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

import pymupdf
import yaml
from markdown_it import MarkdownIt

from .logging_setup import get_logger
from .markdown_writer import KV_RE, PAGE_MARKER_RE

log = get_logger("render")

_FRONT = re.compile(r"\A---\n(.*?)\n---\n", re.S)
_BROWSER_CANDIDATES = (
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
)


class RenderError(RuntimeError):
    pass


def find_browser(explicit: Path | None = None) -> Path:
    candidates: list[str | None] = [str(explicit) if explicit else None, os.environ.get("CHROME_PATH")]
    candidates += [shutil.which(n) for n in ("chrome", "msedge", "chromium", "google-chrome")]
    candidates += list(_BROWSER_CANDIDATES)
    for c in candidates:
        if c and Path(c).is_file():
            return Path(c)
    raise RenderError("No Chrome/Edge found. Install one or pass --browser / set CHROME_PATH.")


# --------------------------------------------------------------------------- HTML


_CSS = """
@page { margin: 0 }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact }
body { margin: 0; font-family: Arial, 'Liberation Sans', sans-serif; font-size: %(body)spt; color: #000; line-height: 1.25 }
.page { position: relative; box-sizing: border-box; overflow-wrap: anywhere }
.content { position: relative }
h1, h2, h3, h4, h5, h6 { color: #365f91; margin: 0 0 6pt; line-height: 1.15 }
h1, h2 { text-align: center; font-weight: 400 }
h2 { font-weight: 700 }
p { margin: 0 0 4pt } ul, ol { margin: 0 0 4pt; padding-left: 16pt }
pre { font: 8pt Consolas, 'Courier New', monospace; background: #f4f4f4; padding: 4pt; white-space: pre-wrap }
blockquote { margin: 0 0 4pt; padding: 3pt 6pt; background: #eef2f7; border-left: 3pt solid #8aa; }
figure.img { margin: 0 0 4pt } figure.img img { width: 100%%; display: block }
img { max-width: 100%% }
.panels { display: grid; align-items: start; column-gap: 8pt }
table { border-collapse: collapse; width: 100%%; table-layout: fixed; font-size: %(table)spt; line-height: 1.15 }
th, td { padding: 2.1pt 2pt; border-bottom: .4pt solid #c8c8c8; text-align: left; vertical-align: top; overflow-wrap: anywhere }
tbody td, tbody th { }
thead th { font-weight: 400; border-top: 1.5pt solid #000; border-bottom: 1.5pt solid #000 }
th.banner { background: #d9d9d9; text-align: center; font-weight: 700 }
.furn { position: absolute; white-space: nowrap; line-height: 1.1 }
.toc { display: flex; align-items: baseline; gap: 3pt; padding: 5.5pt 0; font-family: Cambria, 'Times New Roman', serif; font-size: 8pt }
.toc .lead { flex: 1; border-bottom: 1px dotted #000 }
.footnotes { font-size: 8pt; border-top: .5pt solid #888; margin-top: 8pt }
"""


def _fmt_pt(v: float) -> str:
    return f"{v:.2f}".rstrip("0").rstrip(".")


def _heading_css(front: dict[str, object]) -> str:
    sizes = [float(s) for s in (front.get("heading_sizes") or [])]  # type: ignore[union-attr]
    defaults = [28.0, 14.0, 11.0, 10.0, 9.0, 9.0]
    return "".join(f"h{i + 1} {{ font-size: {_fmt_pt(sizes[i] if i < len(sizes) else defaults[i])}pt }}\n" for i in range(6))


def _split_pages(text: str) -> tuple[dict[str, object], list[tuple[dict[str, str], str]]]:
    front: dict[str, object] = {}
    m = _FRONT.match(text)
    if m:
        front = yaml.safe_load(m.group(1)) or {}
        text = text[m.end() :]
    markers = list(PAGE_MARKER_RE.finditer(text))
    pages = []
    for i, mk in enumerate(markers):
        end = markers[i + 1].start() if i + 1 < len(markers) else len(text)
        pages.append(({"page": mk.group(1), **dict(KV_RE.findall(mk.group(2)))}, text[mk.end() : end]))
    return front, pages


_TABLE_RE = re.compile(r"(<!--\s*table\s+\S+[^>]*?-->)\s*(<table>.*?</table>)", re.S)
_IMAGE_RE = re.compile(r"<!--\s*image\s+([^>]*?)-->\s*<p>(<img[^>]*>)</p>")
_PANEL_GAP = 8.0


def _decorate_tables(page_html: str) -> str:
    """Wrap side-by-side tables (panel k/n) in a grid with their original proportions."""
    items: list[tuple[int, int, str, int, int, list[float]]] = []  # start, end, html, panel, panels, bbox
    for m in _TABLE_RE.finditer(page_html):
        attrs = dict(KV_RE.findall(m.group(1)))
        panel, _, panels = attrs.get("panel", "1/1").partition("/")
        bbox = [float(v) for v in attrs.get("bbox", "0,0,0,0").split(",")]
        items.append((m.start(), m.end(), m.group(2), int(panel), int(panels or 1), bbox))

    out: list[str] = []
    cursor = 0
    i = 0
    while i < len(items):
        start, end, table, panel, panels, bbox = items[i]
        out.append(page_html[cursor:start])
        group = [items[i]]
        j = i + 1
        while panels > 1 and j < len(items) and len(group) < panels and page_html[items[j - 1][1] : items[j][0]].strip() == "":
            group.append(items[j])
            j += 1
        if len(group) > 1:
            widths = " ".join(f"{max(1.0, g[5][2] - g[5][0]):.1f}fr" for g in group)
            out.append(f'<div class="panels" style="grid-template-columns:{widths}">' + "".join(g[2] for g in group) + "</div>")
        else:
            out.append(table)
        cursor = group[-1][1]
        i = j
    out.append(page_html[cursor:])
    return "".join(out)


_LEADER_MARK = " ...... "
_P_RE = re.compile(r"<p>(.*?)</p>", re.S)
_BR_RE = re.compile(r"<br\s*/?>\s*")


def _decorate_leaders(page_html: str) -> str:
    """Turn ``Title ...... 12`` lines back into dot-leader rows with right-aligned numbers."""

    def repl(m: re.Match[str]) -> str:
        inner = m.group(1)
        if _LEADER_MARK not in inner:
            return m.group(0)
        rows = []
        for line in _BR_RE.split(inner):
            title, sep, page = line.rpartition(_LEADER_MARK)
            if sep:
                rows.append(f'<div class="toc"><span>{title}</span><span class="lead"></span><span>{page.strip()}</span></div>')
            else:
                rows.append(f"<div>{line}</div>")
        return "".join(rows)

    return _P_RE.sub(repl, page_html)


def _decorate_images(page_html: str, body: list[float]) -> str:
    width = max(1.0, body[2] - body[0])

    def repl(m: re.Match[str]) -> str:
        attrs = dict(KV_RE.findall(m.group(1)))
        box = [float(v) for v in attrs.get("bbox", "0,0,0,0").split(",")]
        w_pct = min(100.0, 100.0 * (box[2] - box[0]) / width)
        left = max(0.0, 100.0 * (box[0] - body[0]) / width)
        return f'<figure class="img" style="width:{w_pct:.1f}%;margin-left:{left:.1f}%">{m.group(2)}</figure>'

    return _IMAGE_RE.sub(repl, page_html)


def _furniture_html(front: dict[str, object], attrs: dict[str, str], width: float) -> str:
    roles = set((attrs.get("furniture") or "").split(","))
    out: list[str] = []
    for entry in front.get("furniture", []) or []:  # type: ignore[union-attr]
        role = entry["role"]
        if role not in roles:
            continue
        x0, y0, x1, _y1 = entry["bbox"]
        size = entry.get("size", 9)
        if role == "pagenum":
            text = attrs.get("label", "").replace("_", " ")
            style = f"right:{_fmt_pt(width - x1)}pt;top:{_fmt_pt(y0)}pt;font-size:{size}pt"
        else:
            text = str(entry["text"])
            style = f"left:{_fmt_pt(x0)}pt;width:{_fmt_pt(x1 - x0)}pt;top:{_fmt_pt(y0)}pt;font-size:{size}pt;text-align:center"
        out.append(f'<div class="furn" style="{style}">{html.escape(text)}</div>')
    return "".join(out)


def build_html(md_text: str, base_dir: Path, page_range: tuple[int, int] | None = None) -> tuple[str, int]:
    front, pages = _split_pages(md_text)
    md = MarkdownIt("commonmark", {"html": True}).enable("table")
    try:
        from mdit_py_plugins.footnote import footnote_plugin

        md.use(footnote_plugin)
    except ImportError:
        pass

    sizes: dict[str, str] = {}
    sections: list[str] = []
    for attrs, segment in pages:
        number = int(attrs["page"])
        if page_range and not page_range[0] <= number <= page_range[1]:
            continue
        w, _, h = attrs.get("size", "595.3x841.9").partition("x")
        width, height = float(w), float(h)
        cls = "s" + re.sub(r"\W", "_", f"{width:.0f}x{height:.0f}")
        sizes[cls] = f"{width:.1f}pt {height:.1f}pt"
        body = [float(v) for v in attrs["body"].split(",")] if "body" in attrs else [0, 0, width, height]
        rendered = md.render(segment)
        rendered = _decorate_leaders(_decorate_images(_decorate_tables(rendered), body))
        left, top = max(0.0, body[0]), max(0.0, body[1])
        content_w = max(10.0, body[2] - body[0]) if body[2] > body[0] else width
        sections.append(
            f'<section class="page {cls}" id="page-{number}" style="width:{width:.1f}pt;min-height:{height - 2:.1f}pt">'
            f'{_furniture_html(front, attrs, width)}'
            f'<div class="content" style="margin-left:{_fmt_pt(left)}pt;padding-top:{_fmt_pt(top)}pt;width:{_fmt_pt(content_w)}pt">{rendered}</div></section>'
        )
    if not sections:
        raise RenderError("No page markers in the selected range")

    body_size = float(front.get("body_font_size", 9) or 9)
    css = _CSS % {"body": _fmt_pt(body_size), "table": _fmt_pt(max(6.5, body_size - 0.5))} + _heading_css(front)
    css += "".join(f"@page {c} {{ size: {s}; margin: 0 }} .page.{c} {{ page: {c} }}\n" for c, s in sizes.items())
    css += ".page { break-after: page }\n.page:last-child { break-after: auto }\n"
    doc = (
        f"<!doctype html><html><head><meta charset='utf-8'><title>{html.escape(str(front.get('title', 'Document')))}</title>"
        f"<base href='{base_dir.resolve().as_uri()}/'><style>{css}</style></head><body>{''.join(sections)}</body></html>"
    )
    return doc, len(sections)


# --------------------------------------------------------------------------- PDF


def render_pdf(
    md_path: Path,
    out_pdf: Path,
    browser: Path | None = None,
    page_range: tuple[int, int] | None = None,
    keep_html: Path | None = None,
    timeout: int = 900,
) -> Path:
    exe = find_browser(browser)
    text = md_path.read_text(encoding="utf-8")
    doc, n_sections = build_html(text, md_path.parent, page_range)
    out_pdf.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="pdfmd-") as tmp:
        html_path = Path(tmp) / "render.html"
        html_path.write_text(doc, encoding="utf-8")
        if keep_html:
            keep_html.write_text(doc, encoding="utf-8")
        profile = Path(tmp) / "profile"
        cmd = [
            str(exe), "--headless=new", "--disable-gpu", "--no-first-run", "--disable-extensions",
            "--allow-file-access-from-files", f"--user-data-dir={profile}", "--no-pdf-header-footer",
            f"--print-to-pdf={out_pdf.resolve()}", html_path.as_uri(),
        ]
        log.info("rendering", browser=exe.name, sections=n_sections, html_mb=round(len(doc) / 1e6, 1))
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, check=False)
        except subprocess.TimeoutExpired as exc:
            raise RenderError(f"browser timed out after {timeout}s") from exc
    if not out_pdf.is_file() or out_pdf.stat().st_size == 0:
        raise RenderError(f"browser produced no PDF (exit {proc.returncode}): {proc.stderr[-500:]}")
    with pymupdf.open(out_pdf) as d:
        log.info("PDF written", path=str(out_pdf), pages=d.page_count, source_sections=n_sections)
    return out_pdf
