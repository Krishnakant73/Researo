"""Lightweight, idempotent schema reconciliation.

`Base.metadata.create_all` creates *new* tables but never ALTERs existing ones,
so newly-added columns on existing tables (e.g. workspaces.project_id) must be
added explicitly. This adds any missing nullable columns on both SQLite and
Postgres without a full Alembic setup — safe to run on every startup.

(An Alembic environment can be layered on later for versioned migrations; this
keeps the hackathon MVP zero-config while remaining correct on upgrades.)
"""
from __future__ import annotations

from sqlalchemy import inspect, text

from app.core.logging import get_logger
from app.db.base import engine

log = get_logger(__name__)

# table -> {column: "ALTER TABLE ... ADD COLUMN ..." DDL}
_ADD_COLUMNS: dict[str, dict[str, str]] = {
    "workspaces": {
        "project_id": "ALTER TABLE workspaces ADD COLUMN project_id VARCHAR(64)",
        "owner_id": "ALTER TABLE workspaces ADD COLUMN owner_id VARCHAR(64)",
    },
}

# Indexes to ensure after columns are added (create_all only indexes fresh
# tables, so ALTER-added columns need their indexes created explicitly).
_ENSURE_INDEXES: list[str] = [
    "CREATE INDEX IF NOT EXISTS ix_workspaces_project_id ON workspaces (project_id)",
    "CREATE INDEX IF NOT EXISTS ix_workspaces_owner_id ON workspaces (owner_id)",
]


def _columns(sync_conn, table: str) -> set[str]:
    insp = inspect(sync_conn)
    try:
        return {c["name"] for c in insp.get_columns(table)}
    except Exception:
        return set()


async def ensure_schema() -> None:
    async with engine.begin() as conn:
        for table, cols in _ADD_COLUMNS.items():
            existing = await conn.run_sync(_columns, table)
            if not existing:
                # Table doesn't exist yet — create_all will handle it.
                continue
            for col, ddl in cols.items():
                if col not in existing:
                    log.info("Schema: adding {}.{}", table, col)
                    await conn.execute(text(ddl))
        for ddl in _ENSURE_INDEXES:
            try:
                await conn.execute(text(ddl))
            except Exception as e:  # pragma: no cover - index may already exist
                log.warning("Schema: index ensure skipped ({})", e)
