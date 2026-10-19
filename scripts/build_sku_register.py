"""Build the Duraforge SKU register from Royal order-code tables and the FPE CSV.

Run from the repo root: python scripts/build_sku_register.py

Idempotent: existing DF codes are kept and never reassigned. New Royal order codes
get the next free number. Rows missing from this run are marked RETIRED, not deleted.
FPE matches are DIMENSION_MATCHED candidates only, never VERIFIED automatically.
No AI or network calls.
"""
from __future__ import annotations

import csv
import re
import sys
from collections import defaultdict
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
ROYAL_MD = ROOT / "docs" / "catalogue" / "royal-catalogue-combined.md"
FPE_CSV = ROOT / "docs" / "seals_v1.0" / "csv" / "fpeseals_products_20260424.csv"
REGISTER = ROOT / "data" / "sku_register.csv"

DF_PREFIX = "DF-"
SUPPLIER = "Royal"
TOL = {"mm": 0.05, "inch": 0.002}
NUM_TOL = 0.01
# Order codes round cross-section to one decimal, so the table value may differ by up to 0.05.
H_TOL = 0.051
ORDER_RE = re.compile(
    r"^(?P<series>[A-Z]{2,4}\d{3})-(?P<unit>[MI])-(?P<mat>\d{2})-"
    r"(?P<a>\d+\.\d+)\s*X\s*(?P<b>\d+\.\d+)\s*X\s*(?P<h>\d+\.\d+)"
    r"(?:\s*/\s*(?P<H>\d+\.\d+))?$"
)
DF_RE = re.compile(r"^DF-(\d{6})$")
FIELDS = [
    "df_sku", "status", "supplier", "supplier_code", "supplier_code_norm", "series",
    "unit", "material", "DN_mm", "dN_mm", "h_mm", "H_mm", "source_page",
    "fpe_status", "fpe_sku", "fpe_candidates", "fpe_match_basis",
]
FPE_BASIS = "DS series -> FPE Wiper* types; inner=dN, outer=DN, depth_1=h"


def cells_of(line: str) -> list[str]:
    return [c.strip() for c in line.strip().strip("|").split("|")]


def column_map(header: list[str]) -> dict[str, int] | None:
    cols: dict[str, int] = {}
    for i, cell in enumerate(header):
        key = re.sub(r"[Ø\s]", "", cell)
        if re.search(r"ORDER CODE|PRODUCT CODE|ITEM CODE", cell.upper()):
            cols["order"] = i
        elif key.startswith("DN") and not key.startswith("dN"):
            cols["DN"] = i
        elif key.startswith("dN"):
            cols["dN"] = i
        elif key == "h":
            cols["h"] = i
    return cols if "order" in cols else None


def to_float(text: str) -> float | None:
    try:
        return float(text)
    except ValueError:
        return None


def read_royal(path: Path) -> tuple[list[dict], dict[str, int], list[str]]:
    stats = {
        "order_rows": 0, "unparsed": 0, "code_mismatch": 0,
        "duplicates_same": 0, "duplicates_conflict": 0, "orphan_order_cells": 0,
    }
    problems: list[str] = []
    records: list[dict] = []
    seen: dict[str, dict] = {}
    page = ""
    block: list[str] = []

    def process(block: list[str]) -> None:
        if not block:
            return
        cols = column_map(cells_of(block[0])) if len(block) > 1 and "---" in block[1] else None
        if cols is None:
            for line in block:
                for cell in cells_of(line):
                    if ORDER_RE.match(cell):
                        stats["orphan_order_cells"] += 1
            return
        for line in block[2:]:
            cells = cells_of(line)
            if len(cells) <= cols["order"]:
                continue
            value = cells[cols["order"]]
            if "X" not in value.upper():
                continue
            m = ORDER_RE.match(value)
            if not m:
                stats["unparsed"] += 1
                problems.append(f"page {page}: unparsed order code '{value}'")
                continue
            code_nums = (float(m["a"]), float(m["b"]), float(m["h"]))
            if "DN" in cols and "dN" in cols:
                t_dn = to_float(cells[cols["DN"]]) if cols["DN"] < len(cells) else None
                t_dN = to_float(cells[cols["dN"]]) if cols["dN"] < len(cells) else None
                if t_dn is None or t_dN is None or not (
                    (abs(code_nums[0] - t_dn) < NUM_TOL and abs(code_nums[1] - t_dN) < NUM_TOL)
                    or (abs(code_nums[1] - t_dn) < NUM_TOL and abs(code_nums[0] - t_dN) < NUM_TOL)
                ):
                    stats["code_mismatch"] += 1
                    problems.append(f"page {page}: code '{value}' does not match table DN/dN")
                    continue
                DN, dN = t_dn, t_dN
            else:
                DN, dN = max(code_nums[0], code_nums[1]), min(code_nums[0], code_nums[1])
            h = code_nums[2]
            if "h" in cols and cols["h"] < len(cells):
                t_h = to_float(cells[cols["h"]])
                if t_h is not None and abs(t_h - h) >= H_TOL:
                    stats["code_mismatch"] += 1
                    problems.append(f"page {page}: code '{value}' cross-section differs from table")
                    continue
            stats["order_rows"] += 1
            norm = re.sub(r"[^A-Z0-9]", "", value.upper())
            rec = {
                "supplier_code": value, "norm": norm, "series": m["series"],
                "unit": "metric" if m["unit"] == "M" else "imperial",
                "material": m["mat"], "DN": DN, "dN": dN, "h": h,
                "H": m["H"] or "", "page": page,
            }
            if norm in seen:
                prev = seen[norm]
                if (prev["DN"], prev["dN"], prev["h"]) == (DN, dN, h):
                    stats["duplicates_same"] += 1
                else:
                    stats["duplicates_conflict"] += 1
                    problems.append(f"'{value}' appears with different sizes (pages {prev['page']}, {page})")
                continue
            seen[norm] = rec
            records.append(rec)

    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("## Page "):
            process(block)
            block = []
            page = line.removeprefix("## Page ").strip()
        elif line.startswith("|"):
            block.append(line)
        else:
            process(block)
            block = []
    process(block)
    return records, stats, problems


def load_fpe(path: Path) -> dict[str, dict[int, list[dict]]]:
    buckets: dict[str, dict[int, list[dict]]] = {"mm": defaultdict(list), "inch": defaultdict(list)}
    with path.open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            unit = row["unit_of_measure"].strip().lower()
            if unit not in buckets:
                continue
            inner = to_float(row["inner_diameter"])
            outer = to_float(row["outer_diameter"])
            depth = to_float(row["depth_1"])
            if inner is None or outer is None or depth is None or outer <= 0:
                continue
            buckets[unit][round(outer)].append(
                {"sku": row["sku"], "type": row["product_type"].strip(), "inner": inner, "outer": outer, "depth": depth}
            )
    return buckets


# Royal series prefix -> FPE product_type prefix. Only confirmed mappings are listed.
# PS (piston), RS (rod) and other series are NOT_CHECKED until their FPE family is confirmed.
FUNCTION_MAP = {"DS": "Wiper"}


def fpe_lookup(buckets: dict, unit: str, type_prefix: str, DN: float, dN: float, h: float) -> list[str]:
    tol = TOL[unit]
    hits = []
    for key in (round(DN) - 1, round(DN), round(DN) + 1):
        for r in buckets[unit].get(key, []):
            if not r["type"].startswith(type_prefix):
                continue
            if abs(r["outer"] - DN) <= tol and abs(r["inner"] - dN) <= tol and abs(r["depth"] - h) <= tol:
                hits.append(r["sku"])
    return hits


def read_register(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    with path.open(encoding="utf-8", newline="") as f:
        return {r["supplier_code_norm"]: r for r in csv.DictReader(f)}


def main() -> int:
    records, stats, problems = read_royal(ROYAL_MD)
    buckets = load_fpe(FPE_CSV)
    existing = read_register(REGISTER)

    max_n = 0
    for row in existing.values():
        m = DF_RE.match(row["df_sku"])
        if not m:
            print(f"ERROR: malformed existing code {row['df_sku']}")
            return 1
        max_n = max(max_n, int(m.group(1)))

    current: set[str] = set()
    out: list[dict] = []
    fpe_counts: dict[str, int] = defaultdict(int)
    new_count = 0
    for rec in records:
        current.add(rec["norm"])
        prev = existing.get(rec["norm"])
        if prev is None:
            new_count += 1
        if prev and prev["fpe_status"] == "VERIFIED":
            fpe = prev
        elif rec["series"][:2] not in FUNCTION_MAP:
            fpe = {"fpe_status": "NOT_CHECKED", "fpe_sku": "", "fpe_candidates": ""}
            fpe_counts["NOT_CHECKED"] += 1
        else:
            unit_key = "mm" if rec["unit"] == "metric" else "inch"
            hits = fpe_lookup(buckets, unit_key, FUNCTION_MAP[rec["series"][:2]], rec["DN"], rec["dN"], rec["h"])
            if len(hits) == 1:
                status, fsku, cands = "DIMENSION_MATCHED", hits[0], ""
            elif len(hits) > 1:
                status, fsku, cands = "AMBIGUOUS", "", ";".join(hits)
            else:
                status, fsku, cands = "NONE", "", ""
            fpe = {"fpe_status": status, "fpe_sku": fsku, "fpe_candidates": cands}
            fpe_counts[status] += 1
        if prev:
            df_sku = prev["df_sku"]
        else:
            max_n += 1
            df_sku = f"{DF_PREFIX}{max_n:06d}"
        out.append({
            "df_sku": df_sku, "status": "ACTIVE", "supplier": SUPPLIER,
            "supplier_code": rec["supplier_code"], "supplier_code_norm": rec["norm"],
            "series": rec["series"], "unit": rec["unit"], "material": rec["material"],
            "DN_mm": f"{rec['DN']:.2f}", "dN_mm": f"{rec['dN']:.2f}",
            "h_mm": f"{rec['h']:.2f}", "H_mm": rec["H"], "source_page": rec["page"],
            "fpe_status": fpe["fpe_status"], "fpe_sku": fpe["fpe_sku"],
            "fpe_candidates": fpe["fpe_candidates"], "fpe_match_basis": FPE_BASIS,
        })

    retired = 0
    for norm, prev in existing.items():
        if norm not in current:
            retired += 1
            out.append({**prev, "status": "RETIRED"})

    out.sort(key=lambda r: int(r["df_sku"][len(DF_PREFIX):]))
    REGISTER.parent.mkdir(parents=True, exist_ok=True)
    with REGISTER.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(out)

    print(f"Royal order-code rows parsed: {stats['order_rows']}")
    print(f"Register rows written: {len(out)} (new this run: {new_count})")
    print(f"Retired this run: {retired}")
    print(f"FPE matches for new rows: {dict(fpe_counts)}")
    print(
        "Duplicates same: {duplicates_same}, conflicting: {duplicates_conflict}, "
        "unparsed: {unparsed}, code mismatch: {code_mismatch}, "
        "order cells in unrecognised tables: {orphan_order_cells}".format(**stats)
    )
    for p in problems[:50]:
        print(f"  - {p}")
    if len(problems) > 50:
        print(f"  ... {len(problems) - 50} more")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
