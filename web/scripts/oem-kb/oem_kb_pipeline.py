"""Deterministic EMD_EXCON2025 Markdown ingestion pipeline.

The source is generated Markdown containing HTML tables. This module deliberately
uses only Python's standard library so it runs locally without AI or runtime APIs.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
from pathlib import Path
from typing import Any

DEFAULT_SOURCE = Path(__file__).resolve().parents[3] / "docs" / "output" / "EMD_EXCON2025.md"
DEFAULT_OUTPUT = Path(__file__).resolve().parent / "emd_excon2025.json"

PAGE_RE = re.compile(r"<!--\s*page=(\d+)")
TABLE_RE = re.compile(r"<table\b.*?</table>", re.IGNORECASE | re.DOTALL)
ROW_RE = re.compile(r"<tr\b.*?</tr>", re.IGNORECASE | re.DOTALL)
CELL_RE = re.compile(r"<t[dh]\b[^>]*>(.*?)</t[dh]>", re.IGNORECASE | re.DOTALL)
BANNER_RE = re.compile(r'<th\b[^>]*class="[^"]*\bbanner\b[^"]*"[^>]*>(.*?)</th>', re.IGNORECASE | re.DOTALL)
IMAGE_RE = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", value))).strip()


def page_for_offset(source: str, offset: int) -> int | None:
    page = None
    for match in PAGE_RE.finditer(source, 0, offset):
        page = int(match.group(1))
    return page


def parse_table(table_html: str, page: int | None, table_index: int) -> dict[str, Any]:
    headers: list[str] = []
    rows: list[list[str]] = []
    machines: list[dict[str, Any]] = []
    current_machine: str | None = None
    for row_html in ROW_RE.findall(table_html):
        banner = BANNER_RE.search(row_html)
        if banner:
            current_machine = clean(banner.group(1))
            if current_machine:
                machines.append({"displayName": current_machine, "sourcePage": page})
            continue
        cells = [clean(cell) for cell in CELL_RE.findall(row_html)]
        if not cells:
            continue
        if not headers and row_html.lower().find("<th") >= 0:
            headers = cells
        elif len(cells) >= 2:
            rows.append(
                {
                    "application": cells[0],
                    "oemPartNumber": cells[1],
                    "machine": current_machine,
                    "sourcePage": page,
                }
            )
    return {
        "sourcePage": page,
        "tableIndex": table_index,
        "headers": headers or ["APPLICATION", "REFERENCE"],
        "rows": rows,
        "machines": machines,
    }


def parse_document(source_path: Path) -> dict[str, Any]:
    source = source_path.read_text(encoding="utf-8")
    title_match = re.search(r"^title:\s*(.+)$", source, re.MULTILINE)
    title = clean(title_match.group(1)) if title_match else source_path.stem
    sections: list[dict[str, Any]] = []
    tables: list[dict[str, Any]] = []
    images: list[dict[str, Any]] = []
    for match in PAGE_RE.finditer(source):
        page = int(match.group(1))
        end = PAGE_RE.search(source, match.end())
        page_text = source[match.start() : end.start() if end else len(source)]
        section = {
            "pageNumber": page,
            "title": None,
            "content": page_text.strip(),
            "tables": [],
            "images": [],
        }
        for image_match in IMAGE_RE.finditer(page_text):
            image = {
                "sourcePage": page,
                "path": image_match.group(2).strip(),
                "alt": clean(image_match.group(1)),
            }
            section["images"].append(image)
            images.append(image)
        for table_index, table_match in enumerate(TABLE_RE.finditer(page_text)):
            table = parse_table(table_match.group(0), page, table_index)
            section["tables"].append(table)
            tables.append(table)
        sections.append(section)

    machines: dict[str, dict[str, Any]] = {}
    references: list[dict[str, Any]] = []
    for table in tables:
        for machine in table["machines"]:
            display_name = machine["displayName"]
            if display_name not in machines:
                brand, _, model = display_name.partition("-")
                machines[display_name] = {
                    "displayName": display_name,
                    "brand": brand.strip(),
                    "model": model.strip() or None,
                    "sourcePage": machine["sourcePage"],
                    "references": [],
                }
        for row in table["rows"]:
            if not row["machine"]:
                continue
            reference = {
                "machine": row["machine"],
                "application": row["application"],
                "oemPartNumber": row["oemPartNumber"],
                "sourcePage": row["sourcePage"],
            }
            references.append(reference)
            machines[row["machine"]]["references"].append(reference)

    return {
        "document": {
            "sourcePath": str(source_path),
            "title": title,
            "sourceHash": hashlib.sha256(source.encode("utf-8")).hexdigest(),
        },
        "sections": sections,
        "tables": tables,
        "images": images,
        "machines": list(machines.values()),
        "references": references,
        "stats": {
            "pages": len(sections),
            "tables": len(tables),
            "images": len(images),
            "machines": len(machines),
            "references": len(references),
        },
    }


def normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def build_search_entries(data: dict[str, Any]) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for machine in data["machines"]:
        text = " ".join(
            [machine["displayName"], machine["brand"], machine.get("model") or ""]
            + [f'{ref["application"]} {ref["oemPartNumber"]}' for ref in machine["references"]]
        )
        entries.append(
            {
                "kind": "machine",
                "title": machine["displayName"],
                "content": text,
                "normalizedText": normalize(text),
                "machine": machine["displayName"],
            }
        )
        for ref in machine["references"]:
            text = f'{machine["displayName"]} {ref["application"]} {ref["oemPartNumber"]}'
            entries.append(
                {
                    "kind": "reference",
                    "title": ref["oemPartNumber"],
                    "content": text,
                    "normalizedText": normalize(text),
                    "machine": machine["displayName"],
                    "application": ref["application"],
                    "oemPartNumber": ref["oemPartNumber"],
                    "sourcePage": ref["sourcePage"],
                }
            )
    for section in data["sections"]:
        if section["content"]:
            entries.append(
                {
                    "kind": "section",
                    "title": f'Page {section["pageNumber"]}',
                    "content": section["content"],
                    "normalizedText": normalize(section["content"]),
                    "sourcePage": section["pageNumber"],
                }
            )
    return entries


def validate(data: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if not data.get("document", {}).get("sourceHash"):
        errors.append("document.sourceHash is missing")
    if not data.get("sections"):
        errors.append("no page sections were parsed")
    if not data.get("machines"):
        errors.append("no machine banners were parsed")
    seen: set[str] = set()
    for reference in data.get("references", []):
        value = reference.get("oemPartNumber", "")
        if not value:
            errors.append("reference with empty OEM part number")
        if value in seen:
            continue
        seen.add(value)
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["parse", "index", "validate"])
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    data = parse_document(args.source)
    if args.command == "index":
        data["searchEntries"] = build_search_entries(data)
    if args.command == "validate":
        errors = validate(data)
        if errors:
            for error in errors:
                print(f"ERROR: {error}")
            return 1
        print(json.dumps(data["stats"], sort_keys=True))
        return 0
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(data["stats"], sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
