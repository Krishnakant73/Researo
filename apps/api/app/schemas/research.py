"""Pydantic schemas for the Research API."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.document import DocumentSummary


class ResearchRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=2000)
    document_ids: list[str] = Field(default_factory=list)
    workspace_id: str = "ws_default"


class CitationView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    document_name: str
    page: int
    chunk_id: str
    citation_text: str
    confidence: float
    section: Optional[str] = None


class EvidenceView(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    document_name: str
    page: int
    chunk_id: str
    text: str
    score: float
    confidence: float
    section: Optional[str] = None


class FindingView(BaseModel):
    id: str
    claim: str
    detail: str
    confidence: float
    citation_ids: list[str] = Field(default_factory=list)


class AgentStepView(BaseModel):
    agent: str
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    tokens: Optional[int] = None
    model: Optional[str] = None
    detail: Optional[str] = None


class ReportView(BaseModel):
    id: str
    research_id: str
    title: str
    question: str
    status: str
    confidence: float
    summary: str
    executive_summary: str
    methodology: str
    key_findings: list[FindingView] = Field(default_factory=list)
    contradictions: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    follow_up_questions: list[str] = Field(default_factory=list)
    citations: list[CitationView] = Field(default_factory=list)
    evidence: list[EvidenceView] = Field(default_factory=list)
    agents: list[AgentStepView] = Field(default_factory=list)
    markdown: str = ""
    created_at: datetime


class ResearchSessionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    question: str
    status: str
    confidence: float
    document_count: int
    citation_count: int
    started_at: datetime
    completed_at: Optional[datetime] = None
