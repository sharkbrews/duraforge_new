"""Command-line entry: PDF -> Markdown."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from pdfmd.config import ConvertConfig, ProjectPaths  # noqa: E402
from pdfmd.converter import convert  # noqa: E402
from pdfmd.logging_setup import configure_logging, get_logger, reconfigure_stdout_utf8  # noqa: E402


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Convert a PDF to round-trip-friendly Markdown (fully local).")
    p.add_argument("pdf", nargs="?", type=Path, help="Input PDF (default: docs/source/EMD_EXCON2025.pdf)")
    p.add_argument("--docs-root", type=Path, default=None, help="Override the docs/ folder")
    p.add_argument("-o", "--output", type=Path, default=None, help="Output .md (default: output/<pdf-stem>.md)")
    p.add_argument("--images-dir", type=Path, default=None, help="Image output folder (default: output/images)")
    p.add_argument("--pages", type=str, default=None, help="1-based page range, e.g. 8-20")
    p.add_argument("--workers", type=int, default=0, help="Worker processes (0 = auto)")
    p.add_argument("--table-format", choices=["auto", "html", "pipe"], default="auto")
    p.add_argument("--ocr", choices=["auto", "off", "force"], default="auto")
    p.add_argument("--ocr-engine", choices=["auto", "tesseract", "rapidocr"], default="auto")
    p.add_argument("--ocr-dpi", type=int, default=300)
    p.add_argument("--no-vector-figures", action="store_true", help="Do not rasterise vector drawings")
    p.add_argument("--furniture-fraction", type=float, default=0.25)
    p.add_argument("-v", "--verbose", action="store_true")
    return p.parse_args(argv)


def parse_range(text: str | None) -> tuple[int, int] | None:
    if not text:
        return None
    lo, _, hi = text.partition("-")
    return int(lo), int(hi or lo)


def main(argv: list[str] | None = None) -> int:
    reconfigure_stdout_utf8()
    args = parse_args(argv)
    paths = ProjectPaths.from_docs_root(args.docs_root)
    paths.ensure()
    pdf = (args.pdf or paths.source / "EMD_EXCON2025.pdf").resolve()
    if not pdf.is_file():
        print(f"ERROR: PDF not found: {pdf}", file=sys.stderr)
        return 2
    log_path = configure_logging(paths.logs, "convert", args.verbose)
    md = (args.output or paths.output / f"{pdf.stem}.md").resolve()
    cfg = ConvertConfig(
        pdf_path=pdf,
        md_path=md,
        images_dir=(args.images_dir or paths.images).resolve(),
        log_dir=paths.logs,
        workers=args.workers,
        pages=parse_range(args.pages),
        table_format=args.table_format,
        ocr=args.ocr,
        ocr_engine=args.ocr_engine,
        ocr_dpi=args.ocr_dpi,
        vector_figures=not args.no_vector_figures,
        furniture_fraction=args.furniture_fraction,
    )
    try:
        result = convert(cfg)
    except Exception:  # noqa: BLE001
        get_logger().exception("conversion aborted")
        return 1
    print(f"Markdown : {result.md_path}\nManifest : {result.manifest_path}\nLog      : {log_path}")
    print(f"Pages {result.pages} | tables {result.tables} | images {result.images} | headings {result.headings} | OCR pages {result.ocr_pages}")
    print(f"Warnings {len(result.warnings)} | errors {len(result.errors)} | {result.seconds:.1f}s")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
