"""FastAPI application — API + (optional) static SPA serving."""
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .api.routes import router

app = FastAPI(
    title="Legal Document Intelligence & Clause Risk Detection",
    description="End-to-end NLP pipeline: segmentation, classification, risk detection, NER, summarization, Q&A.",
    version="1.0.0",
)

app.add_middleware(GZipMiddleware, minimum_size=1200)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

# ---- Serve built React SPA when available (production single-server mode) ----
PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"
if (FRONTEND_DIST / "index.html").is_file() and (FRONTEND_DIST / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        candidate = (FRONTEND_DIST / full_path).resolve()
        if full_path and FRONTEND_DIST.resolve() in candidate.parents and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
else:

    @app.get("/")
    def root():
        return {
            "service": "legal-doc-intelligence",
            "docs": "/docs",
            "api": "/api/health",
            "note": "Frontend build not found — run `npm run build` in frontend/ or use the Vite dev server.",
        }
