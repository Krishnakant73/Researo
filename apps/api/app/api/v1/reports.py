"""Report endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_workspace_id
from app.db.base import get_session
from app.schemas.common import ok
from app.services.research_service import ResearchService
from app.services.usage_service import UsageService

router = APIRouter()


class ExportLog(BaseModel):
    format: str


@router.get("")
async def list_reports(
    session: AsyncSession = Depends(get_session),
    workspace_id: str = Depends(get_workspace_id),
):
    svc = ResearchService(session)
    reports = await svc.list_reports(workspace_id=workspace_id)
    return ok([r.model_dump(mode="json") for r in reports])


@router.get("/{report_id}")
async def get_report(
    report_id: str,
    session: AsyncSession = Depends(get_session),
    workspace_id: str = Depends(get_workspace_id),
):
    svc = ResearchService(session)
    rep = await svc.get_report(report_id, workspace_id=workspace_id)
    if not rep:
        raise HTTPException(status_code=404, detail="Report not found")
    return ok(rep.model_dump(mode="json"))


@router.post("/{report_id}/exports")
async def log_export(
    report_id: str,
    payload: ExportLog,
    session: AsyncSession = Depends(get_session),
    workspace_id: str = Depends(get_workspace_id),
):
    """Record a report export/share for the audit trail & analytics."""
    row = await UsageService(session).log_export(
        report_id=report_id, fmt=payload.format, workspace_id=workspace_id
    )
    return ok({"id": row.id, "format": row.format})
