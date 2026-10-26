"""Named Entity Recognition — regex/gazetteer (fast) + HF token classifier (deep).

Entities extracted: parties, dates, money, durations, jurisdictions, emails/URLs,
governing-law references. Both engines merge with span grounding.
"""
import re
from .hf_models import manager

DATE_RX = re.compile(
    r"\b(?:(?:January|February|March|April|May|June|July|August|September|October|November|December)"
    r"\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}"
    r"|(?:the )?\d{1,2}(?:st|nd|rd|th)? day of [A-Z][a-z]+,? \d{4})\b"
)
MONEY_RX = re.compile(
    r"(?:(?:USD|INR|EUR|GBP|AUD|SGD)\s?[\d,]+(?:\.\d{1,2})?|[$₹€£]\s?[\d,]+(?:\.\d{1,2})?"
    r"|\b[\d,]{4,}(?:\.\d{2})?\s?(?:USD|INR|EUR|GBP)\b)"
)
DURATION_RX = re.compile(
    r"\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty-four|thirty|sixty|ninety)"
    r"\s*(?:\(\d+\))?\s*[- ]?(?:day|week|month|year|hour)s?(?:'? notice| period| term|s)?\b",
    re.IGNORECASE,
)
EMAIL_RX = re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")
URL_RX = re.compile(r"\b(?:https?://|www\.)\S+\b")

JURISDICTIONS = [
    "India", "United States", "United Kingdom", "England and Wales", "Singapore",
    "Delaware", "California", "New York", "Texas", "Washington", "Maharashtra",
    "Karnataka", "Delhi", "Governing law of India", "State of California", "State of New York",
]
JURIS_RX = re.compile(r"\b(" + "|".join(re.escape(j) for j in sorted(JURISDICTIONS, key=len, reverse=True)) + r")\b")

PARTY_RX = re.compile(
    r"[\"“']?([A-Z][A-Za-z0-9&.\- ]{2,40}?(?:Inc\.|LLC|Ltd\.?|Limited|LLP|Corp\.?|Corporation|GmbH|Pvt\.?|Private Limited|Company))"
    r"[\"”']?"
    r"|(?:the\s+)?[\"“']?(Customer|Client|Provider|Supplier|Vendor|Licensor|Licensee|Employer|Employee|Consultant|"
    r"Contractor|Service Provider|Discloser|Recipient|Purchaser|Seller|Buyer|Company|Party A|Party B)[\"”']?"
)
ROLE_RX = re.compile(
    r"[\"“']([A-Z][^\"”']{2,60})[\"”']\s*(?:,\s*)?(?:a\s+)?(?:company|corporation|partnership|entity|individual)"
    r"(?:\s+incorporated under the laws of\s+([A-Za-z ,]+))?",
)

MONEY_LABELS = {"money", "monetary"}
DATE_LABELS = {"date", "time", "duration"}


def _fast_entities(text: str):
    found = []

    def add(label, value, start, extra=None):
        value = value.strip()
        if len(value) < 2:
            return
        found.append({
            "label": label,
            "value": value[:120],
            "char_start": start,
            "char_end": start + len(value),
            **({"detail": extra} if extra else {}),
        })

    seen_party = set()
    for m in PARTY_RX.finditer(text):
        name = m.group(1) or m.group(2)
        if not name:
            continue
        key = name.lower().strip()
        if key in seen_party:
            continue
        seen_party.add(key)
        add("PARTY", name, m.start())

    for m in ROLE_RX.finditer(text):
        add("PARTY", m.group(1), m.start(), extra=(m.group(2) or "").strip() or None)

    for m in DATE_RX.finditer(text):
        add("DATE", m.group(0), m.start())
    for m in MONEY_RX.finditer(text):
        add("MONEY", m.group(0), m.start())
    for m in DURATION_RX.finditer(text):
        add("DURATION", m.group(0), m.start())
    for m in JURIS_RX.finditer(text):
        add("JURISDICTION", m.group(1), m.start())
    for m in EMAIL_RX.finditer(text):
        add("CONTACT", m.group(0), m.start())
    for m in URL_RX.finditer(text):
        add("CONTACT", m.group(0), m.start())

    # governing law sentence -> LAW entity
    for m in re.finditer(r"governed by the laws of\s+([^.]{2,60})", text, re.IGNORECASE):
        add("JURISDICTION", m.group(1), m.start())

    found.sort(key=lambda e: (e["char_start"], e["label"]))
    return found


def _deep_entities(text: str, max_chars=4000):
    pipe = manager.get("ner")
    if pipe is None:
        return None
    try:
        import re as _re
        offset = 0
        out_entities = []
        chunk = text[:max_chars]
        preds = pipe(chunk)
        buf = None
        for p in preds:
            entity = p.get("entity") or p.get("entity_group") or ""
            top = entity.split("-")[-1]
            word = p["word"].replace("##", "").replace("Ġ", " ").strip()
            if not word:
                continue
            if top in ("O",) or top == "":
                continue
            if buf and buf["label"] == top and p.get("index", 0) == buf["next_index"]:
                buf["value"] += (" " if not word.startswith("'") else "") + word
                buf["next_index"] += 1
                buf["score_sum"] += float(p.get("score", 0.5))
                buf["n"] += 1
            else:
                if buf:
                    out_entities.append(buf)
                buf = {
                    "label": top, "value": word,
                    "char_start": offset + int(p.get("start", 0)),
                    "char_end": offset + int(p.get("end", 0)),
                    "score_sum": float(p.get("score", 0.5)), "n": 1,
                    "next_index": p.get("index", 0) + 1,
                }
        if buf:
            out_entities.append(buf)

        mapped = []
        label_map = {
            "PER": "PARTY", "ORG": "PARTY", "LOC": "JURISDICTION", "MISC": "CONCEPT",
            "DATE": "DATE", "MONEY": "MONEY",
        }
        for e in out_entities:
            mapped.append({
                "label": label_map.get(e["label"], e["label"].upper()),
                "value": e["value"][:120],
                "char_start": e["char_start"],
                "char_end": e["char_end"],
                "confidence": round(e["score_sum"] / e["n"], 3),
            })
        return mapped
    except Exception:
        return None


def extract_entities(text: str, engine: str = "auto"):
    fast = _fast_entities(text)
    deep = None
    # Deep NER is RAM-heavy — only on explicit 'deep' requests (budget-aware hybrid).
    if engine == "deep":
        deep = _deep_entities(text)

    merged = []
    seen = set()
    for ent in (deep or []) + fast:
        key = (ent["label"], ent["value"].lower())
        if key in seen:
            continue
        seen.add(key)
        merged.append(ent)

    by_type = {}
    for e in merged:
        by_type.setdefault(e["label"], []).append(e)
    for v in by_type.values():
        v.sort(key=lambda e: e["char_start"])

    return {
        "entities": merged,
        "by_type": by_type,
        "engine": "huggingface+fast" if deep else "fast-regex",
    }
