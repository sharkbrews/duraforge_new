"""Extract a PDF catalogue to Markdown and CSV locally (no network, no AI).

Usage:
    python scripts/extract_catalogue.py <pdf_path> <out_dir>

Output:
    <out_dir>/pages/page_001.md ...   text of each page, with tables as Markdown
    <out_dir>/tables/page_001_t1.csv  each detected table as CSV
    <out_dir>/manifest.json           page count, source hash, table counts
"""

import csv
import hashlib
import json
import sys
from pathlib import Path

import pdfplumber

sys.stdout.reconfigure(encoding="utf-8")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def clean(cell) -> str:
    return "" if cell is None else " ".join(str(cell).split())


def table_to_markdown(rows: list[list[str]]) -> str:
    if not rows:
        return ""
    width = max(len(r) for r in rows)
    rows = [r + [""] * (width - len(r)) for r in rows]
    lines = ["| " + " | ".join(rows[0]) + " |", "|" + "---|" * width]
    lines += ["| " + " | ".join(r) + " |" for r in rows[1:]]
    return "\n".join(lines)


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2

    pdf_path = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    pages_dir = out_dir / "pages"
    tables_dir = out_dir / "tables"
    pages_dir.mkdir(parents=True, exist_ok=True)
    tables_dir.mkdir(parents=True, exist_ok=True)

    table_counts = {}
    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        for i, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            tables = page.extract_tables() or []
            table_counts[i] = len(tables)

            md_parts = [f"<!-- source: {pdf_path.name} page {i} -->", "", text]
            for t_idx, rows in enumerate(tables, start=1):
                clean_rows = [[clean(c) for c in r] for r in rows]
                md_parts += ["", f"**Table {t_idx}**", "", table_to_markdown(clean_rows)]
                with (tables_dir / f"page_{i:03d}_t{t_idx}.csv").open(
                    "w", newline="", encoding="utf-8"
                ) as f:
                    csv.writer(f).writerows(clean_rows)

            (pages_dir / f"page_{i:03d}.md").write_text(
                "\n".join(md_parts) + "\n", encoding="utf-8"
            )

            if i % 25 == 0 or i == total:
                print(f"  {i}/{total} pages")

    manifest = {
        "source_file": pdf_path.name,
        "source_sha256": sha256(pdf_path),
        "page_count": total,
        "tables_per_page": table_counts,
        "total_tables": sum(table_counts.values()),
    }
    (out_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )
    print(f"Done: {total} pages, {manifest['total_tables']} tables -> {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
