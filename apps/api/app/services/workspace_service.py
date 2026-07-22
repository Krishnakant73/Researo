"""Workspace service — CRUD plus per-workspace document/research counts."""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.document import Document
from app.models.research import ResearchSession
from app.models.workspace import Workspace
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate, WorkspaceView

log = get_logger(__name__)

DEFAULT_WORKSPACE_ID = "ws_default"


class WorkspaceService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def ensure_default(self) -> Workspace:
        """Create the default workspace row if it does not exist yet."""
        ws = await self.session.get(Workspace, DEFAULT_WORKSPACE_ID)
        if ws:
            return ws
        ws = Workspace(
            id=DEFAULT_WORKSPACE_ID,
            name="Default Workspace",
            description="Your starting workspace.",
            color="R",
            plan="Free",
        )
        self.session.add(ws)
        await self.session.commit()
        return ws

    async def _counts(self, workspace_id: str) -> tuple[int, int]:
        doc_count = await self.session.scalar(
            select(func.count(Document.id)).where(
                Document.workspace_id == workspace_id
            )
        )
        res_count = await self.session.scalar(
            select(func.count(ResearchSession.id)).where(
                ResearchSession.workspace_id == workspace_id
            )
        )
        return int(doc_count or 0), int(res_count or 0)

    async def _to_view(self, ws: Workspace) -> WorkspaceView:
        docs, research = await self._counts(ws.id)
        return WorkspaceView(
            id=ws.id,
            name=ws.name,
            description=ws.description,
            color=ws.color,
            plan=ws.plan,
            document_count=docs,
            research_count=research,
            created_at=ws.created_at,
            updated_at=ws.updated_at,
        )

    async def list(self) -> list[WorkspaceView]:
        await self.ensure_default()
        res = await self.session.execute(
            select(Workspace).order_by(Workspace.created_at.asc())
        )
        return [await self._to_view(w) for w in res.scalars().all()]

    async def get(self, workspace_id: str) -> WorkspaceView | None:
        ws = await self.session.get(Workspace, workspace_id)
        if not ws:
            return None
        return await self._to_view(ws)

    async def create(self, payload: WorkspaceCreate) -> WorkspaceView:
        ws = Workspace(
            name=payload.name.strip(),
            description=payload.description,
            color=(payload.color or payload.name.strip()[:1].upper() or "W"),
            plan=payload.plan,
        )
        self.session.add(ws)
        await self.session.commit()
        await self.session.refresh(ws)
        return await self._to_view(ws)

    async def update(
        self, workspace_id: str, payload: WorkspaceUpdate
    ) -> WorkspaceView | None:
        ws = await self.session.get(Workspace, workspace_id)
        if not ws:
            return None
        if payload.name is not None:
            ws.name = payload.name.strip()
        if payload.description is not None:
            ws.description = payload.description
        if payload.color is not None:
            ws.color = payload.color
        if payload.plan is not None:
            ws.plan = payload.plan
        ws.updated_at = datetime.now(timezone.utc)
        await self.session.commit()
        await self.session.refresh(ws)
        return await self._to_view(ws)

    async def delete(self, workspace_id: str) -> bool:
        """Delete a workspace and everything it owns.

        Removes, for this workspace:
          - vector embeddings (via the VectorStore interface)
          - documents + their chunks (SQL cascade)
          - research sessions + reports (SQL cascade)
          - source files on disk
          - the workspace row itself
        The default workspace is protected.
        """
        if workspace_id == DEFAULT_WORKSPACE_ID:
            return False
        ws = await self.session.get(Workspace, workspace_id)
        if not ws:
            return False

        # 1) Vector embeddings.
        try:
            from app.retrieval import get_search_service, get_vector_store

            get_vector_store().delete_workspace(workspace_id)
            get_search_service().mark_dirty()
        except Exception as e:
            log.warning("Vector delete_workspace failed for {}: {}", workspace_id, e)

        # 2) Documents (+ chunks via relationship cascade) and their files.
        docs = (
            await self.session.execute(
                select(Document).where(Document.workspace_id == workspace_id)
            )
        ).scalars().all()
        for d in docs:
            try:
                sp = str(d.storage_path or "")
                if sp and not sp.startswith("synthetic://"):
                    p = Path(sp)
                    if p.exists():
                        p.unlink()
            except Exception:
                pass
            await self.session.delete(d)

        # 3) Research sessions (+ reports/evidence/citations/model_usage via cascade).
        sessions = (
            await self.session.execute(
                select(ResearchSession).where(
                    ResearchSession.workspace_id == workspace_id
                )
            )
        ).scalars().all()
        for rs in sessions:
            await self.session.delete(rs)

        # 4) Workspace-scoped logging rows that have no FK relationship.
        from app.models.usage import ExportHistory, ModelUsage, ResearchJob

        for model in (ModelUsage, ResearchJob, ExportHistory):
            await self.session.execute(
                delete(model).where(model.workspace_id == workspace_id)
            )

        # 5) The workspace row.
        await self.session.delete(ws)
        await self.session.commit()
        log.info(
            "Deleted workspace {} · {} documents · {} sessions",
            workspace_id,
            len(docs),
            len(sessions),
        )
        return True
