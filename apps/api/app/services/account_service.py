"""Local account bootstrap.

Researo has no auth yet, so this ensures a single local user and a default
project exist, and backfills any workspaces that don't yet have an owner /
project. When real auth is added, only this bootstrap changes.
"""
from __future__ import annotations

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.user import DEFAULT_PROJECT_ID, LOCAL_USER_ID, Project, User
from app.models.workspace import Workspace

log = get_logger(__name__)


class AccountService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def ensure_local(self) -> tuple[User, Project]:
        user = await self.session.get(User, LOCAL_USER_ID)
        if user is None:
            user = User(
                id=LOCAL_USER_ID,
                email="you@researo.local",
                name="Researo User",
                role="owner",
                avatar="R",
            )
            self.session.add(user)

        project = await self.session.get(Project, DEFAULT_PROJECT_ID)
        if project is None:
            project = Project(
                id=DEFAULT_PROJECT_ID,
                owner_id=LOCAL_USER_ID,
                name="Default Project",
                description="Your default project.",
                color="R",
            )
            self.session.add(project)

        await self.session.flush()

        # Backfill workspaces that predate the project/owner columns.
        await self.session.execute(
            update(Workspace)
            .where(Workspace.project_id.is_(None))
            .values(project_id=DEFAULT_PROJECT_ID, owner_id=LOCAL_USER_ID)
        )
        await self.session.commit()
        return user, project

    async def get_local_user(self) -> User | None:
        return await self.session.get(User, LOCAL_USER_ID)

    async def list_projects(self) -> list[Project]:
        res = await self.session.execute(
            select(Project).where(Project.deleted_at.is_(None)).order_by(Project.created_at.asc())
        )
        return list(res.scalars().all())
