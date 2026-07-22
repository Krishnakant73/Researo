"""Operational logging models: model usage, research jobs, export history.

These complement the existing `ResearchSession` (research history) and
`AgentRun` (agent execution logs):
  - ModelUsage    — one row per LLM call (AI execution log): model, tokens, cost.
  - ResearchJob   — the lifecycle of a research run (queued→running→done/failed).
  - ExportHistory — every report export/share, for auditability & analytics.
All are populated from real events; nothing here is decorative.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.ids import export_id, model_usage_id, research_job_id
from app.db.base import Base, UTCDateTime


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ModelUsage(Base):
    """One row per LLM invocation during a research run."""

    __tablename__ = "model_usage"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=model_usage_id)
    workspace_id: Mapped[str] = mapped_column(String(64), index=True, default="ws_default")
    research_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("research_sessions.id", ondelete="CASCADE"), index=True, nullable=True
    )
    agent: Mapped[str] = mapped_column(String(64))
    provider: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    model: Mapped[str] = mapped_column(String(128))
    tokens: Mapped[int] = mapped_column(Integer, default=0)
    cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)


class ResearchJob(Base):
    """Lifecycle record for a research run (a queryable 'jobs' view)."""

    __tablename__ = "research_jobs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=research_job_id)
    workspace_id: Mapped[str] = mapped_column(String(64), index=True, default="ws_default")
    research_id: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    question: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="queued")  # queued|running|completed|failed
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, onupdate=utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)


class ExportHistory(Base):
    """Audit trail of report exports / shares."""

    __tablename__ = "export_history"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=export_id)
    workspace_id: Mapped[str] = mapped_column(String(64), index=True, default="ws_default")
    report_id: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    format: Mapped[str] = mapped_column(String(32))  # pdf|markdown|json|share|link
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
