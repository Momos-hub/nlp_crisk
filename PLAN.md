# PLAN — Legal Document Intelligence & Clause Risk Detection
### End-to-End NLP Web Application · Senior Software Developer × Data Scientist Blueprint

> **Project type:** Data Science / NLP capstone (web-based, end-to-end, fully dynamic)
> **Stack mandate:** React + Vanilla CSS frontend · Hugging Face model integration · morph animations · optional 3D
> **Quality bar:** ultra-smooth UX, production-shaped architecture, always-functional (graceful degradation)

---

## 1. Problem Statement

Legal contracts are long, unstructured, and full of one-sided or dangerous language. Manual review is
slow, expensive, and error-prone. This system **ingests a contract (PDF / DOCX / TXT / raw text)** and
produces an interactive intelligence report:

1. **Clause segmentation** — split the contract into clause units
2. **Clause classification** — label each clause (Indemnification, Termination, Liability, IP, …)
3. **Clause risk detection** — find risky language, score severity, highlight exact spans, suggest redlines
4. **Document-level risk index** — aggregate score + gap analysis (missing protective clauses)
5. **Legal NER** — parties, dates, money, jurisdictions, notice addresses
6. **Abstractive summary** — plain-language document abstract
7. **Document Q&A** — ask anything about the contract, get grounded answers

---

## 2. Architecture Overview

```
┌──────────────────────────────  FRONTEND (React + Vanilla CSS)  ─────────────────────────────┐
│  3D Hero (three.js) │ Document Intake │ Pipeline Visual │ Risk Gauge │ Clause Explorer      │
│  FLIP Morph Detail  │ Charts (SVG)    │ NER Panel       │ Summary    │ Q&A Console          │
└───────────────────────────────────────┬──────────────────────────────────────────────────────┘
                                        │  REST / JSON (fetch, multipart upload)
┌───────────────────────────────────────▼──────────────────────────────────────────────────────┐
│                            BACKEND — FastAPI (Python)                                        │
│  /api/analyze   /api/qa   /api/samples   /api/health   /api/models/load                      │
│ ┌───────────────────────────  NLP PIPELINE ORCHESTRATOR  ─────────────────────────────┐      │
│ │  1 Parser → 2 Segmenter → 3 Classifier → 4 Risk Engine → 5 NER → 6 Summary → 7 QA   │      │
│ └─────────────────────────────────────────────────────────────────────────────────────┘      │
│        HYBRID ENGINE LAYER                                                                   │
│   ┌─────────────────────────────┐    ┌──────────────────────────────────────────────┐         │
│   │  DEEP (Hugging Face)        │    │  FAST (Deterministic / Lexical / Sklearn)    │         │
│   │  • zero-shot MNLI classifier│◄──►│  • rule-based clause taxonomy                │         │
│   │  • transformer NER          │    │  • 80+ pattern risk lexicon (weighted)       │         │
│   │  • distilbart summarizer    │    │  • regex NER + party-balance heuristic       │         │
│   │  • MiniLM SQuAD2 QA         │    │  • TextRank-ish summarizer, TF-IDF QA        │         │
│   │  lazy-load • LRU • cache    │    │  zero-dependency fallback • always on        │         │
│   └─────────────────────────────┘    └──────────────────────────────────────────────┘         │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Design principle (non-negotiable):** *the app never blocks on model downloads.* Every NLP task has a
Deep (HF) implementation and a Fast (deterministic) implementation behind one interface. `engine=auto`
prefers HF when the model is resident, otherwise falls back — the UI exposes live model status.

---

## 3. Data Science Design

### 3.1 Clause Taxonomy (18 classes)
Definitions · Scope of Services · Payment & Fees · Term & Renewal · Termination · Confidentiality ·
Intellectual Property · Warranties · Limitation of Liability · Indemnification · Force Majeure ·
Governing Law · Dispute Resolution · Assignment · Non-Compete/Non-Solicit · Data Protection ·
Audit Rights · General/Miscellaneous

### 3.2 Risk Model (transparent, weighted — a "white-box" score)

```
clause_risk   = Σ(pattern_severity_i × pattern_weight_i) + clause_type_base_risk
              + one_sidedness_penalty + ambiguity_penalty        → clamp 0..100
doc_risk_idx  = 100 × Σ(clause_risk_c × len_c) / Σ(len_c) × gap_factor
severity bands: 0–24 LOW · 25–49 MEDIUM · 50–74 HIGH · 75+ CRITICAL
```

- **Pattern lexicon:** 80+ regexes in 6 buckets — *Unlimited Exposure*, *Unilateral Control*,
  *Irrevocable Lock-in*, *Waiver of Rights*, *Hidden Financial*, *Data & IP Grab* — each with
  severity, weight, human rationale, and a remediation suggestion.
- **One-sidedness heuristic:** obligation-metric density (`shall/must/is responsible for`) attributed to
  each party via nearest-party windowing → imbalance ratio flags unfair allocation.
- **Gap analysis:** absence of protective clauses (Force Majeure, Liability Cap, Termination,
  Confidentiality, Governing Law) inflates `gap_factor`.
- **Span grounding:** every finding carries `char_start/char_end` of the matched evidence — the UI
  highlights the exact language (this is what makes it "intelligence", not a black box).

### 3.3 Hugging Face Integration (as approved by faculty)
| Task | Primary model | Size | Fallback |
|---|---|---|---|
| Clause classification | `typeform/distilbert-base-uncased-mnli` (zero-shot) | ~260 MB | keyword/taxonomy scoring |
| Legal NER | `dslim/distilbert-NER` | ~250 MB | regex + gazetteer NER |
| Summarization | `sshleifer/distilbart-cnn-12-3` | ~310 MB | frequency+position extractive |
| Extractive QA | `deepset/minilm-uncased-squad2` | ~90 MB | TF-IDF passage + span heuristics |

Models load **lazily on first deep request**, are cached in an LRU (RAM-budgeted, this box has ~1.5 GB),
and expose status via `/api/health`. Embeddings/TF-IDF use scikit-learn.

**Engine policy (budget-aware hybrid, shipped):**
- `auto` (default): HF for zero-shot clause classification (with lexical candidate pruning,
  top-7 labels) + retrieval-augmented MiniLM QA; NER/summarization stay lexical (RAM guard).
- `deep`: all four HF models are attempted (LRU keeps ≤ 2 resident).
- `fast`: pure deterministic engine, sub-100 ms.
- **Version-adaptive QA:** transformers v5 removed the classic `question-answering` pipeline —
  `hf_models._ExtractiveQA` replicates it with raw `AutoModelForQuestionAnswering` inference
  so the project runs on both transformers 4.x and 5.x.

### 3.4 Evaluation hooks (for the report/viva)
- Hold-out clause set with gold labels → accuracy/F1 for rule-based vs zero-shot
- Risk findings precision proxy: pattern hit-table counts
- Latency benchmarks fast vs deep mode (recorded in `/api/health` timings)

---

## 4. Backend Spec (FastAPI)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/analyze` | POST (JSON or multipart file) | Full pipeline → report JSON |
| `/api/qa` | POST | Question + document/clauses → grounded answer |
| `/api/samples` | GET | Bundled demo contracts |
| `/api/health` | GET | Engine status, model residency, timings |
| `/api/models/load` | POST | Explicitly warm a HF model (shows progress in UI) |

Report JSON contains: `meta`, `summary`, `risk_index`, `risk_breakdown`, `clauses[]` (id, heading,
text, type, confidence, engine, risk{score,severity,findings[]}), `entities`, `gaps`, `stats`.

## 5. Frontend Spec (React + Plain CSS) — v2 (simplified)

- **Lightweight:** no UI framework, no 3D library; production bundle ≈ 55 KB gzipped (React + app + CSS).
- **Design language:** light theme, single accent (blue), one border/spacing scale, plain surfaces —
  professional document-tool look (no gradients/glass/glow/emoji clutter).
- **One clear flow:** intro → input panel (Paste / Upload / Samples segmented control) → analyze →
  report. Tabs: **Clause review · Risk findings · Summary · Ask (RAG)**.
- **Responsive:** mobile-first CSS, fluid type (`clamp`), flexible grids (2-col stats → 2×2 → 1-col),
  wrapping filters, horizontally scrollable tabs, ≥44 px touch targets; tested breakpoints 360 / 420 /
  560 / 640 / 800 px.
- **Motion (minimal & purposeful):** smooth inline clause expansion (CSS grid-rows trick), hover
  states, progress bar, answer fade-in — all `prefers-reduced-motion` aware.
- **RAG console:** answers always display retrieved sources; clicking a source opens the clause.

## 6. Reliability & Engineering Practices

- Layered modules, single responsibility; schema-validated responses (Pydantic)
- CORS + Vite dev proxy; production mode: FastAPI serves the built SPA (single origin)
- Sample contracts shipped for zero-setup demo; graceful error states in UI
- Budget-aware model manager (1.5 GB RAM sandbox) — unload LRU models
- No blocking model downloads at import time; import errors degrade to Fast engine

## 7. Delivery / Runbook

```bash
# Backend
cd backend && pip install -r requirements.txt && uvicorn app.main:app --port 8000
# Frontend (dev)
cd frontend && npm install && npm run dev        # http://localhost:5173
# Production (single server)
cd frontend && npm run build && uvicorn app.main:app --port 8000  # serves / and /api
```

## 8. Milestones (execution order)
M1 Plan + scaffold · M2 NLP core (segment, classify, risk, NER, summary, QA) · M3 FastAPI surface ·
M4 Frontend design system + 3D hero · M5 Report UX (gauge, morph detail, charts) · M6 Q&A + export ·
M7 HF deep-mode wiring + health surfacing · M8 E2E test on sample contracts + polish.
