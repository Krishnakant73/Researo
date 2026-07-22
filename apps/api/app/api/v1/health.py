"""Health and status endpoints."""
from __future__ import annotations

from fastapi import APIRouter

from app.core.config import get_settings
from app.retrieval.embeddings import get_embedder
from app.retrieval.vector_store import get_vector_store
from app.gateway.llm import get_llm_gateway
from app.schemas.common import ok

router = APIRouter()


@router.get("/health")
async def health():
    return {"success": True, "status": "ok"}


@router.get("/status")
async def status():
    s = get_settings()
    llm = get_llm_gateway()
    emb = get_embedder()
    vs = get_vector_store()
    return ok(
        {
            "environment": s.app_env,
            "llm": {
                "live": llm.is_live,
                "default_model": llm.default_model,
                "provider": "openrouter" if llm.is_live else "offline",
                # Masked — confirms a key is configured without exposing it.
                "key": s.openrouter_key_masked or "not configured",
            },
            "embeddings": {"backend": emb.backend, "dim": emb.dim, "model": s.embedding_model},
            "vector_store": vs.health(),
            "reranker": {"backend": s.reranker_backend, "model": s.reranker_model},
        }
    )
