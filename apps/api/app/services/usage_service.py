"""Usage service — export history + model-usage aggregation."""
from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.usage import ExportHistory, ModelUsage

_VALID_FORMATS = {"pdf", "markdown", "json", "share", "link", "csv"}


class UsageService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def log_export(
        self, *, report_id: str | None, fmt: str, workspace_id: str
    ) -> ExportHistory:
        fmt = (fmt or "").lower().strip()
        if fmt not in _VALID_FORMATS:
            fmt = "other"
        row = ExportHistory(workspace_id=workspace_id, report_id=report_id, format=fmt)
        self.session.add(row)
        await self.session.commit()
        await self.session.refresh(row)
        return row

    async def export_count(self, workspace_id: str) -> int:
        n = await self.session.scalar(
            select(func.count(ExportHistory.id)).where(
                ExportHistory.workspace_id == workspace_id
            )
        )
        return int(n or 0)

    async def model_usage_summary(self, workspace_id: str) -> list[dict]:
        """Aggregate model usage (tokens/cost/calls) per model for a workspace."""
        res = await self.session.execute(
            select(
                ModelUsage.model,
                func.count(ModelUsage.id),
                func.sum(ModelUsage.tokens),
                func.sum(ModelUsage.cost_usd),
            )
            .where(ModelUsage.workspace_id == workspace_id)
            .group_by(ModelUsage.model)
            .order_by(func.sum(ModelUsage.tokens).desc())
        )
        out: list[dict] = []
        for model, calls, tokens, cost in res.all():
            out.append(
                {
                    "model": model,
                    "calls": int(calls or 0),
                    "tokens": int(tokens or 0),
                    "cost_usd": round(float(cost or 0.0), 4),
                }
            )
        return out
