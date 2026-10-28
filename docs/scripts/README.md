# pdfmd - local PDF → Markdown → PDF toolkit

Fully local (no AI APIs, no cloud OCR, no network at run time) conversion of technical PDFs to
human-readable Markdown that can be turned back into a PDF with the content, tables and
structure intact. Built for, and verified on, `EMD_EXCON2025.pdf` (333 pages, 651 tables).

```
docs/
├── source/EMD_EXCON2025.pdf          input
├── output/
│   ├── EMD_EXCON2025.md              Markdown (YAML front matter + one <!-- page=N --> section per page)
│   ├── EMD_EXCON2025.manifest.json   what the converter detected (tables, images, timings)
│   ├── EMD_EXCON2025.regenerated.pdf Markdown → PDF
│   ├── images/                       extracted raster images and rasterised vector figures
│   ├── validation-report.html        human report   (+ validation-report.json)
├── logs/                             structured JSONL logs, OCR cache
└── scripts/                          this toolkit (+ tests/)
```

## 1. Architecture

```
PDF ─► extract (parallel, per page) ─► analyse (whole document) ─► Markdown ─► HTML ─► PDF
        words+style, rules, shades,      running header/footer,      GFM pipe tables or    markdown-it   headless
        images, links; OCR if scanned    headings, lists, footnotes, HTML tables w/        + per-page    Chrome/Edge
        → table detector → text blocks   call-outs, reading order    colspan               sections
                                                  │
                  validate ◄── independent PDF probe (rule clusters, line anchors, PyMuPDF + pdfminer text)
```

| Module | Role |
|---|---|
| `pdfmd/extract.py` | PyMuPDF primitives: words with style (size/bold/italic/mono/superscript), links, **ruling lines** (strokes, zero-thickness rects, rect outlines), shaded fills, images (alpha/CMYK safe), vector figures |
| `pdfmd/tables.py` | **Table detector**: rule coverage → side-by-side panels → row bands → columns (vertical rules, else whitespace gutters) → colspan cells; PyMuPDF `find_tables` fallback |
| `pdfmd/ocr.py` | OCR for scanned pages: Tesseract (if installed) or RapidOCR (pip only); OpenCV recovers ruling lines so scanned tables use the same detector |
| `pdfmd/layout.py` | Running header/footer/page-number removal, XY-cut reading order, headings, lists, code, footnotes, call-outs, TOC leader lines |
| `pdfmd/markdown_writer.py` | Markdown/HTML emission, escaping, front matter, page/table/image markers |
| `pdfmd/converter.py` | Orchestration (process pool, per-page error isolation, atomic writes, manifest) |
| `pdfmd/pdf_probe.py`, `validation.py`, `report.py` | Independent validation and the HTML report |
| `pdfmd/render.py` | Markdown → HTML → PDF |

Design points that matter for fidelity:

* **Tables are rebuilt from geometry, not guessed from text.** Row boundaries come from the PDF's
  own rules, so wrapped cells (`AB06C-BOOM-050-` / `090`) stay in one row and are re-joined.
* **Merged cells** (banner rows, header spans) become `<th colspan>`; rectangular tables become
  aligned GFM pipe tables (`--table-format auto|html|pipe`).
* **Round-trip metadata lives in HTML comments**, invisible in VS Code's preview:
  `<!-- page=8 label=1 size=595.4x842.0 box=… body=… furniture=header,pagenum,footer -->`,
  `<!-- table p008.t1 panel=1/2 bbox=… cols=… -->`, `<!-- image bbox=… -->`.
  Running headers/footers are stored once in the front matter and re-placed per page when rendering.
* **Failure isolation**: a page that fails is logged and falls back to plain text; the run continues.

## 2. Toolchain evaluation (measured on this PDF, page 8)

| Candidate | Result here | Decision |
|---|---|---|
| **PyMuPDF** | Fast (≈25 ms/page), exact word geometry, fonts, links, drawings, images, TOC, rendering. Its `find_tables()` merged both side-by-side tables into one garbled 5-column grid (`ABEL AB06C\n-`). | **Core engine** (used for everything except table finding) |
| pdfplumber | `find_tables()` → 0 tables; text strategy → wrong shape. Its pdfminer text interleaves side-by-side columns line by line. | **Validation oracle** (character-level, order-insensitive) |
| Camelot | lattice → 0 tables; stream → one mangled 86×3 table (panels merged, header lost). Needs visible rules or whitespace; this PDF's rules are zero-thickness rectangles. | Rejected |
| tabula-py | Needs Java (not installed); same stream/lattice limits as Camelot. | Rejected |
| marker-pdf 2.0 | Installed in an isolated venv (1.2 GB: torch, transformers). Its current inference backend needs a vLLM Docker container or a `llama-server` binary + multi-GB GGUF weights; no GPU here, so CPU for 333 table pages would take hours. A vision-language model also *re-types* cell text, a hazard for part numbers when the PDF already has an exact text layer. Output quality was **not** measured: it would not run as installed. | Rejected for this PDF; sensible for scans with no text layer |
| pdf2image | Needs Poppler (not installed); PyMuPDF renders pages itself. | Not needed |
| pytesseract | Needs the Tesseract binary (not installed). | Optional OCR backend (auto-used if present) |
| **RapidOCR** (ONNX) | pip-only, local, no binaries. | **Default OCR** |
| **markdown-it-py** | CommonMark engine VS Code uses; parses what you see. | **Parser/renderer** for validation and PDF regeneration |
| Pandoc | Not installed; PDF output needs a LaTeX engine; loses HTML table styling. | Not used |
| **Headless Chrome/Edge** | Already on Windows; CSS named pages keep mixed A4/Letter sizes. | **Markdown → PDF engine** |

## 3. Installation (Windows, PowerShell)

```powershell
cd C:\DevOps\repo\duraforge_new
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r docs\scripts\requirements.txt
python docs\scripts\setup_folders.py            # creates the folders, copies the PDF into docs\source
```

Requires Chrome or Edge for PDF regeneration (set `CHROME_PATH` or `--browser` if installed elsewhere).
Optional: install Tesseract and set `TESSERACT_CMD` to use it instead of RapidOCR.

## 4. Usage

```powershell
python docs\scripts\pdf_to_markdown.py                      # source\EMD_EXCON2025.pdf -> output\EMD_EXCON2025.md
python docs\scripts\pdf_to_markdown.py --pages 8-20 -v      # subset, verbose
python docs\scripts\pdf_to_markdown.py other.pdf --ocr force --ocr-dpi 300
python docs\scripts\pdf_to_markdown.py --table-format pipe  # never emit HTML tables (merged cells flattened)

python docs\scripts\markdown_to_pdf.py                      # -> output\EMD_EXCON2025.regenerated.pdf
python docs\scripts\markdown_to_pdf.py --pages 8-14 --keep-html output\debug.html

python docs\scripts\validate_conversion.py --roundtrip-pdf docs\output\EMD_EXCON2025.regenerated.pdf
python docs\scripts\validate_conversion.py --no-pdfminer --pages 1-50

python -m pytest docs\scripts\tests -q                      # 14 tests (synthetic PDFs + real catalogue)
```

Exit codes: `0` success / PASS, `1` failure / FAIL, `2` bad input. Logs go to `docs\logs\<run>-<timestamp>.jsonl`.

## 5. What validation checks

Every check compares the **PDF** (independent probe) with the **rendered Markdown**:

| Check | PDF side | Markdown side |
|---|---|---|
| Page count | pages | `<!-- page=N -->` markers |
| Headings | font-size outliers vs body size, wrapped lines merged | `<h1>`–`<h6>` |
| Images | raster images ≥ 6 pt + vector figures | `<img>` (and files must exist) |
| Tables / rows / columns | ruling-line clusters by x-extent; rows = text bands; columns = recurring line-start anchors | `<table>`, `<tr>`, summed `colspan` |
| Per-table text | words inside the table's bbox | cell tokens (F1 ≥ 0.995) |
| Paragraphs | text blocks (list-marker lines counted separately) | `<p>` + hard breaks + list items, ±10 % |
| Text similarity | PyMuPDF words (token F1) **and** pdfminer text (character F1) | rendered text + front-matter furniture + page labels |

Tokens ignore hyphens (so wrapped part numbers compare equal), edge punctuation and list-marker glyphs;
the character-level oracle still sees every hyphen. Scanned (OCR) pages are reported `INFO`: their text
cannot be verified against a text layer.

### Result on `EMD_EXCON2025.pdf`

| Check | PDF | Markdown | Result |
|---|---|---|---|
| Total page count | 333 | 333 | PASS |
| Heading count | 2 | 2 | PASS |
| Image count / references resolve | 3 | 3 / 3 | PASS |
| Table count | 651 | 651 | PASS |
| Table rows (sum) | 30 447 | 30 447 | PASS (651/651 exact) |
| Table columns (sum) | 1 302 | 1 302 | PASS (651/651 exact) |
| Per-table validation | 651 | 651 pass | PASS |
| Paragraph count | 142 | 144 | PASS |
| Token F1 (PyMuPDF) | 108 316 tokens | 1.00000 | PASS |
| Character F1 (pdfminer) | 333 pages | mean 0.99999, worst 0.9989 | PASS |
| Round trip (PDF→MD→PDF) | 333 pages | 333 pages, token F1 0.99997, worst page 0.990 | PASS |

The per-table section of `validation-report.html` lists, for each table: PDF page, table index,
PDF rows/cols, Markdown rows/cols, merged cells, text F1, pass/fail (filterable).

```
PDF page | Table # | PDF rows | PDF cols | MD rows | MD cols | Text F1 | Result
   8     |   1     |    43    |    2     |   43    |    2    | 1.0000  | PASS
   8     |   2     |    44    |    2     |   44    |    2    | 1.0000  | PASS
```

Sample of the Markdown (page 8):

```html
<!-- page=8 label=1 size=595.4x842.0 box=16,25.2,587,819.5 body=16,52.6,587,808.1 furniture=header,pagenum,footer -->

<!-- table p008.t1 panel=1/2 bbox=16,52.6,298,808.1 cols=16,153.8,298 detector=rules -->
<table>
<colgroup><col style="width:48.8%"><col style="width:51.2%"></colgroup>
<thead>
<tr><th>APPLICATION</th><th>REFERENCE</th></tr>
</thead>
<tbody>
<tr><th colspan="2" class="banner">ABEL-AB06C</th></tr>
<tr><td>BOOM</td><td>AB06C-BOOM-050-090</td></tr>
```

## 6. Performance (this machine, 333 pages, 11 workers)

| Stage | Time |
|---|---|
| PDF → Markdown | ≈ 8 s (≈ 25 ms/page; table detection ≈ 10 ms/page) |
| Markdown → PDF (Chrome) | ≈ 19 s |
| Validation incl. pdfminer oracle | ≈ 40 s (≈ 27 s with `--no-pdfminer`) |

* Extraction parallelises per page; each worker opens the PDF once. Workers return plain dataclasses;
  only the parent logs (no interleaved log lines on Windows).
* OCR dominates scanned documents (seconds per page at 300 dpi); results are cached under
  `docs\logs\ocr-cache` so re-runs and validation are cheap. Lower `--ocr-dpi` (200) for speed.
* Memory is proportional to the Markdown (a few MB here); the regenerated PDF is large (27 MB) because
  Chrome embeds fonts per page; post-process with a PDF optimiser if size matters.

## 7. Known limitations

* **Tables without any ruling lines or shaded rows** (pure whitespace tables) are not detected by the
  rule-based pass; they come out as paragraphs. Only PyMuPDF's ruled-table fallback is available.
* Only **colspan** is detected; `rowspan` and nested tables are not.
* Round-trip fidelity is *content and structure*, not pixel-identical: fonts, colours (other than the
  heading theme), row heights, text alignment and exact heading sizes per level are approximated.
* Multi-column prose uses XY-cut ordering; unusual layouts (text wrapped around figures) can misorder.
* Footnotes are anchored to their page in the Markdown, but markdown-it renders them per page section;
  footnote detection needs a real superscript span in the text layer.
* **OCR**: RapidOCR returns line boxes, so word boxes are interpolated; shaded banner rows are not
  detected in scans; OCR text cannot be independently verified (reported `INFO`).
* Full-page images with embedded text (e.g. page 2 of the catalogue) are kept as images, not OCR'd.
* A full-page background scan under a real text layer is dropped (otherwise every page repeats the scan).
* The validator's PDF probe re-uses PyMuPDF's drawing reader (but not the converter's grouping logic);
  its column count assumes left-aligned columns, so right-aligned numeric columns may need review.
* PyMuPDF is **AGPL-3.0**: fine for internal use; check obligations before distributing the toolkit.
* Developed and tested on Python 3.11 (the repo's venv standard) and Windows; code uses no
  3.12-specific features but has not been run on 3.12.
