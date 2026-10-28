"""Validate data/sku_register.csv against the Royal catalogue and the FPE CSV.

Run from the repo root: python scripts/validate_sku_register.py
Exit code 0 = all checks pass, 1 = at least one error. No AI or network calls.
"""
from __future__ import annotations

import csv
import re
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_sku_register import (  # noqa: E402
    DF_RE, FIELDS, FPE_CSV, FUNCTION_MAP, ORDER_RE, REGISTER, ROYAL_MD, TOL, load_fpe,
)

ROOT = Path(__file__).resolve().parent.parent
ALLOWED_STATUS = {"ACTIVE", "RETIRED"}
ALLOWED_FPE = {"NOT_CHECKED", "NONE", "AMBIGUOUS", "DIMENSION_MATCHED", "VERIFIED"}


def catalogue_index(path: Path) -> dict[str, set[str]]:
    """Map each page to the normalised order codes printed on it."""
    index: dict[str, set[str]] = {}
    page = ""
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("## Page "):
            page = line.removeprefix("## Page ").strip()
            index.setdefault(page, set())
        elif line.startswith("|"):
            for cell in line.strip().strip("|").split("|"):
                cell = cell.strip()
                if ORDER_RE.match(cell):
                    index.setdefault(page, set()).add(re.sub(r"[^A-Z0-9]", "", cell.upper()))
    return index


def committed_register() -> dict[str, str] | None:
    """Return {df_sku: supplier_code_norm} from the last commit, or None if untracked."""
    rel = REGISTER.relative_to(ROOT).as_posix()
    proc = subprocess.run(
        ["git", "show", f"HEAD:{rel}"], cwd=ROOT, capture_output=True, text=True, encoding="utf-8"
    )
    if proc.returncode != 0:
        return None
    return {r["df_sku"]: r["supplier_code_norm"] for r in csv.DictReader(proc.stdout.splitlines())}


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []

    if not REGISTER.exists():
        print(f"ERROR: {REGISTER} not found. Run build_sku_register.py first.")
        return 1

    with REGISTER.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != FIELDS:
            errors.append(f"header mismatch: {reader.fieldnames}")
        rows = list(reader)

    catalogue = catalogue_index(ROYAL_MD)
    fpe_buckets = load_fpe(FPE_CSV)
    fpe_skus: dict[str, dict] = {}
    with FPE_CSV.open(encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            fpe_skus[r["sku"]] = r

    seen_df: set[str] = set()
    seen_norm: set[str] = set()
    implausible: dict[str, list[str]] = {}
    counts = {"ACTIVE": 0, "RETIRED": 0}
    fpe_counts: dict[str, int] = {}

    for i, r in enumerate(rows, start=2):
        tag = f"line {i} {r.get('df_sku', '?')}"
        df = r["df_sku"]
        m = DF_RE.match(df)
        if not m:
            errors.append(f"{tag}: malformed DF code")
        elif df in seen_df:
            errors.append(f"{tag}: DF code reused")
        seen_df.add(df)

        norm = r["supplier_code_norm"]
        if norm in seen_norm:
            errors.append(f"{tag}: supplier code duplicated")
        seen_norm.add(norm)
        if norm != re.sub(r"[^A-Z0-9]", "", r["supplier_code"].upper()):
            errors.append(f"{tag}: supplier_code_norm does not match supplier_code")

        if r["status"] not in ALLOWED_STATUS:
            errors.append(f"{tag}: unknown status '{r['status']}'")
        else:
            counts[r["status"]] += 1

        page = r["source_page"]
        if not page:
            errors.append(f"{tag}: missing source_page")
        elif norm not in catalogue.get(page, set()):
            errors.append(f"{tag}: code {r['supplier_code']} not found on catalogue page {page}")

        try:
            DN, dN, h = float(r["DN_mm"]), float(r["dN_mm"]), float(r["h_mm"])
        except ValueError:
            errors.append(f"{tag}: non-numeric dimensions")
            continue
        if not (DN > dN > 0 and h > 0):
            implausible.setdefault(r["series"], []).append(r["df_sku"])

        fstat = r["fpe_status"]
        fpe_counts[fstat] = fpe_counts.get(fstat, 0) + 1
        if fstat not in ALLOWED_FPE:
            errors.append(f"{tag}: unknown fpe_status '{fstat}'")
        elif fstat in ("DIMENSION_MATCHED", "VERIFIED"):
            fsku = r["fpe_sku"]
            fr = fpe_skus.get(fsku)
            if fr is None:
                errors.append(f"{tag}: FPE sku {fsku} not in FPE CSV")
            else:
                unit_key = "mm" if r["unit"] == "metric" else "inch"
                tol = TOL[unit_key]
                if fr["unit_of_measure"].strip().lower() != unit_key:
                    errors.append(f"{tag}: FPE unit differs from Royal unit")
                if abs(float(fr["outer_diameter"]) - DN) > tol or abs(float(fr["inner_diameter"]) - dN) > tol \
                        or abs(float(fr["depth_1"]) - h) > tol:
                    errors.append(f"{tag}: FPE {fsku} dimensions do not match register")
                prefix = FUNCTION_MAP.get(r["series"][:2])
                if prefix is None or not fr["product_type"].strip().startswith(prefix):
                    errors.append(f"{tag}: FPE {fsku} product type does not match series function")
        elif fstat == "NOT_CHECKED" and r["fpe_sku"]:
            errors.append(f"{tag}: NOT_CHECKED row has an FPE sku")

        if r["status"] == "RETIRED" and fstat == "VERIFIED":
            warnings.append(f"{tag}: retired row still marked VERIFIED")

    prior = committed_register()
    if prior is None:
        warnings.append("register not yet committed; code-stability check skipped")
    else:
        current = {r["df_sku"]: r["supplier_code_norm"] for r in rows}
        for df, norm in prior.items():
            if df not in current:
                errors.append(f"{df} present in last commit but missing now (must be RETIRED, not deleted)")
            elif current[df] != norm:
                errors.append(f"{df} reassigned to a different supplier code since last commit")

    for series, skus in sorted(implausible.items()):
        warnings.append(
            f"{len(skus)} rows in series {series} have DN <= dN or h <= 0 as printed in the catalogue "
            f"(e.g. {skus[0]}); confirm column labels/values with Royal"
        )
    print(f"Rows: {len(rows)} (ACTIVE {counts['ACTIVE']}, RETIRED {counts['RETIRED']})")
    print(f"FPE status: {fpe_counts}")
    print(f"Catalogue pages indexed: {len(catalogue)}; FPE SKUs loaded: {len(fpe_skus)}")
    for w in warnings:
        print(f"WARN: {w}")
    for e in errors[:100]:
        print(f"ERROR: {e}")
    if len(errors) > 100:
        print(f"... {len(errors) - 100} more errors")
    if errors:
        print(f"FAILED with {len(errors)} error(s)")
        return 1
    print("PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
