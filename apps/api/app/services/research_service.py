"""Research service — orchestrates the LangGraph pipeline and persists results."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.pipeline import run_research_pipeline
from app.core.ids import report_id
from app.core.logging import get_logger
from app.core.pricing import agent_cost, provider_of
from app.models.research import (
    AgentRun,
    Citation,
    Evidence,
    Finding,
    Report,
    ResearchSession,
)
from app.models.usage import ModelUsage, ResearchJob
from app.repositories.research_repo import ResearchRepository
from app.schemas.research import (
    AgentStepView,
    CitationView,
    EvidenceView,
    FindingView,
    ReportView,
    ResearchSessionSummary,
)

log = get_logger(__name__)


class ResearchService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = ResearchRepository(session)

    async def list_sessions(self, workspace_id: str = "ws_default") -> list[ResearchSessionSummary]:
        sessions = await self.repo.list_sessions(workspace_id=workspace_id)
        return [
            ResearchSessionSummary(
                id=s.id,
                title=s.title,
                question=s.question,
                status=s.status,
                confidence=s.confidence,
                document_count=len(s.document_ids or []),
                citation_count=len(s.citations),
                started_at=s.started_at,
                completed_at=s.completed_at,
            )
            for s in sessions
        ]

    async def list_reports(self, workspace_id: str = "ws_default") -> list[ReportView]:
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        from app.models.research import Report, ResearchSession

        # Eager-load the whole graph so async lazy loading doesn't fail once
        # we hand off to _to_report_view.
        res = await self.session.execute(
            select(Report)
            .where(Report.workspace_id == workspace_id)
            .order_by(Report.created_at.desc())
            .options(
                selectinload(Report.research).selectinload(ResearchSession.citations),
                selectinload(Report.research).selectinload(ResearchSession.evidence),
                selectinload(Report.research).selectinload(ResearchSession.findings),
                selectinload(Report.research).selectinload(ResearchSession.runs),
            )
        )
        reports = list(res.scalars().all())
        return [await self._to_report_view(r.research, r) for r in reports]

    async def get_report(
        self, sid: str, workspace_id: str | None = None
    ) -> ReportView | None:
        from sqlalchemy import or_, select
        from sqlalchemy.orm import selectinload
        from app.models.research import Report, ResearchSession

        # Accept either a report id or a research id, and scope to the active
        # workspace when one is provided so reports can't be fetched across
        # workspace boundaries.
        stmt = (
            select(Report)
            .where(or_(Report.id == sid, Report.research_id == sid))
            .options(
                selectinload(Report.research).selectinload(ResearchSession.citations),
                selectinload(Report.research).selectinload(ResearchSession.evidence),
                selectinload(Report.research).selectinload(ResearchSession.findings),
                selectinload(Report.research).selectinload(ResearchSession.runs),
            )
        )
        if workspace_id:
            stmt = stmt.where(Report.workspace_id == workspace_id)
        res = await self.session.execute(stmt)
        rep = res.scalars().first()
        if not rep:
            return None
        return await self._to_report_view(rep.research, rep)

    async def _to_report_view(self, rs: ResearchSession, rep: Report) -> ReportView:
        citations = [
            CitationView(
                id=c.id,
                document_id=c.document_id,
                document_name=c.document_name,
                page=c.page,
                chunk_id=c.chunk_id,
                citation_text=c.citation_text,
                confidence=c.confidence,
                section=c.section,
            )
            for c in rs.citations
        ]
        evidence = [
            EvidenceView(
                id=e.id,
                document_id=e.document_id,
                document_name=e.document_name,
                page=e.page,
                chunk_id=e.chunk_id,
                text=e.text,
                score=e.score,
                confidence=e.confidence,
                section=e.section,
            )
            for e in rs.evidence
        ]
        findings_sorted = sorted(rs.findings, key=lambda f: f.ordinal)
        findings = [
            FindingView(
                id=f.id,
                claim=f.claim,
                detail=f.detail,
                confidence=f.confidence,
                citation_ids=list(f.citation_ids or []),
            )
            for f in findings_sorted
        ]
        agents = [
            AgentStepView(
                agent=r.agent,
                status=r.status,
                started_at=r.started_at,
                completed_at=r.completed_at,
                duration_ms=r.latency_ms,
                tokens=r.tokens,
                model=r.model,
                detail=r.detail,
            )
            for r in rs.runs
        ]
        return ReportView(
            id=rep.id,
            research_id=rs.id,
            title=rep.title,
            question=rs.question,
            status=rs.status,
            confidence=rs.confidence,
            summary=rep.summary,
            executive_summary=rep.executive_summary,
            methodology=rep.methodology,
            key_findings=findings,
            contradictions=list(rep.contradictions or []),
            recommendations=list(rep.recommendations or []),
            follow_up_questions=list(rep.follow_up_questions or []),
            citations=citations,
            evidence=evidence,
            agents=agents,
            markdown=rep.markdown,
            created_at=rep.created_at,
        )

    async def run_query(
        self,
        question: str,
        *,
        document_ids: list[str] | None = None,
        workspace_id: str = "ws_default",
    ) -> ReportView:
        rs = await self.repo.create_session(
            workspace_id=workspace_id,
            title=_derive_title(question),
            question=question,
            status="running",
            document_ids=document_ids or [],
        )
        # Track the run as a queryable job (lifecycle: running → completed/failed).
        job = ResearchJob(
            workspace_id=workspace_id,
            research_id=rs.id,
            question=question,
            status="running",
        )
        self.session.add(job)
        await self.session.commit()

        try:
            from app.services.settings_service import SettingsService

            cfg = await SettingsService(self.session).get_row()
            output = await run_research_pipeline(
                question,
                document_ids=document_ids,
                workspace_id=workspace_id,
                fast_model=cfg.fast_model,
                quality_model=cfg.quality_model,
                top_k=cfg.top_k_final,
                use_reranker=cfg.use_reranker,
            )

            rs.status = "completed"
            rs.confidence = output.confidence
            rs.completed_at = datetime.now(timezone.utc)
            rs.total_tokens = output.total_tokens
            rs.total_cost_usd = output.total_cost_usd

            # persist runs
            run_rows = [
                AgentRun(
                    research_id=rs.id,
                    agent=s.agent,
                    status=s.status,
                    started_at=s.started_at,
                    completed_at=s.completed_at,
                    latency_ms=s.duration_ms,
                    tokens=s.tokens,
                    model=s.model,
                    detail=s.detail,
                )
                for s in output.agents
            ]
            self.session.add_all(run_rows)

            # Persist per-LLM-call usage (AI execution log) for real analytics.
            usage_rows = [
                ModelUsage(
                    workspace_id=workspace_id,
                    research_id=rs.id,
                    agent=s.agent,
                    provider=provider_of(s.model),
                    model=s.model or "",
                    tokens=int(s.tokens or 0),
                    cost_usd=agent_cost(s.model, int(s.tokens or 0)),
                    latency_ms=int(s.duration_ms or 0),
                )
                for s in output.agents
                if s.model and int(s.tokens or 0) > 0
            ]
            if usage_rows:
                self.session.add_all(usage_rows)

            # evidence + citations
            self.session.add_all(
                Evidence(
                    id=e["id"],
                    research_id=rs.id,
                    document_id=e["document_id"],
                    document_name=e["document_name"],
                    page=e["page"],
                    chunk_id=e["chunk_id"],
                    text=e["text"],
                    score=e["score"],
                    confidence=e["confidence"],
                    section=e.get("section"),
                )
                for e in output.evidence
            )
            self.session.add_all(
                Citation(
                    id=c["id"],
                    research_id=rs.id,
                    document_id=c["document_id"],
                    document_name=c["document_name"],
                    page=c["page"],
                    chunk_id=c["chunk_id"],
                    citation_text=c["citation_text"],
                    confidence=c["confidence"],
                    section=c.get("section"),
                )
                for c in output.citations
            )
            self.session.add_all(
                Finding(
                    id=f["id"],
                    research_id=rs.id,
                    ordinal=f["ordinal"],
                    claim=f["claim"],
                    detail=f["detail"],
                    confidence=f["confidence"],
                    citation_ids=f["citation_ids"],
                )
                for f in output.findings
            )

            rep = Report(
                id=report_id(),
                research_id=rs.id,
                workspace_id=workspace_id,
                title=output.title,
                summary=output.summary,
                executive_summary=output.executive_summary,
                methodology=output.methodology,
                markdown=output.markdown,
                contradictions=output.contradictions,
                recommendations=output.recommendations,
                follow_up_questions=output.follow_up_questions,
                version=1,
            )
            self.session.add(rep)

            # Close out the job record.
            completed = datetime.now(timezone.utc)
            job.status = "completed"
            job.research_id = rs.id
            job.completed_at = completed
            job.duration_ms = _elapsed_ms(job.created_at, completed)

            await self.session.commit()
            await self.session.refresh(rs)
            await self.session.refresh(rep)
            return await self._to_report_view(rs, rep)
        except Exception as e:
            log.exception("Research failed: {}", e)
            # Discard any partially-added evidence/citations/findings/report so
            # we never persist an incomplete run, then record the failure.
            await self.session.rollback()
            rs = await self.session.get(ResearchSession, rs.id)
            job = await self.session.get(ResearchJob, job.id)
            if rs is not None:
                rs.status = "failed"
                rs.error_message = str(e)
            if job is not None:
                job.status = "failed"
                job.error_message = str(e)
                job.completed_at = datetime.now(timezone.utc)
            await self.session.commit()
            raise


def _derive_title(question: str) -> str:
    q = question.strip()
    return q if len(q) <= 80 else q[:78].rstrip() + "…"


def _elapsed_ms(start, end) -> int:
    try:
        return max(0, int((end - start).total_seconds() * 1000))
    except Exception:
        return 0
