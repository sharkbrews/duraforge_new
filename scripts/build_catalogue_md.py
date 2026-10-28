"""Combine the extracted catalogue into one Markdown file and validate it (local only).

Usage:
    python scripts/build_catalogue_md.py [source_dir] [output_md]

Defaults:
    source_dir = docs/catalogue/source
    output_md  = docs/catalogue/royal-catalogue-combined.md

Exits with status 1 if validation finds errors.
"""

import csv
import hashlib
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SRC = ROOT / "docs" / "catalogue" / "source"
DEFAULT_OUT = ROOT / "docs" / "catalogue" / "royal-catalogue-combined.md"
PDF_PATH = ROOT / "docs" / "royal-seals-catalogue-2026.pdf"

# Order code example: PS040-M-01-010.00 X 004.00 X 04.0/04.5 -> 010.00 and 004.00.
# Imperial series omit the spaces (PS024-I-01-02.000X01.375X...).
CODE_RE = re.compile(r"-(\d+\.\d+)\s*X\s*(\d+\.\d+)")
TOLERANCE = 0.01
WORD_RE = re.compile(r"[A-Za-z]{4,}")
TEXT_SIZE_RE = re.compile(
    r"^(\d+\.\d+) (\d+\.\d+) (\d+\.\d+) ([A-Z]{2}\d{3}-\S+ X \d+\.\d+ X \d+\.\d+)$"
)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def load_csv(path: Path) -> list[list[str]]:
    with path.open(encoding="utf-8", newline="") as f:
        return [[c.strip() for c in row] for row in csv.reader(f)]


def strip_captions(rows: list[list[str]]) -> list[list[str]]:
    """Drop leading single-cell rows (titles that repeat the page text)."""
    rows = [r for r in rows if any(r)]
    while rows and sum(1 for c in rows[0] if c) <= 1:
        rows = rows[1:]
    return rows


def trim_width(rows: list[list[str]]) -> list[list[str]]:
    """Remove trailing columns that are empty in every row."""
    if not rows:
        return rows
    width = 0
    for r in rows:
        for i, c in enumerate(r):
            if c:
                width = max(width, i + 1)
    return [r[:width] + [""] * (width - len(r[:width])) for r in rows]


def keep_text_line(line: str, cell_tokens: set[str]) -> bool:
    """Keep prose and headings; drop drawing labels and table fragments."""
    if not WORD_RE.search(line):
        return False
    tokens = line.split()
    return not all(t in cell_tokens for t in tokens)


def md_table(rows: list[list[str]]) -> str:
    def esc(cell: str) -> str:
        return cell.replace("|", "\\|")

    header, body = rows[0], rows[1:]
    lines = ["| " + " | ".join(esc(c) for c in header) + " |", "|" + "---|" * len(header)]
    lines += ["| " + " | ".join(esc(c) for c in r) + " |" for r in body]
    return "\n".join(lines)


def find_col(header: list[str], test) -> int | None:
    for i, h in enumerate(header):
        if test(h):
            return i
    return None


def header_row(table: list[list[str]]) -> int | None:
    """Index of the row holding the ORDER CODE column title, if any."""
    for idx, row in enumerate(table):
        if any("ORDER CODE" in c for c in row):
            return idx
    return None


def trim_to_header(table: list[list[str]]) -> list[list[str]]:
    """Merge the split size-list header rows into one header; drop captions above it."""
    hr = header_row(table)
    if hr is None:
        return table
    start = hr
    while start > 0 and all(len(c) <= 20 for c in table[start - 1] if c):
        start -= 1
    width = max(len(r) for r in table)
    header = [
        " ".join(c for c in (r[i] if i < len(r) else "" for r in table[start : hr + 1]) if c)
        for i in range(width)
    ]
    return [header] + table[hr + 1 :]


def undouble(line: str) -> str:
    """Undo PDF text that repeats each letter (e.g. 'SSEEAALLSS' -> 'SEALS')."""

    def collapsible(tok: str) -> bool:
        return (
            len(tok) >= 2
            and len(tok) % 2 == 0
            and all(tok[i] == tok[i + 1] for i in range(0, len(tok), 2))
        )

    tokens = line.split(" ")
    long_tokens = [t for t in tokens if len(t) >= 4]
    if not long_tokens or not all(collapsible(t) for t in long_tokens):
        return line
    return " ".join(t[::2] if collapsible(t) else t for t in tokens)


def split_text_sizes(lines: list[str]) -> tuple[list[tuple[str, str, str, str]], list[str]]:
    """Pull size rows that the PDF extracted as plain text (dN DN H ORDER CODE)."""
    sizes, rest = [], []
    for line in lines:
        m = TEXT_SIZE_RE.match(line)
        if m:
            sizes.append(m.groups())
        else:
            rest.append(line)
    return sizes, rest


def code_mismatch(code: str, dn: float, dN: float) -> str | None:
    """Return a problem description if the order code does not match DN and dN."""
    m = CODE_RE.search(code)
    if not m:
        return f"order code not parsed: {code}"
    # Some series write the order code as dN X DN, others as DN X dN.
    g1, g2 = float(m.group(1)), float(m.group(2))
    in_order = abs(g1 - dn) <= TOLERANCE and abs(g2 - dN) <= TOLERANCE
    swapped = abs(g1 - dN) <= TOLERANCE and abs(g2 - dn) <= TOLERANCE
    if in_order or swapped:
        return None
    return f"order code {code} disagrees with DN={dn:g} dN={dN:g}"


def main() -> int:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SRC
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUT

    manifest = json.loads((src / "manifest.json").read_text(encoding="utf-8"))
    page_count = manifest["page_count"]
    errors: list[str] = []
    warnings: list[str] = []
    discrepancies: list[str] = []
    skipped: list[str] = []

    page_files = list((src / "pages").glob("page_*.md"))
    if len(page_files) != page_count:
        errors.append(f"manifest says {page_count} pages, found {len(page_files)} page files")

    if PDF_PATH.exists():
        if sha256(PDF_PATH) != manifest["source_sha256"]:
            errors.append("source PDF hash does not match manifest")
    else:
        warnings.append(f"source PDF not found at {PDF_PATH}; hash not checked")

    body: list[str] = []
    total_tables = 0
    total_rows = 0
    checked_rows = 0

    for p in range(1, page_count + 1):
        page_md = (src / "pages" / f"page_{p:03d}.md").read_text(encoding="utf-8")
        text_part = re.split(r"\n\*\*Table \d+\*\*", page_md, maxsplit=1)[0]
        text_lines = [
            undouble(l.strip())
            for l in text_part.splitlines()
            if l.strip() and not l.strip().startswith("<!--")
        ]

        table_files = sorted(
            (src / "tables").glob(f"page_{p:03d}_t*.csv"),
            key=lambda f: int(f.stem.rsplit("_t", 1)[1]),
        )
        expected = manifest["tables_per_page"].get(str(p), 0)
        if len(table_files) != expected:
            errors.append(f"page {p}: manifest says {expected} tables, found {len(table_files)}")

        size_rows: list[tuple[str, str, str, str]] = []
        tables = [trim_width(strip_captions(load_csv(f))) for f in table_files]
        tables = [trim_to_header(t) for t in tables]
        tables = [t for t in tables if t]
        total_tables += len(tables)

        has_order_table = any(header_row(t) is not None for t in tables)
        if not has_order_table:
            size_rows, text_lines = split_text_sizes(text_lines)

        cell_tokens = {tok for t in tables for r in t for c in r for tok in c.split()}
        if tables:
            kept = [l for l in text_lines if keep_text_line(l, cell_tokens)]
        else:
            kept = text_lines

        body.append(f"## Page {p}")
        body.append("")
        previous = None
        for line in kept:
            if line != previous:
                body += [line, ""]
            previous = line

        for i, table in enumerate(tables, start=1):
            body += [f"**Table {i}**", "", md_table(table), ""]

            header = table[0]
            dn_i = find_col(header, lambda h: "DN" in h)
            dN_i = find_col(header, lambda h: "dN" in h)
            code_i = find_col(header, lambda h: "ORDER CODE" in h)
            if dn_i is None or dN_i is None or code_i is None:
                continue
            for r_no, row in enumerate(table[1:], start=2):
                if len(row) <= code_i or not row[code_i]:
                    continue
                total_rows += 1
                where = f"page {p} table {i} row {r_no}"
                try:
                    dn = float(row[dn_i])
                    dN = float(row[dN_i])
                except ValueError:
                    # Formula rows (ØDN placeholders in the order code) can only be checked on H.
                    cross = re.match(r"^(\d+\.\d+) X ", row[0])
                    tail = re.search(r"X (\d+\.\d+)$", row[code_i])
                    if "DN" in row[code_i] and cross and tail:
                        checked_rows += 1
                        if abs(float(cross.group(1)) - float(tail.group(1))) > TOLERANCE:
                            discrepancies.append(
                                f"{where}: H={cross.group(1)} disagrees with order code {row[code_i]}"
                            )
                        continue
                    # Text rows (imperial sub-headings, notes) carry no metric size.
                    raw = " | ".join(c for c in row if c)
                    skipped.append(f"- Page {p}, table {i}, row {r_no}: {raw}")
                    continue
                m = CODE_RE.search(row[code_i])
                if not m:
                    discrepancies.append(f"{where}: order code not parsed: {row[code_i]}")
                    continue
                checked_rows += 1
                problem = code_mismatch(row[code_i], dn, dN)
                if problem:
                    discrepancies.append(f"{where}: {problem}")

        if size_rows:
            size_table = [["dN (h9)", "DN (H9)", "H", "ORDER CODE"]]
            size_table += [list(r) for r in size_rows]
            total_tables += 1
            body += [f"**Table {len(tables) + 1}**", "", md_table(size_table), ""]
            for r_no, (dN_s, DN_s, H_s, code) in enumerate(size_rows, start=1):
                total_rows += 1
                checked_rows += 1
                where = f"page {p} size text row {r_no}"
                problem = code_mismatch(code, float(DN_s), float(dN_s))
                if problem:
                    discrepancies.append(f"{where}: {problem}")
                h_code = float(re.search(r"X (\d+\.\d+)$", code).group(1))
                if abs(h_code - float(H_s)) > TOLERANCE:
                    discrepancies.append(f"{where}: H={H_s} disagrees with order code {code}")

    body += ["## Appendix: skipped table rows", ""]
    body += [
        f"{len(skipped)} rows had no numeric dN and no formula code, so they were not checked. "
        "They are section labels and repeated headers.",
        "",
    ]
    body += skipped + [""]

    header = [
        "# Royal Seals Catalogue 2026: combined extract",
        "",
        f"- Source: `{manifest['source_file']}` (SHA-256 `{manifest['source_sha256']}`)",
        f"- Pages: {page_count}",
        f"- Tables: {total_tables}",
        f"- Size-list rows: {total_rows} ({checked_rows} order codes checked against DN/dN)",
        "- Generated locally by `scripts/build_catalogue_md.py`.",
        "- Contains Royal Composites content. Do not commit or publish.",
        "",
    ]
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(header + body) + "\n", encoding="utf-8")

    for w in warnings:
        print(f"WARNING: {w}")
    for e in errors[:20]:
        print(f"ERROR: {e}")
    for d in discrepancies[:20]:
        print(f"SOURCE DISCREPANCY: {d}")
    if len(discrepancies) > 20:
        print(f"... and {len(discrepancies) - 20} more source discrepancies")
    print(
        f"Wrote {out} | pages={page_count} tables={total_tables} rows={total_rows} "
        f"checked={checked_rows} skipped_text_rows={len(skipped)} "
        f"errors={len(errors)} source_discrepancies={len(discrepancies)}"
    )
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
