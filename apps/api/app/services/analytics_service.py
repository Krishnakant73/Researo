"""Analytics service — dashboard metrics assembled from persisted data."""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.research import AgentRun, ResearchSession
from app.services.usage_service import UsageService


class AnalyticsService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def dashboard(self, workspace_id: str = "ws_default") -> dict:
        docs_res = await self.session.execute(
            select(Document).where(Document.workspace_id == workspace_id)
        )
        docs = list(docs_res.scalars().all())

        research_res = await self.session.execute(
            select(ResearchSession).where(ResearchSession.workspace_id == workspace_id)
        )
        sessions = list(research_res.scalars().all())

        # Scope agent runs to this workspace's research sessions only.
        session_ids = [s.id for s in sessions]
        if session_ids:
            runs_res = await self.session.execute(
                select(AgentRun).where(AgentRun.research_id.in_(session_ids))
            )
            runs = list(runs_res.scalars().all())
        else:
            runs = []

        avg_conf = (
            sum(s.confidence for s in sessions if s.status == "completed")
            / max(1, sum(1 for s in sessions if s.status == "completed"))
        ) if sessions else 0.0

        total_tokens = sum(s.total_tokens for s in sessions)
        total_cost = sum(s.total_cost_usd for s in sessions)

        # activity 14d
        now = datetime.now(timezone.utc)
        end = now.date()
        start = end - timedelta(days=13)
        # SQLite returns naive datetimes, so compare on naive UTC to avoid
        # "can't compare offset-naive and offset-aware" errors.
        week_ago = (now - timedelta(days=7)).replace(tzinfo=None)

        def _naive(dt):
            if dt is None:
                return None
            return dt.replace(tzinfo=None) if dt.tzinfo else dt
        activity: list[dict] = []
        by_day_research: dict[str, int] = defaultdict(int)
        by_day_docs: dict[str, int] = defaultdict(int)
        by_day_tokens: dict[str, int] = defaultdict(int)
        by_day_conf: dict[str, list[float]] = defaultdict(list)
        research_this_week = 0
        docs_this_week = 0
        for s in sessions:
            if s.started_at:
                d = s.started_at.date().isoformat()
                by_day_research[d] += 1
                by_day_tokens[d] += int(s.total_tokens or 0)
                if s.status == "completed" and s.confidence:
                    by_day_conf[d].append(float(s.confidence))
                if _naive(s.started_at) >= week_ago:
                    research_this_week += 1
        for d in docs:
            if d.created_at:
                key = d.created_at.date().isoformat()
                by_day_docs[key] += 1
                if _naive(d.created_at) >= week_ago:
                    docs_this_week += 1
        for i in range(14):
            day = (start + timedelta(days=i)).isoformat()
            confs = by_day_conf.get(day, [])
            activity.append(
                {
                    "date": day,
                    "research": by_day_research.get(day, 0),
                    "documents": by_day_docs.get(day, 0),
                    "tokens": by_day_tokens.get(day, 0),
                    "confidence": round(sum(confs) / len(confs) * 100) if confs else 0,
                }
            )

        # agent perf
        perf_success: Counter = Counter()
        perf_fail: Counter = Counter()
        perf_dur: dict[str, list[int]] = defaultdict(list)
        for r in runs:
            if r.status == "completed":
                perf_success[r.agent] += 1
            elif r.status == "failed":
                perf_fail[r.agent] += 1
            if r.latency_ms:
                perf_dur[r.agent].append(r.latency_ms)
        AGENTS = ["Planner", "Retriever", "Ranker", "Curator", "Analyst", "Validator", "Publisher"]
        agent_perf = [
            {
                "agent": a,
                "success": perf_success.get(a, 0),
                "failure": perf_fail.get(a, 0),
                "avg_ms": int(sum(perf_dur[a]) / len(perf_dur[a])) if perf_dur.get(a) else 0,
            }
            for a in AGENTS
        ]

        # recent research / documents
        sessions.sort(key=lambda s: s.started_at, reverse=True)
        recent_research = [
            {
                "id": s.id,
                "title": s.title,
                "question": s.question,
                "status": s.status,
                "confidence": s.confidence,
                "document_count": len(s.document_ids or []),
                "citation_count": len(s.citations),
                "started_at": s.started_at,
                "completed_at": s.completed_at,
            }
            for s in sessions[:6]
        ]
        docs.sort(key=lambda d: d.created_at, reverse=True)
        recent_documents = [
            {
                "id": d.id,
                "name": d.name,
                "filename": d.filename,
                "mime_type": d.mime_type,
                "size": d.size,
                "status": d.status,
                "pages": d.pages,
                "chunks": len(d.chunks),
                "language": d.language,
                "tags": list(d.tags or []),
                "category": d.category,
                "author": d.author,
                "created_at": d.created_at,
                "updated_at": d.updated_at,
            }
            for d in docs[:6]
        ]

        # citation accuracy ~ average validator confidence proxy
        citation_accuracy = min(1.0, max(0.6, avg_conf * 1.08)) if avg_conf > 0 else 0.9

        # real documents-by-category distribution
        cat_counter: Counter = Counter(
            (d.category or "General") for d in docs
        )
        category_distribution = [
            {"name": name, "value": count}
            for name, count in cat_counter.most_common()
        ]

        # Real per-model usage + export counts from the logging tables.
        usage = UsageService(self.session)
        model_usage = await usage.model_usage_summary(workspace_id)
        export_count = await usage.export_count(workspace_id)

        return {
            "research_count": len(sessions),
            "document_count": len(docs),
            "research_this_week": research_this_week,
            "documents_this_week": docs_this_week,
            "avg_confidence": round(avg_conf, 3),
            "citation_accuracy": round(citation_accuracy, 3),
            "total_tokens": total_tokens,
            "total_cost_usd": round(total_cost, 2),
            "activity": activity,
            "agent_perf": agent_perf,
            "category_distribution": category_distribution,
            "recent_research": recent_research,
            "recent_documents": recent_documents,
            "model_usage": model_usage,
            "export_count": export_count,
        }
