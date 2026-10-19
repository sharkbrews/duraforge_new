"""Build a Duraforge-branded HTML catalogue and PDF from royal-catalogue-combined.md.

Runs locally with no AI. Requires the `markdown` package (pip install markdown)
and Microsoft Edge for the PDF (headless print).
"""

import html
import re
import subprocess
import sys
from pathlib import Path

import markdown

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "catalogue" / "royal-catalogue-combined.md"
OUT_DIR = ROOT / "docs" / "catalogue" / "site"
HTML_OUT = OUT_DIR / "duraforge-catalogue.html"
PDF_OUT = OUT_DIR / "duraforge-catalogue.pdf"
EDGE_PATHS = [
    Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
    Path(r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"),
]

PAGE_RE = re.compile(r"^## Page (\d+)\s*$", re.M)

CSS = """
:root { --navy: #1b2a41; --orange: #e07a1f; --grey: #5b6573; --line: #d9dee6; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Segoe UI, Arial, sans-serif; color: #1d2530; font-size: 11px; }
header.site { background: var(--navy); color: #fff; padding: 12px 24px; display: flex;
  align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
header.site .brand { font-weight: 700; font-size: 18px; letter-spacing: .5px; }
header.site .brand span { color: var(--orange); }
header.site input { padding: 6px 10px; border: 0; border-radius: 4px; width: 320px; font-size: 13px; }
main { display: flex; }
nav.pages { width: 150px; min-width: 150px; height: calc(100vh - 56px); overflow-y: auto;
  position: sticky; top: 56px; padding: 10px; border-right: 1px solid var(--line); background: #f5f7fa; }
nav.pages a { display: block; color: var(--navy); text-decoration: none; padding: 2px 4px; font-size: 11px; }
nav.pages a:hover { background: #fde7d2; }
article { flex: 1; padding: 16px 28px; max-width: 1100px; }
.cover { padding: 60px 40px; border-bottom: 4px solid var(--orange); margin-bottom: 24px; }
.cover h1 { color: var(--navy); font-size: 30px; margin: 0 0 8px; }
.cover .sub { color: var(--grey); font-size: 14px; }
.cover .notice { margin-top: 24px; padding: 12px; background: #fff4e5; border-left: 4px solid var(--orange); font-size: 12px; }
section.page { padding-top: 14px; margin-bottom: 18px; border-bottom: 1px solid var(--line); }
section.page > h2 { color: var(--navy); font-size: 13px; margin: 0 0 8px; border-left: 4px solid var(--orange); padding-left: 8px; }
table { border-collapse: collapse; width: 100%; margin: 6px 0 12px; }
th { background: var(--navy); color: #fff; padding: 4px 6px; text-align: left; font-weight: 600; }
td { border-bottom: 1px solid var(--line); padding: 3px 6px; vertical-align: top; }
tr:nth-child(even) td { background: #f7f9fb; }
p { margin: 4px 0; line-height: 1.4; }
.hidden { display: none !important; }
@page { size: A4; margin: 14mm 12mm; }
@media print {
  header.site, nav.pages { display: none; }
  main { display: block; }
  article { max-width: none; padding: 0; }
  section.page { page-break-before: always; border: 0; }
  .cover { page-break-after: always; }
  tr { page-break-inside: avoid; }
  thead { display: table-header-group; }
}
"""

SCRIPT = """
const q = document.getElementById('search');
q.addEventListener('input', () => {
  const term = q.value.trim().toLowerCase();
  document.querySelectorAll('section.page').forEach(sec => {
    const hit = !term || sec.textContent.toLowerCase().includes(term);
    sec.classList.toggle('hidden', !hit);
  });
  document.querySelectorAll('tbody tr').forEach(tr => {
    const hit = !term || tr.textContent.toLowerCase().includes(term);
    tr.classList.toggle('hidden', !hit);
  });
});
"""


def split_pages(text):
    """Return (preamble, [(page_no, body), ...]) from the combined Markdown."""
    parts = PAGE_RE.split(text)
    preamble = parts[0]
    pages = [(int(parts[i]), parts[i + 1]) for i in range(1, len(parts), 2)]
    return preamble, pages


def render_page(page_no, body):
    inner = markdown.markdown(body.strip(), extensions=["tables"])
    return f'<section class="page" id="page-{page_no}"><h2>Page {page_no}</h2>\n{inner}\n</section>'


def build_html(text):
    _, pages = split_pages(text)
    nav = "\n".join(f'<a href="#page-{n}">Page {n}</a>' for n, _ in pages)
    body = "\n".join(render_page(n, b) for n, b in pages)
    cover = (
        '<div class="cover">'
        '<h1>DURAFORGE UK LTD</h1>'
        '<div class="sub">Hydraulic seal kit catalogue &mdash; DRAFT for internal review</div>'
        '<div class="sub">Swanscombe, Kent DA10 1BZ</div>'
        '<div class="notice">Draft built from the combined source extract. The body text and part '
        'references still carry the source supplier&rsquo;s wording and must be reviewed and '
        'rebranded before any external use.</div>'
        '</div>'
    )
    return f"""<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<title>Duraforge UK Ltd - Hydraulic Seal Catalogue (Draft)</title>
<style>{CSS}</style>
</head>
<body>
<header class="site">
  <div class="brand">DURA<span>FORGE</span> UK LTD</div>
  <input id="search" type="search" placeholder="Search order code, size, material...">
</header>
<main>
<nav class="pages">{nav}</nav>
<article>
{cover}
{body}
</article>
</main>
<script>{SCRIPT}</script>
</body>
</html>
"""


def find_edge():
    for p in EDGE_PATHS:
        if p.exists():
            return p
    return None


def build_pdf(html_path, pdf_path):
    edge = find_edge()
    if edge is None:
        print("PDF skipped: Microsoft Edge not found.")
        return False
    if pdf_path.exists():
        pdf_path.unlink()
    cmd = [
        str(edge),
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_path}",
        html_path.resolve().as_uri(),
    ]
    subprocess.run(cmd, capture_output=True, timeout=600, check=False)
    ok = pdf_path.exists() and pdf_path.stat().st_size > 0
    print(f"PDF {'written' if ok else 'FAILED'}: {pdf_path}")
    return ok


def main():
    if not SRC.exists():
        print(f"Missing source: {SRC}. Run scripts/build_catalogue_md.py first.")
        return 1
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    text = SRC.read_text(encoding="utf-8")
    HTML_OUT.write_text(build_html(text), encoding="utf-8")
    print(f"HTML written: {HTML_OUT}")
    _, pages = split_pages(text)
    print(f"Pages rendered: {len(pages)}")
    ok = build_pdf(HTML_OUT, PDF_OUT)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
