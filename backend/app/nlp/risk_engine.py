"""Risk engine — transparent weighted scoring over the pattern lexicon.

clause_risk = Σ(severity_points × weight_norm) + type_base + imbalance + ambiguity
doc_risk    = length-weighted clause risk, inflated by protective-clause gaps
"""
import re
from .lexicon import RISK_PATTERNS, SEVERITY_POINTS, BUCKETS
from .taxonomy import PROTECTIVE_CLAUSES, CLAUSE_TYPES

SEVERITY_BANDS = [(75, "CRITICAL"), (50, "HIGH"), (25, "MEDIUM"), (0, "LOW")]

# A finding of severity S pins its clause to at least the numeric floor of band S.
SEVERITY_FLOOR = {"LOW": 8, "MEDIUM": 25, "HIGH": 50, "CRITICAL": 75}
_RANK = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}

OBLIGATION_RX = re.compile(
    r"\b(shall|must|will|is obligated to|is responsible for|agrees to|undertakes to)\b",
    re.IGNORECASE,
)
PARTY_HINT_RX = re.compile(
    r"\b(Customer|Client|Provider|Supplier|Vendor|Licensor|Licensee|Employer|Employee|"
    r"Consultant|Contractor|Company|Service Provider|Purchaser|Seller|Buyer|Discloser|Recipient|"
    r"Party A|Party B|the Provider|the Customer|Provider|Customer)\b"
)
AMBIGUITY_IDS = {p["id"] for p in RISK_PATTERNS if p["bucket"] == "ambiguity"}


def severity_for(score: float) -> str:
    for cutoff, label in SEVERITY_BANDS:
        if score >= cutoff:
            return label
    return "LOW"


def analyze_clause(clause: dict, clause_type_key: str, full_text: str = "") -> dict:
    text = clause["text"]
    findings = []
    raw_points = 0.0
    seen = set()

    for pat in RISK_PATTERNS:
        for m in pat["regex"].finditer(text):
            key = (pat["id"], m.start() // 120)  # collapse repeats within a window
            if key in seen:
                continue
            seen.add(key)
            pts = SEVERITY_POINTS[pat["severity"]] * (pat["weight"] / 5.0)
            raw_points += pts
            findings.append({
                "pattern_id": pat["id"],
                "bucket": pat["bucket"],
                "bucket_label": BUCKETS[pat["bucket"]],
                "severity": pat["severity"],
                "points": round(pts, 1),
                "evidence": m.group(0)[:180],
                "char_start": clause["char_start"] + m.start(),
                "char_end": clause["char_start"] + min(m.end(), m.start() + 180),
                "local_start": m.start(),
                "local_end": min(m.end(), m.start() + 180),
                "rationale": pat["rationale"],
                "suggestion": pat["suggestion"],
            })

    imbalance, imbalance_note = _one_sidedness(text)
    amb = sum(1 for f in findings if f["pattern_id"] in AMBIGUITY_IDS)
    base = CLAUSE_TYPES.get(clause_type_key, {}).get("base_risk", 3)

    length_penalty = 2 if len(text.split()) > 220 else 0
    score = raw_points + base + imbalance + length_penalty
    raw_before_floor = score

    # severity floors: worst finding pins the clause to its band floor
    worst_finding = None
    for f in findings:
        if worst_finding is None or _RANK[f["severity"]] > _RANK[worst_finding]:
            worst_finding = f["severity"]
    if worst_finding:
        score = max(score, SEVERITY_FLOOR[worst_finding])

    floor_applied = bool(worst_finding and raw_before_floor < SEVERITY_FLOOR[worst_finding])
    score = float(max(0, min(100, round(score))))
    severity = severity_for(score)
    if worst_finding and _RANK[worst_finding] > _RANK[severity]:
        severity = worst_finding

    findings.sort(key=lambda f: (-SEVERITY_POINTS[f["severity"]], f["char_start"]))

    return {
        "score": score,
        "severity": severity,
        "worst_finding_severity": worst_finding or "LOW",
        "findings": findings,
        "imbalance_ratio": imbalance_note,
        "ambiguity_flags": amb,
        "base_risk": base,
        "components": {
            "pattern_points": round(raw_points, 1),
            "type_base": base,
            "imbalance_penalty": imbalance,
            "length_penalty": length_penalty,
            "pre_severity_floor_score": round(raw_before_floor, 1),
            "severity_floor_applied": floor_applied,
            "score_is_probability": False,
        },
    }


def _one_sidedness(text: str):
    """Attribute obligation verbs to the nearest party mention; flag imbalance."""
    counts = {}
    for m in OBLIGATION_RX.finditer(text):
        window = text[max(0, m.start() - 220): m.start()]
        parties = PARTY_HINT_RX.findall(window)
        who = parties[-1].lower() if parties else "unattributed"
        counts[who] = counts.get(who, 0) + 1
    named = {k: v for k, v in counts.items() if k != "unattributed"}
    if len(named) >= 2:
        vals = sorted(named.values(), reverse=True)
        ratio = vals[0] / max(vals[1], 1)
        if ratio >= 3 and vals[0] >= 4:
            return 8, f"{ratio:.1f}x ({vals[0]} vs {vals[1]} obligations)"
        if ratio >= 2 and vals[0] >= 3:
            return 4, f"{ratio:.1f}x ({vals[0]} vs {vals[1]} obligations)"
        return 0, f"{ratio:.1f}x ({vals[0]} vs {vals[1]} obligations)"
    if len(text.split()) > 60:
        obl = sum(counts.values())
        if obl >= 6:
            return 3, f"{obl} obligations, party attribution unclear"
    return 0, "balanced"


def document_gaps(type_map: dict):
    """Protective clauses that are entirely missing from the document."""
    gaps = []
    for key, (label, desc) in PROTECTIVE_CLAUSES.items():
        if key not in type_map:
            severity = "HIGH" if key in ("liability", "termination") else "MEDIUM"
            gaps.append({"clause_type": key, "label": label, "description": desc, "severity": severity})
    return gaps


def document_risk_index(clauses: list, gaps: list) -> dict:
    """Length-weighted mean blended with top-clause concentration, inflated by gaps."""
    if not clauses:
        return {"index": 0, "severity": "LOW", "gap_factor": 1.0, "weighted_clause_risk": 0.0}
    total_len = sum(max(c["word_count"], 1) for c in clauses)
    weighted = sum(c["risk"]["score"] * max(c["word_count"], 1) for c in clauses) / total_len
    top = sorted((c["risk"]["score"] for c in clauses), reverse=True)[:3]
    concentration = sum(top) / len(top)
    blended = 0.55 * weighted + 0.45 * concentration
    gap_factor = 1.0 + 0.06 * len(gaps)  # each missing safeguard nudges the index up
    idx = min(100.0, round(blended * gap_factor, 1))
    return {
        "index": idx,
        "severity": severity_for(idx),
        "gap_factor": round(gap_factor, 2),
        "weighted_clause_risk": round(weighted, 1),
        "top_clause_concentration": round(concentration, 1),
    }
