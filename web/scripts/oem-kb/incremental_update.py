"""Rebuilds the deterministic JSON only when the source hash changes."""

from __future__ import annotations

import json
from pathlib import Path
from oem_kb_pipeline import DEFAULT_OUTPUT, DEFAULT_SOURCE, parse_document

if __name__ == "__main__":
    current = parse_document(DEFAULT_SOURCE)
    previous = json.loads(DEFAULT_OUTPUT.read_text(encoding="utf-8")) if DEFAULT_OUTPUT.exists() else None
    if previous and previous.get("document", {}).get("sourceHash") == current["document"]["sourceHash"]:
        print("No source changes detected.")
    else:
        DEFAULT_OUTPUT.write_text(json.dumps(current, ensure_ascii=False, indent=2), encoding="utf-8")
        print("Knowledge base JSON updated.")
