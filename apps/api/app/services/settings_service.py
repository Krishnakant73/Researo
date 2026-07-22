"""Runtime settings service — persists a single editable config row."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.app_setting import AppSetting
from app.schemas.settings import SettingsUpdate, SettingsView

SETTINGS_ID = "default"


class SettingsService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_row(self) -> AppSetting:
        row = await self.session.get(AppSetting, SETTINGS_ID)
        if row is None:
            s = get_settings()
            row = AppSetting(
                id=SETTINGS_ID,
                default_model=s.default_model,
                fast_model=s.fast_model,
                quality_model=s.quality_model,
                top_k_dense=s.top_k_dense,
                top_k_bm25=s.top_k_bm25,
                top_k_final=s.top_k_final,
                use_reranker=True,
            )
            self.session.add(row)
            await self.session.commit()
            await self.session.refresh(row)
        return row

    async def view(self) -> SettingsView:
        row = await self.get_row()
        s = get_settings()
        backend = ""
        try:
            from app.retrieval import get_embedder

            backend = get_embedder().backend
        except Exception:
            backend = "unknown"
        return SettingsView(
            default_model=row.default_model,
            fast_model=row.fast_model,
            quality_model=row.quality_model,
            top_k_dense=row.top_k_dense,
            top_k_bm25=row.top_k_bm25,
            top_k_final=row.top_k_final,
            use_reranker=row.use_reranker,
            llm_live=bool(s.openrouter_api_key),
            embedding_model=s.embedding_model,
            embedding_backend=backend,
        )

    async def update(self, payload: SettingsUpdate) -> SettingsView:
        row = await self.get_row()
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(row, field, value)
        row.updated_at = datetime.now(timezone.utc)
        await self.session.commit()
        await self.session.refresh(row)
        return await self.view()
