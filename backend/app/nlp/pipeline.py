"""NLP pipeline orchestrator — one call, full intelligence report."""
import time
from collections import Counter

from .segmenter import segment_document
from .classifier import classify_clause
from .risk_engine import analyze_clause, document_gaps, document_risk_index
from .ner import extract_entities
from .summarizer import summarize
from .qa import answer_question
from .taxonomy import CLAUSE_TYPES
from .interactions import analyze_interactions

SUGGESTION_PRIORITY = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}


def analyze_document(text: str, engine: str = "auto", filename: str = "") -> dict:
    t0 = time.time()
    clauses_raw, normalized = segment_document(text)
    clauses = []
    type_counter = Counter()
    severity_counter = Counter()

    for c in clauses_raw:
        clf = classify_clause(c["text"], engine=engine, heading=c.get("heading", ""))
        risk = analyze_clause(c, clf["type"], normalized)
        severity_counter[risk["severity"]] += 1
        type_counter[clf["type"]] += 1
        clauses.append({
            **c,
            "clause_type": clf["type"],
            "clause_label": clf["label"],
            "classification_confidence": clf["confidence"],
            "classification_top_k": clf["top_k"],
            "classification_engine": clf["engine"],
            "risk": risk,
        })

    gaps = document_gaps(type_counter)
    risk_index = document_risk_index(clauses, gaps)
    interactions = analyze_interactions(clauses)
    ner = extract_entities(normalized, engine=engine)
    summ = summarize(normalized, engine=engine)

    top_risks = sorted(
        (
            {
                "clause_id": c["id"],
                "heading": c["heading"],
                "severity": c["risk"]["severity"],
                "score": c["risk"]["score"],
                "top_finding": (c["risk"]["findings"][0]["rationale"] if c["risk"]["findings"] else None),
                "top_finding_evidence": (c["risk"]["findings"][0]["evidence"] if c["risk"]["findings"] else None),
            }
            for c in clauses
            if c["risk"]["findings"]
        ),
        key=lambda x: (-x["score"], x["clause_id"]),
    )[:8]

    recommendations = _recommendations(clauses, gaps)

    stats = {
        "word_count": len(normalized.split()),
        "char_count": len(normalized),
        "clause_count": len(clauses),
        "finding_count": sum(len(c["risk"]["findings"]) for c in clauses),
        "type_distribution": dict(type_counter),
        "severity_distribution": dict(severity_counter),
        "reading_time_min": max(1, round(len(normalized.split()) / 220)),
        "engine_mode": engine,
    }

    return {
        "meta": {
            "filename": filename or "pasted-text",
            "engine": engine,
            "processing_ms": round((time.time() - t0) * 1000, 1),
        },
        "summary": summ,
        "risk_index": risk_index,
        "clauses": clauses,
        "entities": ner,
        "gaps": gaps,
        "top_risks": top_risks,
        "recommendations": recommendations,
        "interactions": interactions,
        "stats": stats,
    }


def _recommendations(clauses, gaps):
    recs = []
    for g in gaps:
        recs.append({
            "priority": g["severity"],
            "title": f"Add a {g['label']} clause",
            "detail": g["description"],
        })
    worst = sorted(clauses, key=lambda c: -c["risk"]["score"])[:5]
    for c in worst:
        if not c["risk"]["findings"]:
            continue
        f = c["risk"]["findings"][0]
        recs.append({
            "priority": f["severity"],
            "title": f"Renegotiate {c['heading'][:48]}",
            "detail": f["suggestion"],
        })
    recs.sort(key=lambda r: SUGGESTION_PRIORITY.get(r["priority"], 4))
    return recs[:10]


def ask(question: str, clauses: list, engine: str = "auto", scope: str = "contract", history=None) -> dict:
    return answer_question(question, clauses, engine=engine, scope=scope, history=history)


def type_catalog():
    return [
        {"key": k, "label": v["label"], "base_risk": v["base_risk"]}
        for k, v in CLAUSE_TYPES.items()
    ]
