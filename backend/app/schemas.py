"""Pydantic request/response schemas."""
from typing import Any, Optional
from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    text: str = Field("", description="Raw contract text")
    filename: Optional[str] = "pasted-text"
    engine: str = Field("auto", pattern="^(auto|fast|deep)$")


class QARequest(BaseModel):
    question: str = Field("", min_length=0)
    clauses: Optional[list[Any]] = None
    text: Optional[str] = None
    history: Optional[list[dict[str, Any]]] = None
    scope: str = Field("contract", pattern="^(contract|general)$")
    engine: str = Field("auto", pattern="^(auto|fast|deep)$")


class ModelLoadRequest(BaseModel):
    model: str = Field(..., pattern="^(zeroshot|ner|summarizer|qa|embedder)$")
