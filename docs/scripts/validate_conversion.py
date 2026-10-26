"""Command-line entry: validate PDF vs Markdown and write the HTML report."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from pdfmd.config import ProjectPaths  # noqa: E402
from pdfmd.logging_setup import configure_logging, get_logger, reconfigure_stdout_utf8  # noqa: E402
from pdfmd.report import write_reports  # noqa: E402
from pdfmd.validation import roundtrip_check, validate  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    reconfigure_stdout_utf8()
    p = argparse.ArgumentParser(description="Validate generated Markdown against the source PDF.")
    p.add_argument("pdf", nargs="?", type=Path)
    p.add_argument("markdown", nargs="?", type=Path)
    p.add_argument("--docs-root", type=Path, default=None)
    p.add_argument("-o", "--report", type=Path, default=None, help="HTML report path (default: output/validation-report.html)")
    p.add_argument("--workers", type=int, default=0)
    p.add_argument("--pages", type=str, default=None, help="1-based page range, e.g. 8-20")
    p.add_argument("--no-pdfminer", action="store_true", help="Skip the pdfminer (pdfplumber) text oracle")
    p.add_argument("--page-threshold", type=float, default=0.98, help="Minimum per-page token F1")
    p.add_argument("--table-threshold", type=float, default=0.995, help="Minimum per-table token F1")
    p.add_argument("--roundtrip-pdf", type=Path, default=None, help="Regenerated PDF to compare with the original")
    p.add_argument("-v", "--verbose", action="store_true")
    args = p.parse_args(argv)

    paths = ProjectPaths.from_docs_root(args.docs_root)
    paths.ensure()
    pdf = (args.pdf or paths.source / "EMD_EXCON2025.pdf").resolve()
    md = (args.markdown or paths.output / f"{pdf.stem}.md").resolve()
    for f in (pdf, md):
        if not f.is_file():
            print(f"ERROR: file not found: {f}", file=sys.stderr)
            return 2
    log_path = configure_logging(paths.logs, "validate", args.verbose)
    page_range = None
    if args.pages:
        lo, _, hi = args.pages.partition("-")
        page_range = (int(lo), int(hi or lo))
    import os

    workers = args.workers or max(1, (os.cpu_count() or 2) - 1)
    try:
        report = validate(pdf, md, workers, not args.no_pdfminer, args.page_threshold, args.table_threshold, page_range=page_range)
        if args.roundtrip_pdf:
            report.roundtrip = roundtrip_check(pdf, args.roundtrip_pdf.resolve(), args.page_threshold)
            if report.roundtrip["status"] != "PASS":
                report.overall = "FAIL"
    except Exception:  # noqa: BLE001
        get_logger().exception("validation aborted")
        return 1
    html_path, json_path = write_reports(report, (args.report or paths.output / "validation-report.html").resolve())
    for c in report.checks:
        print(f"[{c.status:<4}] {c.name:<44} PDF={c.pdf_value:<16} MD={c.md_value:<16} {c.detail}")
    if report.roundtrip:
        print(f"[{report.roundtrip['status']:<4}] Round trip {report.roundtrip}")
    print(f"\nOVERALL: {report.overall}\nReport : {html_path}\nJSON   : {json_path}\nLog    : {log_path}")
    return 0 if report.overall == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
