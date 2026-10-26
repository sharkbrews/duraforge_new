"""Project paths and conversion settings.

Everything path-related goes through :class:`ProjectPaths` so the whole toolkit
works from any working directory on Windows (no reliance on ``os.getcwd``).
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

# docs/scripts/pdfmd/config.py -> parents[2] == docs/
DEFAULT_DOCS_ROOT = Path(__file__).resolve().parents[2]

TableFormat = Literal["auto", "html", "pipe"]
OcrMode = Literal["auto", "off", "force"]


@dataclass(frozen=True)
class ProjectPaths:
    """The folder layout required by the project brief."""

    root: Path

    @classmethod
    def from_docs_root(cls, root: Path | None = None) -> "ProjectPaths":
        return cls(Path(root) if root else DEFAULT_DOCS_ROOT)

    @property
    def source(self) -> Path:
        return self.root / "source"

    @property
    def output(self) -> Path:
        return self.root / "output"

    @property
    def images(self) -> Path:
        return self.output / "images"

    @property
    def logs(self) -> Path:
        return self.root / "logs"

    @property
    def scripts(self) -> Path:
        return self.root / "scripts"

    def ensure(self) -> None:
        for folder in (self.source, self.output, self.images, self.logs, self.scripts):
            folder.mkdir(parents=True, exist_ok=True)


@dataclass
class ConvertConfig:
    """All tunables for PDF -> Markdown conversion."""

    pdf_path: Path
    md_path: Path
    images_dir: Path
    log_dir: Path
    workers: int = 0  # 0 -> auto (cpu_count - 1)
    pages: tuple[int, int] | None = None  # 1-based inclusive range
    table_format: TableFormat = "auto"
    ocr: OcrMode = "auto"
    ocr_engine: str = "auto"  # auto | tesseract | rapidocr
    ocr_dpi: int = 300
    min_image_pt: float = 6.0  # skip decorative slivers thinner than this
    min_scanned_words: int = 4  # fewer native words than this + big image => scanned page
    background_min_words: int = 15  # body words that make a full-page image a mere scan backdrop
    furniture_fraction: float = 0.25  # share of pages a line must repeat on
    heading_ratio: float = 1.15  # font-size / body-size that makes a heading
    vector_figures: bool = True
    # Table detector tunables (points)
    gutter_min: float = 5.0
    rule_merge_tol: float = 3.0
    panel_coverage: float = 0.10
    extra: dict[str, object] = field(default_factory=dict)

    @property
    def effective_workers(self) -> int:
        if self.workers > 0:
            return self.workers
        return max(1, (os.cpu_count() or 2) - 1)
