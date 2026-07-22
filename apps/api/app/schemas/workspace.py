"""Pydantic schemas for the Workspace API."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=2000)
    color: Optional[str] = Field(default=None, max_length=16)
    plan: str = "Free"


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=2000)
    color: Optional[str] = Field(default=None, max_length=16)
    plan: Optional[str] = None


class WorkspaceView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    plan: str = "Free"
    document_count: int = 0
    research_count: int = 0
    created_at: datetime
    updated_at: datetime
