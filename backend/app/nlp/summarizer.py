"""Summarization — frequency+position extractive (fast) / DistilBART (deep)."""
import math
import re

from .hf_models import manager

_SENT = re.compile(r"(?<=[.!?])\s+(?=[A-Z\"“(\[])")
_STOP = set("""a an the and or but if while of to in on at by for with from as is are was were be been
being this that these those it its their there which who whom whose than then so such may might shall
should will would can could not no nor than too very just about into over under again further here
all any each only own same s t don now""".split())


def _sentences(text: str):
    return [s.strip() for s in _SENT.split(text) if len(s.strip().split()) >= 5]


def _fast_summary(text: str, max_sents=4):
    sents = _sentences(text)
    if not sents:
        return text[:400], []
    freq = {}
    for w in re.findall(r"[a-z][a-z\-']+", text.lower()):
        if w not in _STOP and len(w) > 2:
            freq[w] = freq.get(w, 0) + 1
    if not freq:
        return " ".join(sents[:max_sents])[:800], list(range(min(max_sents, len(sents))))
    max_f = max(freq.values())

    scored = []
    for i, s in enumerate(sents):
        words = [w for w in re.findall(r"[a-z][a-z\-']+", s.lower()) if w not in _STOP]
        if not words:
            continue
        score = sum(freq.get(w, 0) / max_f for w in words) / math.sqrt(len(words))
        if i == 0:
            score *= 1.45  # opening sentence usually states the deal
        if i == len(sents) - 1:
            score *= 1.1
        if re.search(r"\b(shall|must|agrees|indemnif|terminat|liabilit|fees|confidential)\b", s, re.I):
            score *= 1.2
        scored.append((score, i, s))
    ranked = sorted(scored, key=lambda x: -x[0])[:max_sents]
    ranked.sort(key=lambda x: x[1])  # keep document order
    summary = " ".join(s for _, _, s in ranked)
    return summary[:1200], [i for _, i, _ in ranked]


def _deep_summary(text: str):
    pipe = manager.get("summarizer")
    if pipe is None:
        return None
    try:
        src = text[:5000]
        words = len(src.split())
        max_len = min(180, max(60, words // 3))
        min_len = min(60, max(25, words // 8))
        out = pipe(src, max_length=max_len, min_length=min_len, do_sample=False)
        return out[0]["summary_text"].strip()
    except Exception:
        return None


def summarize(text: str, engine: str = "auto", max_sents=4):
    abstract = None
    used = "fast-extractive"
    # DistilBART is RAM-heavy — only on explicit 'deep' requests (budget-aware hybrid).
    if engine == "deep":
        abstract = _deep_summary(text)
        if abstract:
            used = "huggingface-distilbart"
    extractive, _idxs = _fast_summary(text, max_sents=max_sents)

    if abstract:
        return {
            "abstract": abstract,
            "key_sentences": extractive,
            "engine": used,
        }
    return {
        "abstract": extractive,
        "key_sentences": extractive,
        "engine": "fast-extractive",
    }
