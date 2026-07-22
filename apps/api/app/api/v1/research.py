"""Research endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DEFAULT_WORKSPACE_ID, get_workspace_id
from app.db.base import get_session
from app.schemas.common import ok
from app.schemas.research import ResearchRequest
from app.services.research_service import ResearchService

router = APIRouter()


@router.post("/query")
async def query(
    payload: ResearchRequest,
    session: AsyncSession = Depends(get_session),
    workspace_id: str = Depends(get_workspace_id),
):
    svc = ResearchService(session)
    # Prefer the header-provided workspace; fall back to the payload value.
    ws = workspace_id if workspace_id != DEFAULT_WORKSPACE_ID else payload.workspace_id
    view = await svc.run_query(
        question=payload.question,
        document_ids=payload.document_ids or None,
        workspace_id=ws,
    )
    return ok(view.model_dump(mode="json"))


@router.get("/history")
async def history(
    session: AsyncSession = Depends(get_session),
    workspace_id: str = Depends(get_workspace_id),
):
    svc = ResearchService(session)
    items = await svc.list_sessions(workspace_id=workspace_id)
    return ok([i.model_dump(mode="json") for i in items])


@router.delete("/history/{sid}")
async def delete_history(sid: str, session: AsyncSession = Depends(get_session)):
    svc = ResearchService(session)
    rs = await svc.repo.get_session(sid)
    if not rs:
        raise HTTPException(status_code=404, detail="Session not found")
    await session.delete(rs)
    await session.commit()
    return ok({"deleted": True})
