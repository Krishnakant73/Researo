"""Workspace endpoints — list, create, get, update, delete."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_session
from app.schemas.common import ok
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate
from app.services.workspace_service import WorkspaceService

router = APIRouter()


@router.get("")
async def list_workspaces(session: AsyncSession = Depends(get_session)):
    svc = WorkspaceService(session)
    items = await svc.list()
    return ok([w.model_dump(mode="json") for w in items])


@router.post("")
async def create_workspace(
    payload: WorkspaceCreate, session: AsyncSession = Depends(get_session)
):
    svc = WorkspaceService(session)
    view = await svc.create(payload)
    return ok(view.model_dump(mode="json"), message="Workspace created")


@router.get("/{workspace_id}")
async def get_workspace(
    workspace_id: str, session: AsyncSession = Depends(get_session)
):
    svc = WorkspaceService(session)
    view = await svc.get(workspace_id)
    if not view:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ok(view.model_dump(mode="json"))


@router.patch("/{workspace_id}")
async def update_workspace(
    workspace_id: str,
    payload: WorkspaceUpdate,
    session: AsyncSession = Depends(get_session),
):
    svc = WorkspaceService(session)
    view = await svc.update(workspace_id, payload)
    if not view:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ok(view.model_dump(mode="json"), message="Workspace updated")


@router.delete("/{workspace_id}")
async def delete_workspace(
    workspace_id: str, session: AsyncSession = Depends(get_session)
):
    svc = WorkspaceService(session)
    deleted = await svc.delete(workspace_id)
    if not deleted:
        raise HTTPException(
            status_code=400,
            detail="Workspace not found or cannot be deleted (default workspace is protected)",
        )
    return ok({"deleted": True})
