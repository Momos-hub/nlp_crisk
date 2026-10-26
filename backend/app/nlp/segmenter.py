"""Clause segmenter — turns raw contract text into clause units.

Strategy (robust across contract styles):
  1. Numbered headings   -> "1.", "1.2", "Section 4", "ARTICLE III"
  2. ALL-CAPS / Title-case heading lines followed by body text
  3. Fallback: paragraph splitter + sentence-window grouping
Clause objects carry absolute character offsets so every downstream finding
can be grounded back to the original document.
"""
import re
from dataclasses import dataclass, field, asdict

_NUMBERED = re.compile(
    r"^\s*(?:(?:section|article|clause|paragraph)\s+)?"
    r"(?P<num>\d{1,2}(?:\.\d{1,2})*|[IVXLC]{1,6}|\([a-z]\)|[a-z]\))"
    r"[\.\:\)]?\s+(?P<title>[A-Z][^\n]{2,90})$",
    re.MULTILINE,
)
_ALLCAPS = re.compile(r"^\s*(?P<title>[A-Z][A-Z0-9 ,\-&/()']{3,70})\.?\s*$", re.MULTILINE)
_SENTENCE = re.compile(r"(?<=[.!?])\s+(?=[A-Z\"“(\[])")


@dataclass
class Clause:
    id: str
    index: int
    heading: str
    text: str
    char_start: int
    char_end: int
    word_count: int = 0
    sentences: list = field(default_factory=list)

    def to_dict(self):
        return asdict(self)


def _split_sentences(text: str):
    parts = _SENTENCE.split(text.strip())
    return [p.strip() for p in parts if p.strip()]


def _normalize(raw: str) -> str:
    text = raw.replace("\r\n", "\n").replace("\r", "\n").replace("\u00a0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _heading_matches(text: str):
    """Collect candidate headings with positions; prefer numbered, then caps."""
    matches = []
    for rx, kind in ((_NUMBERED, "numbered"), (_ALLCAPS, "caps")):
        for m in rx.finditer(text):
            title = (m.groupdict().get("title") or "").strip()
            if not title or len(title.split()) > 14:
                continue
            # caps headings must not be a sentence in disguise
            if kind == "caps" and title.endswith((".", ",", ";")) and len(title.split()) > 6:
                continue
            matches.append({"pos": m.start(), "end": m.end(), "title": title, "kind": kind})
    # dedupe overlapping: keep earliest per position bucket
    matches.sort(key=lambda x: x["pos"])
    cleaned, last_end = [], -1
    for m in matches:
        if m["pos"] >= last_end:
            cleaned.append(m)
            last_end = m["end"]
    return cleaned


def segment_document(raw: str):
    text = _normalize(raw)
    if not text:
        return [], text

    heads = _heading_matches(text)
    clauses = []

    if len(heads) >= 3:
        # preamble before first heading becomes an intro clause
        if heads[0]["pos"] > 60:
            pre = text[: heads[0]["pos"]].strip()
            if pre:
                clauses.append(_make_clause(0, "Preamble", pre, text))
        for i, h in enumerate(heads):
            body_start = h["end"]
            body_end = heads[i + 1]["pos"] if i + 1 < len(heads) else len(text)
            body = text[body_start:body_end].strip()
            # include heading line itself in the clause text for context
            clause_text = text[h["pos"]:body_end].strip()
            if len(body.split()) >= 3 or len(clause_text.split()) >= 4:
                clauses.append(_make_clause(len(clauses), h["title"], clause_text, text))
    else:
        # paragraph mode
        spans = _paragraph_spans(text)
        if len(spans) < 3:
            spans = _sentence_windows(text, max_words=90)
        for i, (s, e, head) in enumerate(spans):
            clause_text = text[s:e].strip()
            if len(clause_text.split()) < 3:
                continue
            clauses.append(_make_clause(len(clauses), head, clause_text, text))

    # attach sentences + offsets correction (clause_text may have been stripped)
    for c in clauses:
        c.sentences = _split_sentences(c.text)
        c.word_count = len(c.text.split())
    return [c.to_dict() for c in clauses], text


def _make_clause(idx: int, heading: str, clause_text: str, full_text: str) -> Clause:
    pos = full_text.find(clause_text[: min(80, len(clause_text))])
    if pos < 0:
        pos = 0
    return Clause(
        id=f"C{idx + 1:03d}",
        index=idx,
        heading=(heading or f"Clause {idx + 1}")[:90],
        text=clause_text,
        char_start=pos,
        char_end=pos + len(clause_text),
    )


def _paragraph_spans(text: str):
    spans, pos = [], 0
    for block in re.split(r"\n\s*\n", text):
        start = text.find(block, pos)
        if start < 0:
            continue
        end = start + len(block)
        pos = end
        first_line = block.strip().split("\n")[0].strip()
        heading = first_line[:70] if len(first_line) < 70 and not first_line.endswith(".") else ""
        spans.append((start, end, heading or _auto_heading(block)))
    return spans


def _sentence_windows(text: str, max_words=90):
    sents = _split_sentences(text)
    windows, buf, start_pos, cur = [], [], 0, 0
    for s in sents:
        buf.append(s)
        if sum(len(x.split()) for x in buf) >= max_words:
            chunk = " ".join(buf)
            pos = text.find(chunk[:60], cur)
            pos = pos if pos >= 0 else cur
            windows.append((pos, pos + len(chunk), _auto_heading(chunk)))
            cur = pos + len(chunk)
            buf = []
    if buf:
        chunk = " ".join(buf)
        pos = text.find(chunk[:60], cur)
        pos = pos if pos >= 0 else cur
        windows.append((pos, pos + len(chunk), _auto_heading(chunk)))
    return windows


def _auto_heading(chunk: str):
    words = chunk.strip().split()
    return " ".join(words[:8]) + ("…" if len(words) > 8 else "")
