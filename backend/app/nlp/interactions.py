"""High-precision lexical cross-clause checks.

These are reviewer prompts, not legal conclusions. Only explicit patterns are
reported; absence of a match does not imply the clauses are consistent.
"""
import re

_CAP = re.compile(r"\b(cap(?:ped)?|limit(?:ed)?|maximum aggregate|aggregate liability|fees paid)\b", re.I)
_INDEMNITY = re.compile(r"\b(indemnif(?:y|ies|ication)|defend|hold harmless)\b", re.I)
_CARVEOUT = re.compile(
    r"\b(notwithstanding|excluding|excluded from|shall not apply|does not apply|outside)\b.{0,100}"
    r"\b(liability cap|cap|limitation of liability|limitations? on liability)\b|"
    r"\b(indemnif(?:y|ies|ication)|indemnity)\b.{0,100}"
    r"\b(not subject to|excluded from|outside|without limitation)\b.{0,60}"
    r"\b(cap|limitation of liability|liability limit)\b",
    re.I | re.S,
)
_AUTORENEW = re.compile(r"\b(auto(?:matic(?:ally)?)?[- ]renew|renew(?:s|al)? automatically)\b", re.I)
_NONRENEW = re.compile(r"\b(non[- ]renewal|prevent renewal|notice.{0,50}renewal|prior to (?:the )?renewal)\b", re.I)


def analyze_interactions(clauses: list[dict]) -> list[dict]:
    by_type = {}
    for c in clauses:
        by_type.setdefault(c.get("clause_type", "general"), []).append(c)
    results = []

    liability = by_type.get("liability", [])
    indemnity = by_type.get("indemnification", [])
    for a in liability:
        if not _CAP.search(a.get("text", "")):
            continue
        for b in indemnity:
            indemnity_text = b.get("text", "")
            match = _CARVEOUT.search(indemnity_text)
            explicit_carveout = bool(match)
            if not match and _INDEMNITY.search(indemnity_text):
                # Explicitly uncapped indemnity wording is worth reviewing beside a separate cap.
                match = re.search(r"\bwithout limitation\b", indemnity_text, re.I)
            if match:
                rationale = (
                    "The indemnity wording explicitly refers to the liability cap or its exclusion. Verify the scope and exceptions in context."
                    if explicit_carveout else
                    "One clause sets a liability cap while a separate indemnity clause says 'without limitation'. This is a candidate interaction to verify, not proof that the cap does or does not apply."
                )
                results.append({
                    "id": "liability-indemnity-carveout",
                    "label": "Check whether indemnity claims sit outside the liability cap",
                    "severity": "HIGH",
                    "clause_ids": [a["id"], b["id"]],
                    "evidence": [
                        {"clause_id": a["id"], "text": a.get("text", "")[:260]},
                        {"clause_id": b["id"], "text": b.get("text", "")[max(0, match.start()-100):match.end()+150]},
                    ],
                    "why": rationale,
                    "method": "explicit carve-out phrase match" if explicit_carveout else "co-occurring cap + uncapped indemnity wording",
                    "confidence_note": "Candidate interaction only; confirm the clauses’ legal effect in context.",
                })

    term = by_type.get("term_renewal", [])
    termination = by_type.get("termination", [])
    for a in term:
        if not _AUTORENEW.search(a.get("text", "")):
            continue
        for b in termination:
            if _NONRENEW.search(b.get("text", "")):
                results.append({
                    "id": "renewal-termination-window",
                    "label": "Check the renewal and non-renewal notice window together",
                    "severity": "MEDIUM",
                    "clause_ids": [a["id"], b["id"]],
                    "evidence": [
                        {"clause_id": a["id"], "text": a.get("text", "")[:240]},
                        {"clause_id": b["id"], "text": b.get("text", "")[:240]},
                    ],
                    "why": "Automatic renewal and the notice needed to prevent renewal are described separately. Confirm the deadline and method align.",
                    "method": "explicit lexical cross-clause pattern",
                    "confidence_note": "Workflow prompt only; the tool does not calculate a legal deadline.",
                })
    return results
