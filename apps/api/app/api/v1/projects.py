"""Project endpoints — the grouping above workspaces."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_session
from app.models.user import LOCAL_USER_ID, Project
from app.schemas.common import ok
from app.services.account_service import AccountService

router = APIRouter()


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: str | None = None
    color: str | None = None


def _view(p: Project) -> dict:
    return {
        "id": p.id,
        "owner_id": p.owner_id,
        "name": p.name,
        "description": p.description,
        "color": p.color,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
    }


@router.get("")
async def list_projects(session: AsyncSession = Depends(get_session)):
    svc = AccountService(session)
    await svc.ensure_local()
    projects = await svc.list_projects()
    return ok([_view(p) for p in projects])


@router.post("")
async def create_project(
    payload: ProjectCreate, session: AsyncSession = Depends(get_session)
):
    p = Project(
        owner_id=LOCAL_USER_ID,
        name=payload.name.strip(),
        description=payload.description,
        color=(payload.color or payload.name.strip()[:1].upper() or "P"),
    )
    session.add(p)
    await session.commit()
    await session.refresh(p)
    return ok(_view(p), message="Project created")
