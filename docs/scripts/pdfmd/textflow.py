"""Word -> line -> run helpers shared by tables and the paragraph builder."""

from __future__ import annotations

import statistics

from .models import Line, Run, Word


def group_lines(words: list[Word]) -> list[list[Word]]:
    """Cluster words into visual lines (top to bottom, left to right)."""
    if not words:
        return []
    ordered = sorted(words, key=lambda w: (w.cy, w.x0))
    heights = [w.height for w in ordered if w.height > 0]
    tol = 0.6 * (statistics.median(heights) if heights else 8.0)
    lines: list[list[Word]] = []
    ref = None
    for w in ordered:
        if lines and ref is not None and abs(w.cy - ref) <= tol:
            lines[-1].append(w)
            ref = sum(x.cy for x in lines[-1]) / len(lines[-1])
        else:
            lines.append([w])
            ref = w.cy
    return [sorted(ln, key=lambda w: w.x0) for ln in lines]


def _style(w: Word) -> tuple[bool, bool, bool, bool, str | None, int | None]:
    return (w.bold, w.italic, w.mono, w.sup, w.uri, w.goto)


def _glue(prev: str, nxt: str, soft: bool) -> str | None:
    """Decide how two wrapped lines join. Returns '' / ' ' or '\\x00' to drop a hyphen."""
    if prev.endswith("-") and len(prev) > 1 and prev[-2] != " " and nxt[:1].isalnum():
        if soft and prev[:-1].isalpha() and nxt[:1].islower():
            return "\x00"  # soft hyphenation: "compres-" + "sion"
        return ""  # part-number style break: "AB06C-BOOM-050-" + "090"
    return " "


def join_words(words: list[Word], soft_dehyphenate: bool = False) -> list[Run]:
    """Merge words into styled runs, joining wrapped lines sensibly.

    Whitespace is stored at the *start* of a run so the Markdown writer can move
    it outside emphasis markers.
    """
    tokens: list[tuple[str, Word]] = []
    prev_word: Word | None = None
    for line in group_lines(words):
        for i, w in enumerate(line):
            if prev_word is None:
                sep = ""
            elif i == 0:
                glue = _glue(prev_word.text, w.text, soft_dehyphenate)
                if glue == "\x00":
                    tokens[-1] = (tokens[-1][0][:-1], tokens[-1][1])
                    sep = ""
                else:
                    sep = glue or ""
            else:
                # a superscript that touches the previous word stays attached ("out" + "1")
                sep = "" if (w.sup and prev_word is not None and abs(w.x0 - prev_word.x1) <= 1.0) else " "
            tokens.append((sep + w.text, w))
            prev_word = w

    runs: list[Run] = []
    last_style = None
    for text, w in tokens:
        style = _style(w)
        if runs and style == last_style:
            runs[-1].text += text
        else:
            runs.append(Run(text, w.bold, w.italic, w.mono, w.sup, w.uri, w.goto))
            last_style = style
    return runs


def plain_text(words: list[Word], soft_dehyphenate: bool = False) -> str:
    return "".join(r.text for r in join_words(words, soft_dehyphenate)).strip()


def lines_from_words(words: list[Word]) -> list[Line]:
    return [Line(ln) for ln in group_lines(words)]
