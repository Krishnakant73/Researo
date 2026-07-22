"""Analytics endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_workspace_id
from app.db.base import get_session
from app.schemas.common import ok
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get("/dashboard")
async def dashboard(
    session: AsyncSession = Depends(get_session),
    workspace_id: str = Depends(get_workspace_id),
):
    svc = AnalyticsService(session)
    return ok(await svc.dashboard(workspace_id=workspace_id))
