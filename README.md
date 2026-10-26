# ClauseRisk — Explainable Contract Intelligence

A research prototype for **evidence-first contract review**. Upload or paste a contract to navigate its clauses, inspect deterministic risk signals, review potential cross-clause interactions, and ask questions with source passages linked to the answer.

> Educational decision support only — not legal advice. Risk values are triage indicators, not probabilities of legal harm.

## What it does

- **Parse and segment** PDF, DOCX, TXT and pasted contract text.
- **Classify clauses** into 18 clause families using a fast lexical scorer and optional Hugging Face zero-shot classification (`typeform/distilbert-base-uncased-mnli`).
- **Explain risk flags** with exact evidence spans, rationale, suggested review language, visible score components, and explicit warnings that classifier scores are not calibrated probabilities.
- **Surface cross-clause review prompts** for a small set of explicit patterns (for example, a liability cap beside an uncapped indemnity provision). These are prompts for human verification, not legal conclusions.
- **Summarize and extract entities** such as parties, dates, money, durations and jurisdictions using deterministic extraction and optional Hugging Face models.
- **Answer document questions** through hybrid retrieval: Hugging Face all-MiniLM sentence embeddings plus TF-IDF/legal-term aliases/heading signals, followed by a passage-level extractive reader or a cross-clause rule explanation. If configured, a hosted instruction model can synthesize cited answers. The UI displays sources, abstains when retrieval is weak, and explains the answer path.
- **Ask contract questions and follow-ups** using source-grounded retrieval, with helpful local concept explanations when retrieval is weak. General explanations are clearly separated from contract-specific answers. Hosted generation is optional; without it the backend uses local glossary and extractive fallbacks.
- **Run as a standalone static site** using bundled samples and lightweight browser-side rules. Static mode supports pasted text and TXT/MD files; it never pretends to run the Python API or Hugging Face models.

## Hugging Face and privacy

The core backend requirements do not install Torch or Transformers. Install `backend/requirements-optional-ml.txt` only if you want local transformer models; this is a large download. `backend/requirements-optional-generation.txt` adds only the lightweight client for optional hosted inference. Task models are loaded lazily with a small LRU limit. Set `HF_TOKEN` and, if needed, `HF_CHAT_MODEL` in the backend environment; keep credentials server-side.

When hosted generation is enabled, **retrieved contract excerpts and the user’s question are sent to the configured inference provider**. Do not process confidential or personal documents unless you have permission and have reviewed the provider’s data-handling terms. The application does not claim legal-grade accuracy.

## Explainability approach

The **Explainability** tab gives the document-score formula, its component metrics, top clause contributors, alternative classifier candidates, and cross-clause prompts with clickable source clauses. Clause Review shows the exact matched text and rule rationale. Q&A separates the answer from evidence and its retrieval explanation.

Token-attribution maps are not presented as proof of a model’s reasoning. The current explanations are based on observable rules, model outputs, retrieved passages, and explicit uncertainty notes; these should still be checked by a human.

## Interface

Responsive report workspace with clause minimap, clause filters, linked findings, summary, explainability and conversational Q&A. The redesigned **~9-second five-scene intro** illustrates ingestion, clause parsing, evidence-based explanations, cross-clause checks and cited Q&A. It uses custom CSS 2.5D motion (no heavy 3D library), can be skipped, is replayable from the footer and respects reduced-motion preferences.

## Run locally

```bash
# Build the UI once. The FastAPI app will serve it from the same origin as the API.
cd frontend
npm ci
npm run build

# Start the single application server (from the project root)
cd ..
pip install -r backend/requirements.txt
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Open `http://localhost:8000`. For frontend development only, Vite can be run separately, but production uses one FastAPI process and one host. Transformer models and hosted generation are optional; the default requirements are lightweight.

## One-server deployment package

The production UI is built into `frontend/dist`; FastAPI serves that UI and all `/api/*` endpoints from the **same application process and host**. No separate frontend server or database is required. The default requirements do not install Transformers, Torch, or model weights.

Build and package the application folder:

```bash
cd frontend && npm ci && npm run build
cd ..
python3 scripts/package_server.py
```

This creates `deployment/CLAUSERISK-ONE-SERVER/` and `deployment/CLAUSERISK-ONE-SERVER.zip`. The folder includes the FastAPI app, the already-built UI, a `Procfile`, a shell start command, and a Windows start file. For a Python web-service host, install the included `requirements.txt` and run `sh start.sh` (the `Procfile` does this). For local Windows use, install requirements once, then run `start.bat`. No deployment is performed by this project; the host URL is created by the user’s provider.

A static-only host cannot run the FastAPI API or parse PDF/DOCX. Use a Python web-service plan for this single-server package; do not deploy it as a static-only drag-and-drop site.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/analyze` | Analyze contract text |
| POST | `/api/analyze/upload` | Analyze PDF/DOCX/TXT (multipart) |
| POST | `/api/qa` | Contract-grounded or general-scope answer, history, sources and explanation |
| GET | `/api/health` | Task model and optional generation status |
| GET | `/api/samples`, `/api/samples/{id}` | Bundled demo agreements |
| POST | `/api/models/load` | Warm a task-specific Hugging Face model |

## Suggested demo

1. Choose **Samples → SaaS Master Services Agreement** and analyze it.
2. Open **Explainability** to inspect the formula and the candidate liability/indemnity interaction.
3. Open the linked clauses to verify the exact wording.
4. In **Ask the contract**, ask “What is the liability cap?” followed by “Does the indemnity clause change that?” and inspect retrieved sources.
5. Ask a general concept question such as “What does an indemnity mean?”; the local glossary is available without a token, and any hosted answer remains clearly separated from contract evidence.

## Architecture

```text
frontend/  React + Vite + plain CSS
backend/   FastAPI
  app/nlp/ parser · segmenter · classifier · risk_engine · interactions · QA/RAG
           NER · summarizer · HF model manager · optional HF hosted generation
```

*Intended as an academic prototype. Evaluate against a labeled question set and expert review before making any operational or legal claims.*
