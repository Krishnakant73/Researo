"""Pydantic schemas for the Document API."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class DocumentSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    filename: str
    mime_type: str
    size: int
    status: str
    pages: int
    chunks: int = 0
    language: str = "en"
    tags: list[str] = Field(default_factory=list)
    category: Optional[str] = None
    author: Optional[str] = None
    downloadable: bool = False
    created_at: datetime
    updated_at: datetime


class DocumentCreate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
