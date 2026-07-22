"""Repository for research sessions, agent runs, evidence, citations, reports."""
from __future__ import annotations

from typing import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.research import (
    ResearchSession,
    AgentRun,
    Evidence,
    Citation,
    Finding,
    Report,
)


class ResearchRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_session(self, **fields) -> ResearchSession:
        rs = ResearchSession(**fields)
        self.session.add(rs)
        await self.session.flush()
        return rs

    async def get_session(self, sid: str) -> ResearchSession | None:
        return await self.session.get(ResearchSession, sid)

    async def list_sessions(self, workspace_id: str = "ws_default") -> list[ResearchSession]:
        res = await self.session.execute(
            select(ResearchSession)
            .where(ResearchSession.workspace_id == workspace_id)
            .order_by(ResearchSession.started_at.desc())
        )
        return list(res.scalars().all())

    async def add_evidence(self, items: Iterable[Evidence]) -> None:
        self.session.add_all(list(items))
        await self.session.flush()

    async def add_citations(self, items: Iterable[Citation]) -> None:
        self.session.add_all(list(items))
        await self.session.flush()

    async def add_findings(self, items: Iterable[Finding]) -> None:
        self.session.add_all(list(items))
        await self.session.flush()

    async def add_runs(self, items: Iterable[AgentRun]) -> None:
        self.session.add_all(list(items))
        await self.session.flush()

    async def upsert_report(self, report: Report) -> Report:
        self.session.add(report)
        await self.session.flush()
        return report

    async def get_report(self, report_id: str) -> Report | None:
        return await self.session.get(Report, report_id)

    async def list_reports(self, workspace_id: str = "ws_default") -> list[Report]:
        res = await self.session.execute(
            select(Report)
            .where(Report.workspace_id == workspace_id)
            .order_by(Report.created_at.desc())
        )
        return list(res.scalars().all())
