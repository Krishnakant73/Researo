"""Embeddings package — interface + providers + factory."""
from __future__ import annotations

from functools import lru_cache

from app.core.config import get_settings
from app.core.logging import get_logger
from app.retrieval.embeddings.base import EmbeddingProvider

log = get_logger(__name__)

__all__ = ["get_embedder", "EmbeddingProvider"]


def _build() -> EmbeddingProvider:
    s = get_settings()
    provider = (s.embedding_provider or "bge").strip().lower()

    if provider in {"bge", "sentence-transformers", "st"} and s.use_local_embeddings:
        try:
            from app.retrieval.embeddings.providers import BGEEmbeddingProvider

            return BGEEmbeddingProvider()
        except Exception as e:
            log.warning(
                "Local embedding model unavailable ({}); using hash fallback. "
                "Install `sentence-transformers` for real embeddings.",
                e,
            )

    from app.retrieval.embeddings.providers import HashEmbeddingProvider

    return HashEmbeddingProvider()


@lru_cache
def get_embedder() -> EmbeddingProvider:
    return _build()
