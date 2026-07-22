"""Workspace SQLAlchemy model."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UTCDateTime
from app.core.ids import workspace_id


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=workspace_id)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # A short label/emoji shown in the workspace avatar (e.g. "K", "AI").
    color: Mapped[str | None] = mapped_column(String(16), nullable=True)
    plan: Mapped[str] = mapped_column(String(32), default="Free")
    # A workspace belongs to a project owned by a user. Nullable so existing
    # rows (and the pre-auth local setup) keep working; backfilled on startup.
    project_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    owner_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime, default=utcnow, onupdate=utcnow
    )
