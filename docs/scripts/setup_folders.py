"""Create the docs/ working layout and stage the source PDF.

    docs/
    +-- source/    <- input PDFs
    +-- output/    <- Markdown, images/, validation report, regenerated PDF
    |   +-- images/
    +-- logs/      <- JSONL logs, OCR cache
    +-- scripts/   <- this toolkit
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from pdfmd.config import ProjectPaths  # noqa: E402
from pdfmd.logging_setup import reconfigure_stdout_utf8  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    reconfigure_stdout_utf8()
    p = argparse.ArgumentParser(description="Create the docs/{source,output,logs,scripts} layout.")
    p.add_argument("--docs-root", type=Path, default=None, help="Override the docs/ folder")
    p.add_argument("--pdf", type=Path, default=None, help="PDF to copy into source/ (default: docs/EMD_EXCON2025.pdf)")
    p.add_argument("--force", action="store_true", help="Overwrite an existing file in source/")
    args = p.parse_args(argv)

    paths = ProjectPaths.from_docs_root(args.docs_root)
    paths.ensure()
    for folder in (paths.source, paths.output, paths.images, paths.logs, paths.scripts):
        print(f"ok   {folder}")

    pdf = args.pdf or paths.root / "EMD_EXCON2025.pdf"
    if pdf.is_file():
        target = paths.source / pdf.name
        if target.exists() and not args.force:
            print(f"keep {target} (exists; use --force to overwrite)")
        elif pdf.resolve() != target.resolve():
            shutil.copy2(pdf, target)
            print(f"copy {pdf} -> {target}")
    else:
        print(f"note: {pdf} not found; place your PDF in {paths.source}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
