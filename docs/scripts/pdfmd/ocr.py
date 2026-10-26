"""OCR fallback for scanned or image-only pages.

Engines
-------
* ``tesseract``  - pytesseract, used only if the Tesseract binary is installed
  (it is an external program; pip cannot install it).
* ``rapidocr``   - RapidOCR on ONNX Runtime: pure ``pip`` install, fully local,
  works on Windows with no external binaries.  This is the default fallback.

Scanned tables have no vector rules, so ruling lines are recovered from the
raster with OpenCV morphology and fed to the *same* table detector as native
pages.  OCR results are cached on disk so validation re-runs are cheap.
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pymupdf

from .config import ConvertConfig
from .models import RawPage, Rule, Word

_TESSERACT_PATHS = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
)


class EngineUnavailable(RuntimeError):
    pass


@dataclass
class OcrWord:
    text: str
    x0: float
    y0: float
    x1: float
    y1: float
    conf: float
    line: int


class TesseractEngine:
    name = "tesseract"

    def __init__(self) -> None:
        try:
            import pytesseract
        except ImportError as exc:
            raise EngineUnavailable("pytesseract is not installed") from exc
        cmd = os.environ.get("TESSERACT_CMD") or shutil.which("tesseract") or next(
            (p for p in _TESSERACT_PATHS if Path(p).is_file()), None
        )
        if not cmd:
            raise EngineUnavailable("Tesseract binary not found (set TESSERACT_CMD)")
        pytesseract.pytesseract.tesseract_cmd = cmd
        self._tess = pytesseract

    def recognize(self, rgb: np.ndarray) -> list[OcrWord]:
        data = self._tess.image_to_data(rgb, output_type=self._tess.Output.DICT)
        words: list[OcrWord] = []
        for i, text in enumerate(data["text"]):
            if not str(text).strip():
                continue
            conf = float(data["conf"][i])
            if conf < 0:
                continue
            line_id = int(data["block_num"][i]) * 10000 + int(data["par_num"][i]) * 100 + int(data["line_num"][i])
            x, y, w, h = (int(data[k][i]) for k in ("left", "top", "width", "height"))
            words.append(OcrWord(str(text).strip(), x, y, x + w, y + h, conf / 100.0, line_id))
        return words


class RapidOcrEngine:
    name = "rapidocr"

    def __init__(self) -> None:
        try:
            from rapidocr_onnxruntime import RapidOCR
        except ImportError as exc:
            raise EngineUnavailable("rapidocr-onnxruntime is not installed") from exc
        self._ocr = RapidOCR()

    def recognize(self, rgb: np.ndarray) -> list[OcrWord]:
        result, _ = self._ocr(rgb)
        words: list[OcrWord] = []
        for line_id, (box, text, score) in enumerate(result or []):
            xs = [p[0] for p in box]
            ys = [p[1] for p in box]
            x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
            tokens = str(text).split()
            if not tokens:
                continue
            total = sum(len(t) for t in tokens) + max(0, len(tokens) - 1)
            cursor = x0
            for tok in tokens:  # RapidOCR is line-level: spread words proportionally
                width = (x1 - x0) * len(tok) / total
                words.append(OcrWord(tok, cursor, y0, cursor + width, y1, float(score), line_id))
                cursor += (x1 - x0) * (len(tok) + 1) / total
        return words


_ENGINE_CACHE: dict[str, object] = {}


def get_engine(name: str) -> TesseractEngine | RapidOcrEngine:
    if name in _ENGINE_CACHE:
        return _ENGINE_CACHE[name]  # type: ignore[return-value]
    order = {"auto": ("tesseract", "rapidocr"), "tesseract": ("tesseract",), "rapidocr": ("rapidocr",)}[name]
    errors: list[str] = []
    for candidate in order:
        try:
            engine = TesseractEngine() if candidate == "tesseract" else RapidOcrEngine()
        except EngineUnavailable as exc:
            errors.append(f"{candidate}: {exc}")
            continue
        _ENGINE_CACHE[name] = engine
        return engine
    raise EngineUnavailable("; ".join(errors))


# --------------------------------------------------------------------------- rasters


def _page_array(page: pymupdf.Page, dpi: int) -> np.ndarray:
    pix = page.get_pixmap(dpi=dpi, alpha=False)
    return np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n).copy()


def raster_rules(rgb: np.ndarray, scale: float) -> list[Rule]:
    """Long horizontal/vertical strokes in a raster page, in points."""
    import cv2

    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY) if rgb.shape[2] >= 3 else rgb[:, :, 0]
    bw = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 15, 10)
    h, w = bw.shape
    rules: list[Rule] = []
    horiz = cv2.morphologyEx(bw, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (max(40, int(w * 0.04)), 1)))
    vert = cv2.morphologyEx(bw, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(40, int(h * 0.03)))))
    for mask, orient in ((horiz, "h"), (vert, "v")):
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in contours:
            x, y, cw, ch = cv2.boundingRect(c)
            if orient == "h":
                rules.append(Rule("h", (y + ch / 2) * scale, x * scale, (x + cw) * scale, ch * scale))
            else:
                rules.append(Rule("v", (x + cw / 2) * scale, y * scale, (y + ch) * scale, cw * scale))
    return rules


def _assign_blocks(words: list[Word]) -> None:
    """Group OCR lines into paragraphs (blocks) by vertical gap and horizontal overlap."""
    lines: dict[int, list[Word]] = {}
    for w in words:
        lines.setdefault(w.line, []).append(w)
    boxes = []
    for lid, ws in lines.items():
        boxes.append((lid, min(w.x0 for w in ws), min(w.y0 for w in ws), max(w.x1 for w in ws), max(w.y1 for w in ws)))
    boxes.sort(key=lambda b: (b[2], b[1]))
    block = -1
    prev = None
    for lid, x0, y0, x1, y1 in boxes:
        if prev is not None:
            _, px0, py0, px1, py1 = prev
            h = max(1.0, y1 - y0)
            overlap = min(x1, px1) - max(x0, px0)
            same = (y0 - py1) <= 0.9 * h and overlap >= 0.3 * min(x1 - x0, px1 - px0)
        else:
            same = False
        if not same:
            block += 1
        for w in lines[lid]:
            w.block = block
        prev = (lid, x0, y0, x1, y1)


def _cache_path(cfg: ConvertConfig, page_no: int, engine: str) -> Path:
    stat = cfg.pdf_path.stat()
    key = hashlib.sha1(f"{cfg.pdf_path.name}|{stat.st_size}|{stat.st_mtime_ns}".encode()).hexdigest()[:12]
    return cfg.log_dir / "ocr-cache" / key / f"p{page_no:04d}-{engine}-{cfg.ocr_dpi}.json"


def build_ocr_page(page: pymupdf.Page, cfg: ConvertConfig) -> RawPage:
    engine = get_engine(cfg.ocr_engine)
    scale = 72.0 / cfg.ocr_dpi
    page_no = page.number + 1
    rgb = _page_array(page, cfg.ocr_dpi)
    cache = _cache_path(cfg, page_no, engine.name)
    if cache.is_file():
        raw_words = [OcrWord(**d) for d in json.loads(cache.read_text(encoding="utf-8"))]
    else:
        raw_words = engine.recognize(rgb)
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(json.dumps([w.__dict__ for w in raw_words]), encoding="utf-8")

    words = [
        Word(
            w.text, w.x0 * scale, w.y0 * scale, w.x1 * scale, w.y1 * scale,
            size=round((w.y1 - w.y0) * scale * 0.85, 1), line=w.line, conf=w.conf,
        )
        for w in raw_words
    ]
    _assign_blocks(words)
    raw = RawPage(page_no, page.rect.width, page.rect.height, words, ocr_used=True)
    raw.rules = raster_rules(rgb, scale)
    low = [w for w in words if w.conf < 0.6]
    if words and len(low) > 0.2 * len(words):
        raw.warnings.append(f"page {page_no}: {len(low)}/{len(words)} OCR words below 60% confidence")
    return raw
