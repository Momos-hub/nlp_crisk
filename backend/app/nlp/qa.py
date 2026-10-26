"""Document Q&A — transparent lexical/semantic retrieval with honest fallbacks.

Every contract-specific response either cites retrieved clause text, is a clearly
labelled local explanation, or asks for clarification when support is weak.
"""
import math
import re

from .hf_models import manager
from .ner import DATE_RX, DURATION_RX, JURIS_RX, MONEY_RX, PARTY_RX

_SENT = re.compile(r"(?<=[.!?])\s+(?=[A-Z\"“(\[])")
_WORD = re.compile(r"[a-z][a-z\-']+")
_STOP = set("""a an the and or but if while of to in on at by for with from as is are was were be been
being this that these those it its their there which who whom whose than then so such may might shall
should will would can could not no nor too very just about into over under again further here all any
each only own same do does did done have has had what when where why how much many please tell me explain
regarding related between among they them their theirs this that those
want wanted need needs know knew give show get got happen happens happened early
both side sides one two every other""".split())
_ED_MAP = {"paid": "pay", "said": "say", "made": "make", "taken": "take", "given": "give",
           "held": "hold", "bound": "bind", "sent": "send", "kept": "keep", "left": "leave",
           "limited": "limit", "capped": "cap", "renewed": "renew", "terminated": "terminate"}


def _stem(w):
    if w in _ED_MAP: return _ED_MAP[w]
    if len(w) > 4 and w.endswith("ies"): return w[:-3] + "y"
    if len(w) > 5 and w.endswith("ses"): return w[:-1]
    if len(w) > 5 and w.endswith("es"): return w[:-2]
    if len(w) > 5 and w.endswith("ed"): return w[:-2] + "e"
    if len(w) > 3 and w.endswith("s") and not w.endswith("ss"): return w[:-1]
    return w


def _tokens(text):
    return [_stem(w) for w in _WORD.findall(text.lower()) if w not in _STOP and len(w) > 1]


def _passages(clauses):
    passages = []
    for c in clauses:
        heading, raw_text = c.get("heading", ""), c["text"]
        body = raw_text[len(heading):].lstrip(" .:-\n") if heading and raw_text.lower().startswith(heading.lower()) else raw_text
        sentences = [s.strip() for s in _SENT.split(body) if s.strip()]
        passages.append({"text": raw_text, "body": body, "ranking_text": f"{heading} {raw_text}",
                         "sentences": sentences or [body or raw_text], "clause_id": c["id"],
                         "heading": heading, "clause_type": c.get("clause_type", "general")})
    return passages


def _tfidf_scores(question, passages):
    docs = [_tokens(p["ranking_text"]) for p in passages]
    if not docs: return []
    df = {}
    for doc in docs:
        for word in set(doc): df[word] = df.get(word, 0) + 1
    n = len(docs)
    def vector(tokens):
        tf = {}
        for word in tokens: tf[word] = tf.get(word, 0) + 1
        return {w: (1 + math.log(count)) * math.log((n + 1) / (df.get(w, 0) + 0.5)) for w, count in tf.items()}
    qv = vector(_tokens(question))
    qnorm = math.sqrt(sum(v * v for v in qv.values())) or 1.0
    scores = []
    for i, doc in enumerate(docs):
        dv = vector(doc); dnorm = math.sqrt(sum(v * v for v in dv.values())) or 1.0
        dot = sum(qv[w] * dv.get(w, 0.0) for w in qv)
        scores.append((dot / (qnorm * dnorm), i))
    return sorted(scores, key=lambda x: -x[0])


def _question_boosts(question):
    q = question.lower(); boosts = []
    if any(k in q for k in ("how much", "cost", "price", "fee", "pay", "amount", "remuneration")): boosts.append(("money", MONEY_RX))
    if any(k in q for k in ("when", "deadline", "how long", "days", "notice period", "period", "due")):
        boosts.extend([("time", DATE_RX), ("duration", DURATION_RX)])
    if q.startswith("who") or any(k in q for k in ("party", "counterparty", "between")): boosts.append(("party", PARTY_RX))
    if any(k in q for k in ("where", "jurisdiction", "govern", "law", "venue", "dispute", "arbitrat", "court")):
        boosts.extend([("venue", JURIS_RX), ("dispute_kw", re.compile(r"jurisdiction|governing|governed|arbitrat|court|venue|dispute", re.I))])
    return boosts


QUERY_ALIASES = {
    "cap": "limit maximum ceiling exposure capped", "liability": "responsibility damages loss indemnity",
    "terminate": "termination cancel end expire notice", "renew": "renewal auto-renew extension rollover term",
    "fee": "fees payment charges price compensation invoice", "pay": "payment fees invoice due amount",
    "confidential": "confidentiality disclose non-disclosure secret information",
    "indemnity": "indemnification defend reimburse losses claims", "data": "privacy personal information security breach",
    "law": "governing jurisdiction venue court dispute arbitration", "deadline": "days notice period prior written advance",
    "obligation": "shall must required responsible duty", "warranty": "warranties disclaimer remedy service level",
    "privacy": "data protection personal information security breach", "force majeure": "event beyond control disruption excuse performance",
    "intellectual property": "ownership license work product background materials",
}


def _expanded_question(question):
    q = question.lower(); aliases = []
    for key, words in QUERY_ALIASES.items():
        if re.search(r"\b" + re.escape(key) + r"\w*\b", q): aliases.extend(words.split())
    return question + " " + " ".join(aliases)


def _rank(question, passages, engine="auto"):
    """Hybrid retrieval. Embeddings are optional; lexical ranking always remains available."""
    expanded = _expanded_question(question); base = _tfidf_scores(expanded, passages)
    if not base: return []
    boosts, q_tokens = _question_boosts(question), _tokens(expanded)
    head = (_tokens(question) or q_tokens)[0] if q_tokens else None
    qset = set(q_tokens)
    def boost(score, passage):
        bonus = 0.0; p_tokens = set(_tokens(passage["ranking_text"]))
        if head and head in p_tokens: bonus += 0.3
        bonus += 0.12 * len(set(_tokens(passage["heading"] or "")) & qset)
        for name, rx in boosts:
            matches = rx.findall(passage["ranking_text"])
            if not matches: continue
            bonus += 0.18 + 0.04 * min(len(matches), 3)
            if name == "party":
                companies, roles = set(), 0
                for match in matches:
                    if isinstance(match, tuple):
                        if match[0]: companies.add(match[0])
                        if match[1]: roles += 1
                    else: companies.add(match)
                bonus += 0.15 * min(len(companies), 3) + 0.02 * min(roles, 3)
        return score + bonus
    lexical = {i: boost(score, passages[i]) for score, i in base}
    max_lex = max(lexical.values()) or 1.0
    dense = None
    if engine in ("auto", "deep"):
        try:
            encoder = manager.get("embedder")
            if encoder is not None:
                vectors = encoder([question] + [p["ranking_text"] for p in passages])
                dense = (vectors[1:] @ vectors[0]).tolist()
        except Exception: dense = None
    if dense is None:
        scored = [(score, passages[i]) for i, score in lexical.items()]
    else:
        scored = [(0.60 * max(0.0, min(1.0, float(dense[i]))) + 0.40 * max(0.0, min(1.0, score / max_lex)), passages[i]) for i, score in lexical.items()]
    return sorted(scored, key=lambda x: -x[0])


def _fast_answer(question, ranked):
    if not ranked or ranked[0][0] < 0.05:
        return {"answer": "I could not confidently match that wording to contract text.", "confidence": 0.0,
                "clause_id": None, "heading": None, "evidence": "", "engine": "fast-tfidf"}
    score, best = ranked[0]
    qwords, specific = set(_tokens(_expanded_question(question))), set(_tokens(question))
    sentences = best["sentences"] or [best.get("body") or best["text"]]
    def sentence_score(sentence):
        tokens = set(_tokens(sentence))
        return 2.0 * len(specific & tokens) + len(qwords & tokens) + min(len(sentence), 500) / 5000
    sentence = max(sentences, key=sentence_score)
    return {"answer": sentence, "confidence": round(min(0.92, 0.32 + score * 1.2), 3),
            "clause_id": best["clause_id"], "heading": best["heading"], "evidence": sentence, "engine": "fast-tfidf"}


def _deep_answer(question, top_passages):
    pipe = manager.get("qa")
    if pipe is None: return None
    candidates = []
    try:
        for passage in top_passages[:6]:
            context = (passage.get("body") or passage.get("text") or "")[:1800]
            if not context: continue
            out = pipe(question=question, context=context, handle_impossible_answer=True)
            score, answer = float(out.get("score", 0.0)), (out.get("answer") or "").strip()
            if answer and score >= 0.05: candidates.append((score, answer, passage))
    except Exception: return None
    if not candidates: return None
    score, answer, passage = max(candidates, key=lambda x: x[0])
    return {"answer": answer, "confidence": round(min(0.99, score), 3), "clause_id": passage["clause_id"],
            "heading": passage["heading"], "evidence": answer, "engine": "huggingface-minilm"}


def _cross_clause_response(question, clauses, sources):
    q = question.lower()
    if not ("liabil" in q and "indemn" in q): return None
    from .interactions import analyze_interactions
    matches = [x for x in analyze_interactions(clauses) if x["id"] == "liability-indemnity-carveout"]
    if not matches: return None
    item = matches[0]
    evidence_by_id = {e["clause_id"]: re.sub(r"\s+", " ", e["text"]).strip() for e in item["evidence"]}
    ids = item["clause_ids"]
    answer = (f"The agreement contains a liability cap in [{ids[0]}] and separate indemnity wording in [{ids[1]}] "
              f"that includes ‘without limitation’. This is a potential cross-clause issue: the wording suggests the "
              f"indemnity obligation may not be bounded in the same way, but this pattern match cannot determine "
              f"the clauses’ legal effect. Ask a reviewer to verify how the cap and any exceptions interact.")
    source_map = {s["clause_id"]: s for s in sources}
    linked = [source_map.get(cid, {"clause_id": cid, "heading": "Related clause", "snippet": evidence_by_id.get(cid, ""), "score": 0.0}) for cid in ids]
    return {"answer": answer, "answer_mode": "cross-clause-explanation", "scope": "contract", "sources": linked,
            "support_level": "explicit text pattern · human verification required",
            "pipeline": "HF semantic + lexical retrieval → explicit cross-clause rule (not generative)",
            "citation_valid": True, "cited_ids": ids,
            "why_this_answer": item["why"] + " Matched with a visible lexical pattern; it is a review prompt, not a legal conclusion."}


def _resolved_query(question: str, history: list):
    if not history: return question
    q = question.lower().strip()
    followup = len(_tokens(question)) <= 5 or any(x in q for x in ("that", "those", "it", "they", "what about", "and what", "this clause", "the exception"))
    prior = next((m.get("text", "") for m in reversed(history) if m.get("role") == "user"), "")
    return f"{prior} {question}" if followup and prior else question


LEGAL_GLOSSARY = [
    (r"\b(indemnity|indemnification|indemnify)\b", "Indemnity generally means one party must cover specified losses, claims, or costs suffered by the other. Check which claims are covered, exclusions, defence control, notice and cooperation duties, and how the clause interacts with any liability cap."),
    (r"\b(liability cap|cap on liability|limitation of liability|liability limit)\b", "A liability cap sets a ceiling on specified monetary exposure. Check whether it is aggregate or per claim, which losses are excluded, whether indemnities sit inside or outside it, and whether the cap is mutual."),
    (r"\b(automatic renewal|auto.?renew|renewal)\b", "An automatic-renewal clause extends an agreement unless a party gives notice by a deadline. The notice period, delivery method, renewal length, and price-change mechanism matter."),
    (r"\b(termination for convenience|terminate for convenience)\b", "Termination for convenience allows a party to end an agreement without proving breach, usually after advance notice. Check whether the right is mutual and what fees, transition help, refunds, or accrued obligations remain."),
    (r"\b(force majeure|act of god)\b", "A force-majeure clause may excuse or delay performance when specified events outside a party’s control prevent it. Review the event list, notice and mitigation duties, payment treatment, and whether prolonged disruption permits termination."),
    (r"\b(confidentiality|confidential information|nda)\b", "Confidentiality provisions restrict use or disclosure of defined information. Review exclusions, permitted recipients and disclosures, security duties, duration, and what happens to the information at the end."),
    (r"\b(governing law|choice of law|jurisdiction|venue)\b", "A governing-law clause selects the law used to interpret an agreement; a forum or jurisdiction clause identifies where disputes may be heard. They are related but distinct, and practical effect depends on the parties and context."),
    (r"\b(arbitration|mediation|dispute resolution)\b", "Dispute-resolution terms set the route for resolving disagreements. Check any required negotiation or mediation, arbitration rules and seat, cost allocation, available remedies, and court carve-outs."),
    (r"\b(data processing|personal data|privacy|data protection)\b", "Data-protection terms allocate responsibilities for personal data. Common checks include each party’s role, permitted purposes, security, breach notice, subprocessors, individual-rights support, deletion, and international transfers."),
    (r"\b(intellectual property|work product|ip ownership|background ip)\b", "Intellectual-property terms decide who owns existing materials and new work, and what licenses each party receives. Separate background IP, deliverables, feedback, third-party materials, and rights needed to use the service."),
    (r"\b(warranty|as is|as available)\b", "A warranty is a contractual promise about a product, service, or performance. A disclaimer may narrow those promises; compare it with express commitments, service levels, remedies, and applicable law."),
    (r"\b(non.?compete|non.?solicit|restrictive covenant)\b", "A non-compete or non-solicit restricts specified competitive or hiring activity. Scope, duration, geography, covered people, exceptions, and enforceability vary significantly by jurisdiction."),
    (r"\b(payment terms|late fee|late payment|invoice)\b", "Payment terms set invoice timing, due dates, dispute procedures, late charges, taxes, and possible suspension rights. Check whether disputed amounts must be paid and whether notice or a cure period applies."),
]


def _glossary_answer(question):
    for pattern, explanation in LEGAL_GLOSSARY:
        if re.search(pattern, question, re.I): return explanation
    return None


def _topic_pattern(question):
    q = question.lower()
    options = [
        (r"liabilit|cap|damages|indemnif", re.compile(r"liabilit|cap|damages|indemnif", re.I)),
        (r"terminat|cancel|exit", re.compile(r"terminat|cancel|exit|expiry", re.I)),
        (r"renew", re.compile(r"renew|extension|roll.over", re.I)),
        (r"confidential|nda", re.compile(r"confidential|non.?disclosure", re.I)),
        (r"data|privacy|security", re.compile(r"personal data|privacy|security|data processing", re.I)),
        (r"payment|invoice|fee", re.compile(r"payment|invoice|fee|price|late charge", re.I)),
        (r"ip|intellectual property|work product", re.compile(r"intellectual property|work product|ownership|license", re.I)),
        (r"warrant|uptime", re.compile(r"warrant|uptime|service level", re.I)),
        (r"law|jurisdiction|arbitrat|dispute", re.compile(r"governing law|jurisdiction|arbitrat|dispute|venue", re.I)),
        (r"force majeure", re.compile(r"force majeure|act of god", re.I)),
    ]
    return next((rx for needle, rx in options if re.search(needle, q)), None)


def _matching_clauses(question, clauses):
    rx = _topic_pattern(question)
    if not rx: return []
    found = [c for c in clauses if rx.search(f"{c.get('heading','')} {c.get('clause_label','')} {c.get('text','')}")]
    return found[:3]


def _summary_answer(clauses):
    top = sorted(clauses, key=lambda c: (c.get("risk", {}).get("score", 0)), reverse=True)[:3]
    if not clauses: return None, []
    lines = []
    for c in top:
        label = c.get("clause_label") or c.get("heading") or "Contract section"
        findings = c.get("risk", {}).get("findings", [])
        risk = (findings[0].get("label") or findings[0].get("bucket_label") or findings[0].get("pattern_id") or "matched risk wording") if findings else "no configured risk pattern matched"
        lines.append(f"[{c.get('id')}] {label}: {risk}.")
    return "The highest-scoring sections in this report are: " + " ".join(lines) + " These are heuristic review prompts, not conclusions about legal effect.", top


def answer_question(question: str, clauses: list, engine: str = "auto", scope: str = "contract", history=None):
    from .generation import generate_answer
    history = history or []
    if scope == "general":
        generated = generate_answer(question, [], scope="general", history=history)
        if generated:
            return {"answer": generated, "answer_mode": "general-explanation", "scope": "general", "sources": [],
                    "support_level": "general explanation · not contract evidence", "pipeline": "Hugging Face hosted instruction model",
                    "citation_valid": None, "why_this_answer": "This response is general information and was not inferred from the uploaded contract."}
        local = _glossary_answer(question)
        if local:
            return {"answer": local, "answer_mode": "general-glossary", "scope": "general", "sources": [],
                    "support_level": "built-in general explanation", "pipeline": "Local legal-concept glossary · no model or network call",
                    "citation_valid": None, "why_this_answer": "This explanation is general information, separate from the uploaded contract. It is not jurisdiction-specific legal advice."}
        return {"answer": "I can explain common contract concepts in plain language, including liability caps, indemnity, renewals, termination, confidentiality, data protection, IP, warranties, payment terms, force majeure, and dispute resolution. Which term would you like to unpack? This is general information, not legal advice.",
                "answer_mode": "clarification", "scope": "general", "sources": [], "support_level": "clarification prompt",
                "pipeline": "Local fallback · hosted generator not configured", "citation_valid": None,
                "why_this_answer": "No hosted generator is configured; asking a focused concept question enables a useful built-in explanation."}

    retrieval_query = _resolved_query(question, history)
    if re.search(r"\b(summar|overview|key risks|main risks|most important risk|biggest risk|help me understand|what is this agreement)\b", retrieval_query, re.I):
        summary, top = _summary_answer(clauses)
        if summary:
            summary_sources = [{"clause_id": c["id"], "heading": c.get("heading"), "snippet": re.sub(r"\s+", " ", c.get("text", ""))[:240]} for c in top]
            return {"answer": summary, "answer_mode": "report-summary", "scope": "contract", "sources": summary_sources,
                    "support_level": "current report · heuristic scores", "pipeline": "Report findings and clause scores",
                    "citation_valid": True, "why_this_answer": "This overview is based on the current report’s visible clause scores and matched findings, not a legal conclusion."}
    passages = _passages(clauses)
    ranked = _rank(retrieval_query, passages, engine=engine)
    model_status = manager.status().get("models", {})
    semantic_used = model_status.get("embedder", {}).get("state") == "resident"
    best_score = ranked[0][0] if ranked else 0.0
    minimum_relevance = 0.22 if semantic_used else 0.05
    if not ranked or best_score < minimum_relevance:
        local = _glossary_answer(question)
        matches = _matching_clauses(question, clauses)
        if matches and local:
            sources = [{"clause_id": c["id"], "heading": c.get("heading"), "snippet": re.sub(r"\s+", " ", c.get("text", ""))[:260], "score": None} for c in matches]
            cites = ", ".join(f"[{c['id']}]" for c in matches)
            answer = f"{local} In this document, potentially relevant wording appears in {cites}. I have not resolved its legal effect; review the full clauses and surrounding terms."
            return {"answer": answer, "answer_mode": "local-explanation-with-clause-match", "scope": "contract", "sources": sources,
                    "support_level": "general concept + keyword-matched clause; verify full text", "pipeline": "Local concept glossary + transparent clause keyword match",
                    "citation_valid": True, "why_this_answer": "The concept explanation is general. Clause references are simple keyword matches, not semantic proof or a legal conclusion."}
        if local:
            return {"answer": f"{local} I could not confidently match this concept to a clause in the analyzed text, so the explanation above is general rather than contract-specific.",
                    "answer_mode": "local-general-fallback", "scope": "contract", "sources": [],
                    "support_level": "general explanation · no clause retrieved", "pipeline": "Local concept glossary · retrieval abstained",
                    "citation_valid": None, "why_this_answer": "The concept matched a built-in glossary, but retrieval did not find sufficiently relevant contract text."}
        if re.search(r"\b(summar|overview|key risks|main risks|help me understand|what is this agreement)\b", question, re.I):
            summary, top = _summary_answer(clauses)
            if summary:
                sources = [{"clause_id": c["id"], "heading": c.get("heading"), "snippet": re.sub(r"\s+", " ", c.get("text", ""))[:240]} for c in top]
                return {"answer": summary, "answer_mode": "report-summary", "scope": "contract", "sources": sources,
                        "support_level": "current report · heuristic scores", "pipeline": "Report findings and clause scores",
                        "citation_valid": True, "why_this_answer": "This overview reflects the current report’s visible risk scores and matched findings; it is not a legal conclusion."}
        headings = list(dict.fromkeys((c.get("clause_label") or c.get("heading") or "") for c in clauses if c.get("clause_label") or c.get("heading")))[:8]
        topic_list = ", ".join(headings)
        answer = "I could not confidently match that wording to a section, so I don't want to guess. Try a clause heading, party name, or synonym; a follow-up is fine."
        if topic_list: answer += f" Sections identified in this document include: {topic_list}."
        answer += " You can also ask for a summary or a general explanation of a contract term."
        return {"answer": answer, "answer_mode": "clarification", "scope": "contract", "sources": [],
                "support_level": "clarification needed", "pipeline": "Hybrid retrieval · no sufficiently relevant passage",
                "citation_valid": None, "why_this_answer": "Retrieval was too weak to ground a contract-specific answer. The assistant offers alternative wording instead of treating a relevant legal question as out of context."}

    source_ranked = [(s, p) for s, p in ranked[:8] if s >= max(minimum_relevance * 0.65, best_score * 0.22)]
    selected = [p for _s, p in source_ranked[:6]]
    sources = [{"clause_id": p["clause_id"], "heading": p["heading"], "snippet": p["text"][:260], "score": round(float(s), 3)} for s, p in source_ranked[:4]]
    match = "strong retrieval match" if best_score >= 0.32 else "some potentially relevant text" if best_score >= 0.10 else "weak retrieval match — verify sources"

    if engine in ("auto", "deep"):
        generated = generate_answer(question, selected, scope="contract", history=history)
        if generated:
            valid_ids = {p["clause_id"] for p in selected}; cited = set(re.findall(r"\[(C\d+)\]", generated))
            return {"answer": generated, "answer_mode": "grounded-generation", "scope": "contract", "sources": sources,
                    "support_level": match,
                    "pipeline": ("HF MiniLM semantic + lexical retrieval → Hugging Face instruction model → source-ID validation" if semantic_used else "Lexical retrieval → Hugging Face instruction model → source-ID validation"),
                    "citation_valid": bool(cited) and cited.issubset(valid_ids), "cited_ids": sorted(cited),
                    "why_this_answer": f"Retrieved {len(selected)} clause passage(s) using {'HF MiniLM sentence embeddings, ' if semantic_used else ''}lexical matches, legal-term aliases, heading/topic signals and question-type cues. The generator was instructed to answer only from those passages and cite their clause IDs. Ranking scores are not probabilities."}

    cross_clause = _cross_clause_response(retrieval_query, clauses, sources)
    if cross_clause:
        cross_clause["pipeline"] = "HF MiniLM semantic + lexical retrieval → explicit cross-clause rule (not generative)" if semantic_used else "Lexical retrieval → explicit cross-clause rule (not generative)"
        return cross_clause

    if engine in ("auto", "deep"):
        deep = _deep_answer(question, selected)
        if deep:
            deep.update({"answer_mode": "extractive-reader", "scope": "contract", "sources": sources, "support_level": match,
                         "citation_valid": True,
                         "pipeline": "HF MiniLM semantic + lexical retrieval → MiniLM extractive reader (not generative)" if semantic_used else "Lexical retrieval → MiniLM extractive reader (not generative)",
                         "why_this_answer": "The answer is an extracted text span from retrieved contract passages; it does not synthesize a legal conclusion."})
            return deep

    fast = _fast_answer(question, ranked)
    fast.update({"answer_mode": "extractive-fallback", "scope": "contract", "sources": sources,
                 "support_level": match, "citation_valid": bool(fast.get("clause_id")),
                 "why_this_answer": "The fallback selects a sentence from the best lexical match. It is not a generative model or a legal conclusion.",
                 "pipeline": "Hybrid lexical retrieval → extractive sentence fallback"})
    return fast
