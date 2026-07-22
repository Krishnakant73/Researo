"""Research, Report, Citation, Evidence, AgentRun models."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import ForeignKey, JSON, String, Integer, Float, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UTCDateTime
from app.core.ids import (
    research_id,
    report_id,
    citation_id,
    evidence_id,
    agent_run_id,
    new_id,
)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ResearchSession(Base):
    __tablename__ = "research_sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=research_id)
    workspace_id: Mapped[str] = mapped_column(String(64), default="ws_default", index=True)
    title: Mapped[str] = mapped_column(String(512))
    question: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="queued")
    language: Mapped[str] = mapped_column(String(8), default="en")
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    document_ids: Mapped[list] = mapped_column(JSON, default=list)
    started_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_cost_usd: Mapped[float] = mapped_column(Float, default=0.0)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    runs: Mapped[List["AgentRun"]] = relationship(
        back_populates="research",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    evidence: Mapped[List["Evidence"]] = relationship(
        back_populates="research",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    citations: Mapped[List["Citation"]] = relationship(
        back_populates="research",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    findings: Mapped[List["Finding"]] = relationship(
        back_populates="research",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    report: Mapped[Optional["Report"]] = relationship(
        back_populates="research",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=agent_run_id)
    research_id: Mapped[str] = mapped_column(
        ForeignKey("research_sessions.id", ondelete="CASCADE"), index=True
    )
    agent: Mapped[str] = mapped_column(String(64))
    provider: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    model: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    tokens: Mapped[int] = mapped_column(Integer, default=0)
    cost: Mapped[float] = mapped_column(Float, default=0.0)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(32), default="waiting")
    detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    started_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(UTCDateTime, nullable=True)

    research: Mapped[ResearchSession] = relationship(back_populates="runs")


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=evidence_id)
    research_id: Mapped[str] = mapped_column(
        ForeignKey("research_sessions.id", ondelete="CASCADE"), index=True
    )
    document_id: Mapped[str] = mapped_column(String(64), index=True)
    document_name: Mapped[str] = mapped_column(String(255))
    chunk_id: Mapped[str] = mapped_column(String(64))
    page: Mapped[int] = mapped_column(Integer, default=0)
    section: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    text: Mapped[str] = mapped_column(Text)
    score: Mapped[float] = mapped_column(Float, default=0.0)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)

    research: Mapped[ResearchSession] = relationship(back_populates="evidence")


class Citation(Base):
    __tablename__ = "citations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=citation_id)
    research_id: Mapped[str] = mapped_column(
        ForeignKey("research_sessions.id", ondelete="CASCADE"), index=True
    )
    document_id: Mapped[str] = mapped_column(String(64), index=True)
    document_name: Mapped[str] = mapped_column(String(255))
    chunk_id: Mapped[str] = mapped_column(String(64))
    page: Mapped[int] = mapped_column(Integer, default=0)
    section: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    citation_text: Mapped[str] = mapped_column(Text)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)

    research: Mapped[ResearchSession] = relationship(back_populates="citations")


class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: new_id("find"))
    research_id: Mapped[str] = mapped_column(
        ForeignKey("research_sessions.id", ondelete="CASCADE"), index=True
    )
    ordinal: Mapped[int] = mapped_column(Integer, default=0)
    claim: Mapped[str] = mapped_column(Text)
    detail: Mapped[str] = mapped_column(Text)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    citation_ids: Mapped[list] = mapped_column(JSON, default=list)

    research: Mapped[ResearchSession] = relationship(back_populates="findings")


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=report_id)
    research_id: Mapped[str] = mapped_column(
        ForeignKey("research_sessions.id", ondelete="CASCADE"), unique=True
    )
    workspace_id: Mapped[str] = mapped_column(String(64), default="ws_default", index=True)
    title: Mapped[str] = mapped_column(String(512))
    summary: Mapped[str] = mapped_column(Text, default="")
    executive_summary: Mapped[str] = mapped_column(Text, default="")
    methodology: Mapped[str] = mapped_column(Text, default="")
    markdown: Mapped[str] = mapped_column(Text, default="")
    contradictions: Mapped[list] = mapped_column(JSON, default=list)
    recommendations: Mapped[list] = mapped_column(JSON, default=list)
    follow_up_questions: Mapped[list] = mapped_column(JSON, default=list)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)

    research: Mapped[ResearchSession] = relationship(back_populates="report")
