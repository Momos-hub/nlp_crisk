"""Clause classification — HF zero-shot (deep) with taxonomy scorer (fast)."""
import math
import re

from .taxonomy import CLAUSE_TYPES, ZEROSHOT_TEMPLATE
from .hf_models import manager

_WORD = re.compile(r"[a-z][a-z\-]+")


def _fast_scores(text: str, heading: str = ""): 
    words = _WORD.findall(text.lower())
    if not words:
        return {"general": 1.0}
    n = len(words)
    lower = text.lower()
    scores = {}
    for key, spec in CLAUSE_TYPES.items():
        weight_sum = 0.0
        for kw in spec["keywords"]:
            if " " in kw or "-" in kw:
                occurrences = lower.count(kw)
            else:
                # word-boundary match with short suffix tolerance ("provide" ~ "provided")
                occurrences = len(re.findall(r"\b" + re.escape(kw) + r"[a-z]{0,4}", lower))
            if occurrences:
                weight_sum += occurrences * (1.0 + min(len(kw.split()), 3) * 0.35)
                # keyword near the top of the clause is a stronger signal
                if lower.find(kw) < 120:
                    weight_sum += 1.2
        body_score = weight_sum / math.sqrt(n) if weight_sum else 0.0
        head_tokens = re.findall(r"[a-z0-9]+", heading.lower())
        heading_hits = []
        for kw in spec["keywords"]:
            needle = re.findall(r"[a-z0-9]+", kw.lower())
            if needle and any(head_tokens[i:i + len(needle)] == needle for i in range(len(head_tokens) - len(needle) + 1)):
                heading_hits.append(kw)
        heading_score = max((2.2 + min(len(kw.split()), 2) * 0.4 for kw in heading_hits), default=0.0)
        scores[key] = body_score + heading_score
    top = max(scores.values()) if scores else 0.0
    if top <= 0:
        return {"general": 1.0}
    # normalize to a pseudo-probability over the top-5
    ranked = sorted(scores.items(), key=lambda kv: -kv[1])[:5]
    denom = sum(math.exp(v * 3) for _, v in ranked) or 1.0
    return {k: round(math.exp(v * 3) / denom, 4) for k, v in ranked}


def classify_clause(text: str, engine: str = "auto", max_len: int = 1400, heading: str = ""):
    snippet = text[:max_len]
    fast = _fast_scores(snippet, heading=heading)
    fast_top = max(fast.items(), key=lambda kv: kv[1])

    deep_scores, deep_engine = None, None
    if engine in ("auto", "deep"):
        pipe = manager.get("zeroshot")
        if pipe is not None:
            try:
                # Candidate pruning: zero-shot only needs to disambiguate among the
                # most plausible types -> 2x fewer NLI passes. Short input -> 2x faster.
                keys = list(CLAUSE_TYPES.keys())
                prior = _fast_scores(snippet[:400], heading=heading)
                candidates = sorted(prior, key=lambda k: -prior[k])[:7]
                for k in ("general",):
                    if k not in candidates:
                        candidates.append(k)
                labels = [CLAUSE_TYPES[k]["label"] for k in candidates]
                out = pipe(
                    snippet[:340],
                    candidate_labels=labels,
                    hypothesis_template=ZEROSHOT_TEMPLATE,
                    multi_label=False,
                )
                pairs = list(zip(out["labels"], out["scores"]))
                # blend: keep top-6 zero-shot labels mapped back to keys
                deep_scores = {}
                label_to_key = {CLAUSE_TYPES[k]["label"]: k for k in keys}
                for lab, sc in pairs[:6]:
                    deep_scores[label_to_key[lab]] = round(float(sc), 4)
                deep_engine = "huggingface"
            except Exception:
                deep_scores = None

    if deep_scores:
        # ensemble: 0.6 * deep + 0.4 * fast (stability on legal phrasing)
        blended = {}
        for k in set(deep_scores) | set(fast):
            blended[k] = 0.6 * deep_scores.get(k, 0.0) + 0.4 * fast.get(k, 0.0)
        top_key = max(blended, key=blended.get)
        top_scores = dict(sorted(blended.items(), key=lambda kv: -kv[1])[:5])
        return {
            "type": top_key,
            "label": CLAUSE_TYPES[top_key]["label"],
            "confidence": round(blended[top_key], 4),
            "top_k": top_scores,
            "engine": deep_engine,
        }

    top_key, top_conf = fast_top
    return {
        "type": top_key,
        "label": CLAUSE_TYPES[top_key]["label"],
        "confidence": round(float(top_conf), 4),
        "top_k": fast,
        "engine": "fast-lexical",
    }
