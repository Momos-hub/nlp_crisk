"""API routes."""
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from .. import schemas
from ..nlp import pipeline as pl
from ..nlp import samples as sample_store
from ..nlp.hf_models import manager
from ..nlp.generation import status as generation_status
from ..nlp.parser import extract_text

router = APIRouter(prefix="/api")


@router.get("/health")
def health():
    return {
        "status": "ok",
        "engine": manager.status(),
        "generation": generation_status(),
        "catalog": pl.type_catalog(),
    }


@router.get("/samples")
def samples():
    return {"samples": sample_store.get_samples()}


@router.get("/samples/{sample_id}")
def sample_detail(sample_id: str):
    s = sample_store.get_sample_text(sample_id)
    if not s:
        raise HTTPException(status_code=404, detail="Sample not found")
    return s


@router.post("/analyze")
def analyze(req: schemas.AnalyzeRequest):
    if len((req.text or "").strip()) < 40:
        raise HTTPException(
            status_code=400,
            detail="Please provide at least 40 characters of contract text.",
        )
    report = pl.analyze_document(req.text, engine=req.engine, filename=req.filename)
    return report


@router.post("/analyze/upload")
async def analyze_upload(
    file: UploadFile = File(...),
    engine: str = Form("auto"),
):
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 8 MB)")
    try:
        text = extract_text(file.filename or "upload.txt", data)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Could not read this file ({exc}). Scanned/image-only PDFs are not supported — use PDF with text, DOCX or TXT.",
        )
    if len(text.strip()) < 30:
        raise HTTPException(status_code=400, detail="No extractable text found in file")
    return pl.analyze_document(text, engine=engine, filename=file.filename)


@router.post("/qa")
def qa(req: schemas.QARequest):
    if len((req.question or "").strip()) < 2:
        raise HTTPException(status_code=400, detail="Please type a question of at least 2 characters.")
    if req.scope == "general":
        return pl.ask(req.question, [], engine=req.engine, scope="general", history=req.history or [])
    clauses = req.clauses
    if not clauses:
        if not req.text:
            raise HTTPException(status_code=400, detail="Analyze a document first, or paste some contract text to ask about.")
        clauses_raw, _ = pl.segment_document(req.text)
        clauses = []
        for c in clauses_raw:
            c["clause_type"] = "general"
            clauses.append(c)
    try:
        clauses = [{"id": c["id"], "text": c["text"], "heading": c.get("heading", ""), "clause_type": c.get("clause_type", "general"), "clause_label": c.get("clause_label", ""), "risk": c.get("risk", {})} for c in clauses]
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid clause payload")
    return pl.ask(req.question, clauses, engine=req.engine, scope=req.scope, history=req.history or [])


@router.post("/models/load")
def load_model(req: schemas.ModelLoadRequest):
    ok = manager.preload(req.model)
    return {"model": req.model, "loaded": ok, "status": manager.status()["models"][req.model]}
