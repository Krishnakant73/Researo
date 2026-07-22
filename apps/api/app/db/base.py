"""SQLAlchemy engine + session factory."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import AsyncIterator

from sqlalchemy import DateTime, event
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.types import TypeDecorator

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


class UTCDateTime(TypeDecorator):
    """A DateTime that always round-trips as timezone-aware UTC.

    SQLite doesn't preserve timezone info, so datetimes come back naive and get
    serialized to JSON without an offset — which browsers then parse as *local*
    time, making "just now" render as e.g. "15h ago". This normalises every
    value to aware UTC on the way in and out, so JSON always includes `+00:00`.
    """

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


_settings = get_settings()

_db_url = _settings.resolved_database_url()
_is_sqlite = _db_url.startswith("sqlite")

engine = create_async_engine(
    _db_url,
    future=True,
    echo=False,
    pool_pre_ping=True,
    # Wait up to 30s for a lock instead of failing instantly with
    # "database is locked" when a write overlaps concurrent reads.
    connect_args={"timeout": 30} if _is_sqlite else {},
)

if _is_sqlite:
    # Enable WAL for concurrent reads during writes, and a generous busy
    # timeout so uploads don't fail when the dashboard/research polling is
    # reading at the same time.
    @event.listens_for(engine.sync_engine, "connect")
    def _sqlite_pragmas(dbapi_connection, _record):  # pragma: no cover
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.execute("PRAGMA synchronous=NORMAL")
        # SQLite ignores FOREIGN KEY constraints unless this is enabled per
        # connection — without it, ON DELETE CASCADE is a no-op and child rows
        # (evidence, citations, agent_runs, model_usage) orphan on delete.
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = async_sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession,
    autoflush=False,
)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
