"""Reranker package — interface + providers + factory.

Backwards-compatible module-level `rerank()` / `is_available()` are kept so
existing call sites (the agent pipeline) don't need to change.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Optional, Sequence

from app.core.config import get_settings
from app.retrieval.reranker.base import Reranker

__all__ = ["get_reranker", "Reranker", "rerank", "is_available"]


@lru_cache
def get_reranker() -> Reranker:
    s = get_settings()
    backend = (s.reranker_backend or "cross-encoder").strip().lower()
    if backend in {"cross-encoder", "crossencoder", "ce"}:
        from app.retrieval.reranker.providers import CrossEncoderReranker

        return CrossEncoderReranker(s.reranker_model)
    from app.retrieval.reranker.providers import NoopReranker

    return NoopReranker()


def rerank(query: str, texts: Sequence[str]) -> Optional[list[float]]:
    return get_reranker().rerank(query, texts)


def is_available() -> bool:
    return get_reranker().is_available()
