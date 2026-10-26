"""Self-contained HTML validation report (no external assets, works offline)."""

from __future__ import annotations

import html
import json
from datetime import datetime
from pathlib import Path

from .validation import ValidationReport

_CSS = """
:root{--ok:#1a7f37;--bad:#cf222e;--warn:#9a6700;--info:#57606a;--bg:#f6f8fa;--bd:#d0d7de}
*{box-sizing:border-box}body{font:14px/1.45 -apple-system,Segoe UI,Arial,sans-serif;margin:0;color:#1f2328;background:#fff}
header{background:#0d1117;color:#fff;padding:20px 32px}header h1{margin:0 0 6px;font-size:22px}
header small{color:#9da7b3}main{padding:24px 32px;max-width:1280px;margin:auto}
h2{margin:32px 0 10px;font-size:18px;border-bottom:1px solid var(--bd);padding-bottom:6px}
.cards{display:flex;gap:12px;flex-wrap:wrap}.card{background:var(--bg);border:1px solid var(--bd);border-radius:8px;padding:12px 16px;min-width:150px}
.card b{display:block;font-size:22px}.badge{display:inline-block;border-radius:12px;padding:1px 10px;font-weight:600;font-size:12px;color:#fff}
.PASS{background:var(--ok)}.FAIL{background:var(--bad)}.WARN{background:var(--warn)}.INFO{background:var(--info)}
table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid var(--bd);padding:5px 9px;text-align:left;vertical-align:top}
th{background:var(--bg);position:sticky;top:0}tr.FAILROW td{background:#fff1f0}td.num{text-align:right;font-variant-numeric:tabular-nums}
.scroll{max-height:560px;overflow:auto;border:1px solid var(--bd)}.toolbar{margin:8px 0;display:flex;gap:10px;align-items:center}
input[type=search]{padding:5px 8px;border:1px solid var(--bd);border-radius:6px;min-width:240px}code{background:var(--bg);padding:1px 4px;border-radius:4px}
.muted{color:var(--info)}.bar{height:8px;background:#eaeef2;border-radius:4px;overflow:hidden;min-width:80px}.bar i{display:block;height:100%;background:var(--ok)}
"""

_JS = """
function filt(id){const q=document.getElementById(id+'-q').value.toLowerCase();
const only=document.getElementById(id+'-f').checked;
document.querySelectorAll('#'+id+' tbody tr').forEach(r=>{
 const t=r.textContent.toLowerCase();const bad=r.classList.contains('FAILROW');
 r.style.display=((!q||t.includes(q))&&(!only||bad))?'':'none';});}
"""


def _badge(status: str) -> str:
    return f'<span class="badge {html.escape(status)}">{html.escape(status)}</span>'


def _fmt(v: object) -> str:
    if v is None:
        return "&ndash;"
    if isinstance(v, float):
        return f"{v:.4f}"
    return html.escape(str(v))


def build_html(report: ValidationReport) -> str:
    esc = html.escape
    n_tables = len(report.tables)
    t_fail = sum(1 for t in report.tables if t.status != "PASS")
    p_fail = sum(1 for p in report.pages if p.status == "FAIL")
    scored = [p.f1_pymupdf for p in report.pages if p.f1_pymupdf is not None]
    mean_f1 = sum(scored) / len(scored) if scored else 0.0

    out: list[str] = [
        "<!doctype html><html lang='en'><head><meta charset='utf-8'><title>PDF to Markdown validation report</title>",
        f"<style>{_CSS}</style></head><body>",
        f"<header><h1>PDF &rarr; Markdown validation report {_badge(report.overall)}</h1>",
        f"<small>{esc(Path(report.pdf).name)} &rarr; {esc(Path(report.markdown).name)} &middot; "
        f"generated {datetime.now():%Y-%m-%d %H:%M} &middot; validated in {report.seconds:.1f}s</small></header><main>",
        "<div class='cards'>",
        f"<div class='card'><span class='muted'>Pages checked</span><b>{len(report.pages)}</b></div>",
        f"<div class='card'><span class='muted'>Tables checked</span><b>{n_tables}</b></div>",
        f"<div class='card'><span class='muted'>Tables failing</span><b>{t_fail}</b></div>",
        f"<div class='card'><span class='muted'>Pages failing text check</span><b>{p_fail}</b></div>",
        f"<div class='card'><span class='muted'>Mean page token F1</span><b>{mean_f1:.4f}</b></div>",
        "</div>",
        "<h2>Summary checks</h2><table><thead><tr><th>Check</th><th>PDF</th><th>Markdown</th><th>Result</th><th>Detail</th></tr></thead><tbody>",
    ]
    for c in report.checks:
        out.append(
            f"<tr class='{'FAILROW' if c.status == 'FAIL' else ''}'><td>{esc(c.name)}</td><td class='num'>{esc(c.pdf_value)}</td>"
            f"<td class='num'>{esc(c.md_value)}</td><td>{_badge(c.status)}</td><td>{esc(c.detail)}</td></tr>"
        )
    out.append("</tbody></table>")

    if report.roundtrip:
        rt = report.roundtrip
        out.append("<h2>Round trip: original PDF vs regenerated PDF</h2><table><tbody>")
        for key, value in rt.items():
            shown = _badge(str(value)) if key == "status" else _fmt(value)
            out.append(f"<tr><th>{esc(key)}</th><td>{shown}</td></tr>")
        out.append("</tbody></table>")

    out.append("<h2>Table validation</h2>")
    out.append(
        "<div class='toolbar'><input type='search' id='tables-q' placeholder='Filter (page, id, note)...' oninput=\"filt('tables')\">"
        "<label><input type='checkbox' id='tables-f' onchange=\"filt('tables')\"> failures only</label></div>"
    )
    out.append(
        "<div class='scroll'><table id='tables'><thead><tr><th>PDF page</th><th>Table #</th><th>Markdown id</th>"
        "<th>PDF rows</th><th>PDF cols</th><th>MD rows</th><th>MD cols</th><th>Merged cells</th><th>Text F1</th><th>Result</th><th>Notes</th></tr></thead><tbody>"
    )
    for t in report.tables:
        out.append(
            f"<tr class='{'FAILROW' if t.status != 'PASS' else ''}'><td class='num'>{t.page}</td><td class='num'>{t.index}</td>"
            f"<td>{esc(t.md_id or '')}</td><td class='num'>{_fmt(t.pdf_rows)}</td><td class='num'>{_fmt(t.pdf_cols)}</td>"
            f"<td class='num'>{_fmt(t.md_rows)}</td><td class='num'>{_fmt(t.md_cols)}</td><td class='num'>{t.merged}</td>"
            f"<td class='num'>{_fmt(t.text_f1)}</td><td>{_badge(t.status)}</td><td>{esc(t.notes)}</td></tr>"
        )
    out.append("</tbody></table></div>")

    out.append("<h2>Per-page text similarity</h2>")
    out.append(
        "<div class='toolbar'><input type='search' id='pages-q' placeholder='Filter pages...' oninput=\"filt('pages')\">"
        "<label><input type='checkbox' id='pages-f' onchange=\"filt('pages')\"> failures only</label></div>"
    )
    out.append(
        "<div class='scroll'><table id='pages'><thead><tr><th>Page</th><th>F1 (PyMuPDF)</th><th>F1 (pdfminer)</th>"
        "<th>Ordered sim.</th><th>PDF tokens</th><th>MD tokens</th><th>Result</th><th>Notes</th></tr></thead><tbody>"
    )
    for p in report.pages:
        bar = f"<div class='bar'><i style='width:{(p.f1_pymupdf or 0) * 100:.0f}%'></i></div>" if p.f1_pymupdf is not None else ""
        out.append(
            f"<tr class='{'FAILROW' if p.status == 'FAIL' else ''}'><td class='num'>{p.page}</td><td class='num'>{_fmt(p.f1_pymupdf)}{bar}</td>"
            f"<td class='num'>{_fmt(p.f1_pdfminer)}</td><td class='num'>{_fmt(p.order_score)}</td><td class='num'>{p.pdf_tokens}</td>"
            f"<td class='num'>{p.md_tokens}</td><td>{_badge(p.status)}</td><td>{esc(p.notes)}</td></tr>"
        )
    out.append("</tbody></table></div>")

    if report.notes:
        out.append("<h2>Notes</h2><ul>" + "".join(f"<li>{esc(n)}</li>" for n in report.notes) + "</ul>")
    out.append(
        "<h2>How to read this report</h2><p class='muted'>PDF-side numbers come from an independent probe "
        "(ruling-line clustering and line-start anchors for tables; PyMuPDF words and pdfminer for text). "
        "Markdown-side numbers are measured on the rendered HTML, the same view VS Code and the PDF regenerator get. "
        "Token F1 ignores ordering; ordered similarity is informational because two-column pages are read column-by-column.</p>"
    )
    out.append(f"<script>{_JS}</script>")
    out.append("</main></body></html>")
    return "\n".join(out)


def write_reports(report: ValidationReport, html_path: Path) -> tuple[Path, Path]:
    html_path.parent.mkdir(parents=True, exist_ok=True)
    html_path.write_text(build_html(report), encoding="utf-8")
    json_path = html_path.with_suffix(".json")
    json_path.write_text(json.dumps(report.to_dict(), indent=1, default=str), encoding="utf-8")
    return html_path, json_path
