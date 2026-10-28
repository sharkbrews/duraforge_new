"""Document-level layout analysis: running furniture, reading order, structure.

Everything here works on :class:`PageContent` objects (no PDF access), so it is
identical for native and OCR pages and is cheap to unit-test.
"""

from __future__ import annotations

import math
import re
import statistics
from collections import Counter, defaultdict
from dataclasses import dataclass, field

from .config import ConvertConfig
from .models import (
    BBox,
    Element,
    ImageRef,
    Line,
    PageContent,
    Run,
    Shade,
    Table,
    TextBlock,
    Word,
    union_bbox,
)
from .textflow import join_words

# --------------------------------------------------------------------------- furniture


def norm_key(text: str) -> str:
    return re.sub(r"\d+", "#", " ".join(text.split()))


@dataclass
class FurnitureEntry:
    role: str  # header | footer | pagenum
    text: str
    bbox: BBox
    size: float
    pages: int


@dataclass
class FurnitureModel:
    entries: dict[tuple[str, str, int], FurnitureEntry] = field(default_factory=dict)

    def match(self, zone: str, line: Line) -> FurnitureEntry | None:
        key = (zone, norm_key(line.text), round(line.bbox[1] / 3))
        return self.entries.get(key)


def _zone(line: Line, height: float) -> str | None:
    cy = (line.bbox[1] + line.bbox[3]) / 2
    if cy < 0.12 * height:
        return "top"
    if cy > 0.88 * height:
        return "bottom"
    return None


def detect_furniture(pages: list[PageContent], cfg: ConvertConfig) -> FurnitureModel:
    """Find lines that repeat in the top/bottom margin on many pages."""
    seen: dict[tuple[str, str, int], list[tuple[str, BBox, float]]] = defaultdict(list)
    for pc in pages:
        for block in pc.blocks:
            for line in block.lines:
                zone = _zone(line, pc.height)
                if zone is None:
                    continue
                key = (zone, norm_key(line.text), round(line.bbox[1] / 3))
                seen[key].append((line.text, line.bbox, line.size))
    total = max(1, len(pages))
    need = max(3, math.ceil(cfg.furniture_fraction * total)) if total >= 3 else total + 1
    model = FurnitureModel()
    for key, hits in seen.items():
        if len(hits) < need:
            continue
        zone, norm, _ = key
        role = "pagenum" if norm == "#" else ("header" if zone == "top" else "footer")
        text = Counter(h[0] for h in hits).most_common(1)[0][0]
        boxes = [h[1] for h in hits]
        bbox = tuple(statistics.median(b[i] for b in boxes) for i in range(4))
        model.entries[key] = FurnitureEntry(role, text, bbox, statistics.median(h[2] for h in hits), len(hits))  # type: ignore[arg-type]
    return model


def strip_furniture(
    pc: PageContent, model: FurnitureModel
) -> tuple[list[TextBlock], list[str], str, list[BBox]]:
    """Remove furniture lines; returns (blocks, roles present, page label, furniture bboxes)."""
    kept: list[TextBlock] = []
    roles: list[str] = []
    label = ""
    boxes: list[BBox] = []
    for block in pc.blocks:
        lines = []
        for line in block.lines:
            zone = _zone(line, pc.height)
            entry = model.match(zone, line) if zone else None
            if entry is None:
                lines.append(line)
                continue
            boxes.append(line.bbox)
            if entry.role not in roles:
                roles.append(entry.role)
            if entry.role == "pagenum":
                label = line.text.strip()
        if lines:
            kept.append(TextBlock(lines, block.page))
    return kept, roles, label, boxes


# --------------------------------------------------------------------------- statistics


@dataclass
class DocStats:
    body_size: float = 10.0
    heading_tiers: list[float] = field(default_factory=list)  # descending sizes
    toc: dict[str, int] = field(default_factory=dict)


def normalize_title(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


_NUMBERED = re.compile(r"^\d+(\.\d+)*[.)]?\s+\S")


def _is_heading_shape(block: TextBlock) -> bool:
    return len(block.lines) <= 4 and len(block.text) <= 200


def compute_stats(blocks_by_page: list[list[TextBlock]], toc: list[tuple[int, str]], cfg: ConvertConfig) -> DocStats:
    weights: Counter[float] = Counter()
    for blocks in blocks_by_page:
        for b in blocks:
            for ln in b.lines:
                for w in ln.words:
                    weights[round(w.size * 2) / 2] += len(w.text)
    stats = DocStats()
    if weights:
        stats.body_size = weights.most_common(1)[0][0]
    candidates: Counter[float] = Counter()
    for blocks in blocks_by_page:
        for b in blocks:
            if _is_heading_shape(b) and b.size >= cfg.heading_ratio * stats.body_size:
                candidates[round(b.size * 2) / 2] += 1
    tiers: list[float] = []
    for size in sorted(candidates, reverse=True):
        if not tiers or tiers[-1] - size > 0.75:
            tiers.append(size)
    stats.heading_tiers = tiers[:6]
    stats.toc = {normalize_title(t): lvl for lvl, t in toc}
    return stats


# --------------------------------------------------------------------------- reading order

_MIN_GUTTER = 6.0


def _cut(nodes: list[tuple[BBox, object]]) -> list[tuple[BBox, object]]:
    if len(nodes) <= 1:
        return nodes
    vertical = _vertical_split(nodes)
    if vertical:
        return _cut(vertical[0]) + _cut(vertical[1])
    horizontal = _horizontal_split(nodes)
    if horizontal:
        return _cut(horizontal[0]) + _cut(horizontal[1])
    return sorted(nodes, key=lambda n: (round(n[0][1] / 3), n[0][0]))


def _horizontal_split(nodes):  # type: ignore[no-untyped-def]
    ordered = sorted(nodes, key=lambda n: (n[0][1], n[0][0]))
    max_y1 = ordered[0][0][3]
    for i in range(1, len(ordered)):
        if ordered[i][0][1] >= max_y1 - 0.5:
            return ordered[:i], ordered[i:]
        max_y1 = max(max_y1, ordered[i][0][3])
    return None


def _vertical_split(nodes):  # type: ignore[no-untyped-def]
    ordered = sorted(nodes, key=lambda n: (n[0][0], n[0][1]))
    total_h = max(n[0][3] for n in nodes) - min(n[0][1] for n in nodes)
    max_x1 = ordered[0][0][2]
    for i in range(1, len(ordered)):
        if ordered[i][0][0] >= max_x1 + _MIN_GUTTER:
            left, right = ordered[:i], ordered[i:]
            lh = max(n[0][3] for n in left) - min(n[0][1] for n in left)
            rh = max(n[0][3] for n in right) - min(n[0][1] for n in right)
            if total_h > 0 and lh >= 0.3 * total_h and rh >= 0.3 * total_h:
                return left, right
        max_x1 = max(max_x1, ordered[i][0][2])
    return None


def reading_order(nodes: list[tuple[BBox, object]]) -> list[object]:
    return [payload for _, payload in _cut(nodes)]


# --------------------------------------------------------------------------- classification

_BULLETS = set("•●○◦▪■□▫‣⁃∙·–—*-")
_ORDERED = re.compile(r"^(\d{1,3}[.)]|\(\d{1,3}\)|\(?[a-zA-Z]\))$")
_LEADER = re.compile(r"^(?P<title>.*?\S)\s*(?:[-–—._·…]\s?){4,}\s*(?P<page>[0-9]{1,5}|[ivxlcdm]{1,6})$")
_FOOT_MARK = re.compile(r"^(\d{1,2}|[*†‡§])[.)]?$")


def _runs_from_words(words: list[Word], soft: bool = True) -> list[Run]:
    return join_words(words, soft)


def _line_marker(line: Line) -> tuple[bool, str, int]:
    """Return (is_item, marker, words_to_skip)."""
    first = line.words[0]
    rest = len(line.words) > 1
    if first.text in _BULLETS and rest:
        return True, "-", 1
    if first.text[:1] in _BULLETS and len(first.text) > 1 and first.text[0] in "•●○◦▪■□▫‣⁃∙":
        return True, "-", 0  # glyph glued to text; stripped later
    if _ORDERED.match(first.text) and rest:
        return True, first.text, 1
    return False, "", 0


def _leader_runs(line: Line) -> Run | None:
    m = _LEADER.match(line.text)
    if not m:
        return None
    return Run(f"{m.group('title')} ...... {m.group('page')}")


@dataclass
class _PageCtx:
    page_no: int
    height: float
    body_size: float
    sup_labels: set[str]
    foot_counter: int = 0
    foot_ids: dict[str, str] = field(default_factory=dict)


def _heading_level(block: TextBlock, stats: DocStats, cfg: ConvertConfig) -> int:
    if not _is_heading_shape(block):
        return 0
    key = normalize_title(block.text)
    size = round(block.size * 2) / 2
    if size >= cfg.heading_ratio * stats.body_size and stats.heading_tiers:
        for i, tier in enumerate(stats.heading_tiers):
            if abs(size - tier) <= 0.75:
                return i + 1
        return len(stats.heading_tiers)
    if key in stats.toc:  # PDF outline decides only when typography gives no evidence
        return min(6, stats.toc[key])
    words = block.words
    if len(block.lines) == 1 and words and all(w.bold for w in words) and _NUMBERED.match(block.text) and len(words) <= 14:
        depth = block.words[0].text.rstrip(".)").count(".") + 1
        return min(6, depth + 1)
    return 0


def _classify_block(block: TextBlock, stats: DocStats, cfg: ConvertConfig, ctx: _PageCtx) -> list[Element]:
    bbox = block.bbox
    lines = block.lines

    # 1. table-of-contents leader lines
    leaders = [_leader_runs(ln) for ln in lines]
    if all(leaders):
        return [Element("leader", bbox, lines=[[r] for r in leaders if r])]  # type: ignore[misc]

    # 2. headings (whole block)
    level = _heading_level(block, stats, cfg)
    if level:
        return [Element("heading", bbox, level=level, runs=_plain_heading_runs(block))]

    # 3. code blocks
    words = block.words
    if words and all(w.mono for w in words) and (len(lines) >= 2 or len(block.text) >= 40):
        base = min(ln.bbox[0] for ln in lines)
        char_w = max(1.0, statistics.median((w.x1 - w.x0) / max(1, len(w.text)) for w in words))
        code_lines = [[Run(" " * int(round((ln.bbox[0] - base) / char_w)) + ln.text)] for ln in lines]
        return [Element("code", bbox, lines=code_lines)]

    # 4. footnote definitions
    if bbox[1] > 0.6 * ctx.height and block.size <= 0.92 * ctx.body_size:
        mark = lines[0].words[0]
        if _FOOT_MARK.match(mark.text) and (mark.sup or mark.text in ctx.sup_labels) and mark.text.strip("[.)]") in ctx.sup_labels:
            label = mark.text.strip(".)")
            fid = ctx.foot_ids.setdefault(label, f"p{ctx.page_no:03d}-{label}")
            rest = [w for w in words if w is not mark]
            return [Element("footnote", bbox, runs=_runs_from_words(rest), label=fid)]

    # 5. lists (a block may hold several items and wrapped continuations)
    items: list[Element] = []
    current: Element | None = None
    current_words: list[Word] = []
    pre: list[Word] = []

    def flush() -> None:
        nonlocal current, current_words
        if current is not None:
            current.runs = _runs_from_words(current_words)
            items.append(current)
        current, current_words = None, []

    saw_item = False
    for ln in lines:
        is_item, marker, skip = _line_marker(ln)
        if is_item:
            saw_item = True
            flush()
            ws = ln.words[skip:]
            if skip == 0:
                ws = [Word(**{**_word_fields(ln.words[0]), "text": ln.words[0].text[1:]}), *ln.words[1:]]
            current = Element("list_item", ln.bbox, ordered=marker != "-", marker=marker)
            current_words = list(ws)
        elif current is not None:
            current_words.extend(ln.words)
            current.bbox = union_bbox([current.bbox, ln.bbox])
        else:
            pre.extend(ln.words)
    flush()
    if saw_item:
        out: list[Element] = []
        if pre:
            out.append(Element("paragraph", bbox, runs=_runs_from_words(pre)))
        return out + items

    # 6. plain paragraph; superscript footnote references become [^id]
    runs = _runs_from_words(words)
    for run in runs:
        label = run.text.strip()
        if run.sup and label in ctx.sup_labels:
            fid = ctx.foot_ids.setdefault(label, f"p{ctx.page_no:03d}-{label}")
            run.uri = f"footnote:{fid}"
            run.sup = False
            run.text = " " * (len(run.text) - len(run.text.lstrip())) + label
    return [Element("paragraph", bbox, runs=runs)]


def _word_fields(w: Word) -> dict[str, object]:
    return {
        "text": w.text, "x0": w.x0, "y0": w.y0, "x1": w.x1, "y1": w.y1, "size": w.size, "bold": w.bold,
        "italic": w.italic, "mono": w.mono, "sup": w.sup, "uri": w.uri, "goto": w.goto,
        "block": w.block, "line": w.line, "conf": w.conf,
    }


def _plain_heading_runs(block: TextBlock) -> list[Run]:
    """Headings are already emphasised by level; drop bold so we don't emit ``# **x**``."""
    runs = _runs_from_words(block.words)
    for r in runs:
        r.bold = False
    return runs


def _inside(inner: BBox, outer: BBox, frac: float = 0.9) -> bool:
    ix0, iy0 = max(inner[0], outer[0]), max(inner[1], outer[1])
    ix1, iy1 = min(inner[2], outer[2]), min(inner[3], outer[3])
    area = max(0.0, ix1 - ix0) * max(0.0, iy1 - iy0)
    total = max(1e-6, (inner[2] - inner[0]) * (inner[3] - inner[1]))
    return area / total >= frac


def classify_page(
    pc: PageContent,
    blocks: list[TextBlock],
    stats: DocStats,
    cfg: ConvertConfig,
) -> list[Element]:
    # References live in body text; small blocks near the page foot are candidate definitions.
    sup_labels = {
        w.text
        for b in blocks
        if not (b.bbox[1] > 0.6 * pc.height and b.size <= 0.92 * stats.body_size)
        for w in b.words
        if w.sup and _FOOT_MARK.match(w.text)
    }
    ctx =  _PageCtx(pc.page_no, pc.height, stats.body_size, sup_labels)

    # call-outs: shaded boxes that enclose text blocks
    callouts: list[tuple[Shade, list[TextBlock]]] = []
    consumed: set[int] = set()
    for shade in pc.shades:
        w, h = shade.bbox[2] - shade.bbox[0], shade.bbox[3] - shade.bbox[1]
        if w < 40 or h < 12 or w * h > 0.8 * pc.width * pc.height:
            continue
        inside = [i for i, b in enumerate(blocks) if i not in consumed and _inside(b.bbox, shade.bbox)]
        if inside:
            consumed.update(inside)
            callouts.append((shade, [blocks[i] for i in inside]))

    nodes: list[tuple[BBox, object]] = []
    for i, b in enumerate(blocks):
        if i not in consumed:
            nodes.append((b.bbox, b))
    nodes += [(t.bbox, t) for t in pc.tables]
    nodes += [(im.bbox, im) for im in pc.images]
    nodes += [(s.bbox, (s, bs)) for s, bs in callouts]

    elements: list[Element] = []
    for payload in reading_order(nodes):
        if isinstance(payload, TextBlock):
            elements.extend(_classify_block(payload, stats, cfg, ctx))
        elif isinstance(payload, Table):
            elements.append(Element("table", payload.bbox, table=payload))
        elif isinstance(payload, ImageRef):
            elements.append(Element("image", payload.bbox, image=payload))
        else:
            shade, bs = payload  # type: ignore[misc]
            children: list[Element] = []
            for b in sorted(bs, key=lambda b: (b.bbox[1], b.bbox[0])):
                children.extend(_classify_block(b, stats, cfg, ctx))
            elements.append(Element("callout", shade.bbox, children=children))
    return _merge_wrapped_headings(elements)


def _merge_wrapped_headings(elements: list[Element]) -> list[Element]:
    """A heading wrapped over several PDF text blocks is still one heading."""
    merged: list[Element] = []
    for el in elements:
        prev = merged[-1] if merged else None
        if (
            prev is not None
            and prev.kind == "heading"
            and el.kind == "heading"
            and prev.level == el.level
            and -1.0 <= el.bbox[1] - prev.bbox[3] <= 0.8 * (el.bbox[3] - el.bbox[1])
        ):
            prev.runs = [*prev.runs, Run(" "), *el.runs]
            prev.bbox = union_bbox([prev.bbox, el.bbox])
        else:
            merged.append(el)
    return merged
