"""FastAPI application entrypoint."""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

import orjson
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1 import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger
from app.db.base import Base, engine

log = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    settings = get_settings()
    log.info("Starting Researo API · env={} · db={}", settings.app_env, settings.database_url)
    # ensure tables
    async with engine.begin() as conn:
        # import models so they register with the Base metadata
        from app.models import (  # noqa: F401
            document,
            research,
            workspace,
            app_setting,
            user,
            usage,
        )
        await conn.run_sync(Base.metadata.create_all)
    # Reconcile columns added to existing tables (create_all doesn't ALTER).
    from app.db.migrate import ensure_schema
    await ensure_schema()
    log.info("DB ready")

    # Ensure the default workspace, local user and default project exist.
    from app.db.base import SessionLocal
    from app.services.account_service import AccountService
    from app.services.workspace_service import WorkspaceService
    async with SessionLocal() as session:
        await WorkspaceService(session).ensure_default()
        await AccountService(session).ensure_local()

    # Seed demo data on first boot
    from app.tasks.seed import seed_if_empty
    await seed_if_empty()

    # Self-heal: rebuild the vector index from the DB if the store is empty
    # (e.g. after switching vector backend or mounting a fresh volume).
    try:
        from app.tasks.index import rebuild_index_if_empty
        await rebuild_index_if_empty()
    except Exception as e:  # pragma: no cover - best effort
        log.warning("Index self-heal failed: {}", e)

    # Warm the embedding model in the background so the first upload/research
    # doesn't pay the (one-time) model-load cost — uploads feel instant.
    async def _warm_embedder() -> None:
        try:
            from app.retrieval import get_embedder

            await asyncio.to_thread(get_embedder)
            log.info("Embedding model warmed")
        except Exception as e:  # pragma: no cover - best effort
            log.warning("Embedder warm-up failed: {}", e)

    asyncio.create_task(_warm_embedder())

    yield
    log.info("Shutting down")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Researo API",
        version="0.1.0",
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
    )
    origins = settings.cors_list
    allow_all = (not origins) or ("*" in origins)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if allow_all else origins,
        # Credentials can't be combined with "*"; we authenticate via the
        # X-Workspace-Id header (not cookies), so this is safe.
        allow_credentials=not allow_all,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router)

    @app.get("/")
    async def root():
        return {"success": True, "data": {"service": "researo", "docs": "/docs"}}

    @app.exception_handler(StarletteHTTPException)
    async def http_error_handler(request: Request, exc: StarletteHTTPException):
        return ORJSONResponse(
            {"success": False, "error": {"code": f"HTTP_{exc.status_code}", "message": exc.detail}},
            status_code=exc.status_code,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(request: Request, exc: RequestValidationError):
        return ORJSONResponse(
            {
                "success": False,
                "error": {"code": "VALIDATION_ERROR", "message": "Invalid request payload", "detail": exc.errors()},
            },
            status_code=422,
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception):
        log.exception("Unhandled error: {}", exc)
        return ORJSONResponse(
            {"success": False, "error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred"}},
            status_code=500,
        )

    return app


app = create_app()
