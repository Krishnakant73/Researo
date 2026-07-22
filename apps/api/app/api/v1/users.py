"""User endpoints (single local user until auth is added)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_session
from app.schemas.common import ok
from app.services.account_service import AccountService

router = APIRouter()


@router.get("/me")
async def me(session: AsyncSession = Depends(get_session)):
    svc = AccountService(session)
    user = await svc.get_local_user()
    if user is None:
        user, _ = await svc.ensure_local()
    return ok(
        {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "avatar": user.avatar,
            "created_at": user.created_at,
        }
    )
