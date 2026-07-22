"""Runtime settings endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_session
from app.schemas.common import ok
from app.schemas.settings import SettingsUpdate
from app.services.settings_service import SettingsService

router = APIRouter()


@router.get("")
async def get_settings_endpoint(session: AsyncSession = Depends(get_session)):
    svc = SettingsService(session)
    view = await svc.view()
    return ok(view.model_dump(mode="json"))


@router.put("")
async def update_settings_endpoint(
    payload: SettingsUpdate, session: AsyncSession = Depends(get_session)
):
    svc = SettingsService(session)
    view = await svc.update(payload)
    return ok(view.model_dump(mode="json"), message="Settings saved")
