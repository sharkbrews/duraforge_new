"""Plain, picklable data containers shared by every stage.

All geometry is in PDF points, origin top-left, y growing downwards (the
PyMuPDF convention), so the same numbers work for native and OCR pages.
"""

from __future__ import annotations

from dataclasses import dataclass, field

BBox = tuple[float, float, float, float]


def union_bbox(boxes: list[BBox]) -> BBox:
    return (
        min(b[0] for b in boxes),
        min(b[1] for b in boxes),
        max(b[2] for b in boxes),
        max(b[3] for b in boxes),
    )


@dataclass(slots=True)
class Word:
    text: str
    x0: float
    y0: float
    x1: float
    y1: float
    size: float = 0.0
    bold: bool = False
    italic: bool = False
    mono: bool = False
    sup: bool = False
    uri: str | None = None
    goto: int | None = None  # 0-based target page of an internal link
    block: int = 0
    line: int = 0
    conf: float = 1.0

    @property
    def bbox(self) -> BBox:
        return (self.x0, self.y0, self.x1, self.y1)

    @property
    def cx(self) -> float:
        return (self.x0 + self.x1) / 2

    @property
    def cy(self) -> float:
        return (self.y0 + self.y1) / 2

    @property
    def height(self) -> float:
        return self.y1 - self.y0


@dataclass(slots=True)
class Rule:
    """A horizontal ('h') or vertical ('v') ruling line segment."""

    orient: str
    pos: float  # y for 'h', x for 'v'
    start: float
    end: float
    width: float = 0.0

    @property
    def length(self) -> float:
        return self.end - self.start


@dataclass(slots=True)
class Shade:
    """A filled, non-black, non-hairline rectangle (banner rows, call-out backgrounds)."""

    bbox: BBox
    level: float  # luminance 0..1


@dataclass(slots=True)
class ImageRef:
    page: int
    bbox: BBox
    file: str  # file name inside the images directory
    width_px: int
    height_px: int
    kind: str = "raster"  # raster | vector
    sha1: str = ""
    words_inside: list[str] = field(default_factory=list)  # text swallowed by a vector figure


@dataclass(slots=True)
class Run:
    text: str
    bold: bool = False
    italic: bool = False
    mono: bool = False
    sup: bool = False
    uri: str | None = None
    goto: int | None = None


@dataclass(slots=True)
class Cell:
    row: int
    col: int
    rowspan: int = 1
    colspan: int = 1
    runs: list[Run] = field(default_factory=list)
    is_header: bool = False
    is_banner: bool = False

    @property
    def text(self) -> str:
        return "".join(r.text for r in self.runs)


@dataclass(slots=True)
class Table:
    page: int
    index: int
    bbox: BBox
    n_rows: int
    n_cols: int
    header_rows: int
    cells: list[Cell]
    col_bounds: list[float]  # absolute x of column edges, len == n_cols + 1
    panel: int = 1
    panels: int = 1
    detector: str = "rules"

    @property
    def table_id(self) -> str:
        return f"p{self.page:03d}.t{self.index}"

    def rows(self) -> list[list[Cell]]:
        grid: list[list[Cell]] = [[] for _ in range(self.n_rows)]
        for cell in sorted(self.cells, key=lambda c: (c.row, c.col)):
            grid[cell.row].append(cell)
        return grid


@dataclass(slots=True)
class Line:
    words: list[Word]

    @property
    def text(self) -> str:
        return " ".join(w.text for w in self.words)

    @property
    def bbox(self) -> BBox:
        return union_bbox([w.bbox for w in self.words])

    @property
    def size(self) -> float:
        return max(w.size for w in self.words)


@dataclass(slots=True)
class TextBlock:
    lines: list[Line]
    page: int = 0

    @property
    def bbox(self) -> BBox:
        return union_bbox([ln.bbox for ln in self.lines])

    @property
    def words(self) -> list[Word]:
        return [w for ln in self.lines for w in ln.words]

    @property
    def text(self) -> str:
        return " ".join(ln.text for ln in self.lines)

    @property
    def size(self) -> float:
        return max(ln.size for ln in self.lines)


@dataclass(slots=True)
class RawPage:
    """Everything primitive we can read from one page, native or OCR."""

    page_no: int  # 1-based
    width: float
    height: float
    words: list[Word] = field(default_factory=list)
    rules: list[Rule] = field(default_factory=list)
    shades: list[Shade] = field(default_factory=list)
    other_drawings: list[BBox] = field(default_factory=list)  # curves/complex paths
    ocr_used: bool = False
    warnings: list[str] = field(default_factory=list)


@dataclass(slots=True)
class PageContent:
    """Worker output for one page: structure-free extraction results."""

    page_no: int
    width: float
    height: float
    blocks: list[TextBlock]
    tables: list[Table]
    images: list[ImageRef]
    shades: list[Shade]  # shades NOT inside a table (call-out candidates)
    ocr_used: bool = False
    n_words: int = 0
    warnings: list[str] = field(default_factory=list)
    error: str | None = None
    seconds: float = 0.0


# --- Document structure produced by the layout analysis -----------------------


@dataclass(slots=True)
class Element:
    """One Markdown-level element in reading order."""

    kind: str  # heading|paragraph|list_item|code|callout|table|image|leader|footnote
    bbox: BBox
    level: int = 0
    runs: list[Run] = field(default_factory=list)
    lines: list[list[Run]] = field(default_factory=list)  # leader/code lines
    ordered: bool = False
    marker: str = ""
    table: Table | None = None
    image: ImageRef | None = None
    children: list["Element"] = field(default_factory=list)  # callout contents
    label: str = ""  # footnote label


@dataclass(slots=True)
class PageLayout:
    page_no: int
    width: float
    height: float
    elements: list[Element]
    label: str = ""  # printed page number
    furniture: list[str] = field(default_factory=list)  # roles present on this page
    box: BBox = (0.0, 0.0, 0.0, 0.0)  # union of all content incl. furniture
    body: BBox = (0.0, 0.0, 0.0, 0.0)  # union of body content
    ocr_used: bool = False
