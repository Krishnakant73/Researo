"""Shared FastAPI dependencies."""
from __future__ import annotations

from fastapi import Header

DEFAULT_WORKSPACE_ID = "ws_default"


def get_workspace_id(
    x_workspace_id: str | None = Header(default=None, alias="X-Workspace-Id"),
) -> str:
    """Resolve the active workspace from the X-Workspace-Id request header.

    Falls back to the default workspace when the header is absent so existing
    clients and tools keep working unchanged.
    """
    wid = (x_workspace_id or "").strip()
    return wid or DEFAULT_WORKSPACE_ID
