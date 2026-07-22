"""Structured-output schemas used by every agent step."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class PlanObjective(BaseModel):
    topic: str
    why: str


class PlannerOutput(BaseModel):
    objectives: list[PlanObjective] = Field(default_factory=list)
    queries: list[str] = Field(default_factory=list)


class CuratorOutput(BaseModel):
    selected_ids: list[str] = Field(default_factory=list)


class AnalystFinding(BaseModel):
    claim: str
    detail: str
    confidence: float = 0.8
    citation_ids: list[str] = Field(default_factory=list)


class AnalystOutput(BaseModel):
    executive_summary: str
    methodology: str
    findings: list[AnalystFinding] = Field(default_factory=list)
    contradictions: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    follow_up_questions: list[str] = Field(default_factory=list)


class ValidatorIssue(BaseModel):
    finding_index: int
    issue: str


class ValidatorOutput(BaseModel):
    issues: list[ValidatorIssue] = Field(default_factory=list)
    confidence: float = 0.85
