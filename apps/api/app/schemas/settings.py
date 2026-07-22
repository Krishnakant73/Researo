"""Pydantic schemas for runtime settings."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class SettingsView(BaseModel):
    default_model: str
    fast_model: str
    quality_model: str
    top_k_dense: int
    top_k_bm25: int
    top_k_final: int
    use_reranker: bool
    # Read-only status flags for the UI.
    llm_live: bool = False
    embedding_model: str = ""
    embedding_backend: str = ""


class SettingsUpdate(BaseModel):
    default_model: Optional[str] = Field(default=None, max_length=128)
    fast_model: Optional[str] = Field(default=None, max_length=128)
    quality_model: Optional[str] = Field(default=None, max_length=128)
    top_k_dense: Optional[int] = Field(default=None, ge=1, le=50)
    top_k_bm25: Optional[int] = Field(default=None, ge=1, le=50)
    top_k_final: Optional[int] = Field(default=None, ge=1, le=30)
    use_reranker: Optional[bool] = None
