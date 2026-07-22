"""Runtime application settings (single-row, editable from the Settings UI)."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UTCDateTime


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AppSetting(Base):
    __tablename__ = "app_settings"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default="default")
    default_model: Mapped[str] = mapped_column(String(128), default="openai/gpt-4o-mini")
    fast_model: Mapped[str] = mapped_column(String(128), default="openai/gpt-4o-mini")
    quality_model: Mapped[str] = mapped_column(String(128), default="openai/gpt-4o")
    top_k_dense: Mapped[int] = mapped_column(Integer, default=12)
    top_k_bm25: Mapped[int] = mapped_column(Integer, default=12)
    top_k_final: Mapped[int] = mapped_column(Integer, default=8)
    use_reranker: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime, default=utcnow, onupdate=utcnow
    )
