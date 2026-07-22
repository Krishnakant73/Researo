from fastapi import APIRouter

from app.api.v1 import (
    documents,
    research,
    reports,
    analytics,
    search,
    health,
    workspaces,
    settings,
    users,
    projects,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router, tags=["health"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["workspaces"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(research.router, prefix="/research", tags=["research"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(search.router, prefix="/search", tags=["search"])

__all__ = ["api_router"]
