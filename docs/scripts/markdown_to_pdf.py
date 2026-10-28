"""Command-line entry: Markdown -> PDF (regenerate the document)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from pdfmd.config import ProjectPaths  # noqa: E402
from pdfmd.logging_setup import configure_logging, get_logger, reconfigure_stdout_utf8  # noqa: E402
from pdfmd.render import RenderError, render_pdf  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    reconfigure_stdout_utf8()
    p = argparse.ArgumentParser(description="Regenerate a PDF from the converted Markdown (local, headless Chrome/Edge).")
    p.add_argument("markdown", nargs="?", type=Path)
    p.add_argument("--docs-root", type=Path, default=None)
    p.add_argument("-o", "--output", type=Path, default=None, help="Output PDF (default: output/<stem>.regenerated.pdf)")
    p.add_argument("--pages", type=str, default=None, help="Only render this 1-based page range, e.g. 8-20")
    p.add_argument("--browser", type=Path, default=None, help="Path to chrome.exe / msedge.exe (or set CHROME_PATH)")
    p.add_argument("--keep-html", type=Path, default=None, help="Also save the intermediate HTML here")
    p.add_argument("-v", "--verbose", action="store_true")
    args = p.parse_args(argv)

    paths = ProjectPaths.from_docs_root(args.docs_root)
    paths.ensure()
    md = (args.markdown or paths.output / "EMD_EXCON2025.md").resolve()
    if not md.is_file():
        print(f"ERROR: Markdown not found: {md}", file=sys.stderr)
        return 2
    out = (args.output or paths.output / f"{md.stem}.regenerated.pdf").resolve()
    log_path = configure_logging(paths.logs, "render", args.verbose)
    page_range = None
    if args.pages:
        lo, _, hi = args.pages.partition("-")
        page_range = (int(lo), int(hi or lo))
    try:
        render_pdf(md, out, args.browser, page_range, args.keep_html)
    except RenderError as exc:
        get_logger().error("render failed", detail=str(exc))
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    print(f"PDF : {out}\nLog : {log_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
