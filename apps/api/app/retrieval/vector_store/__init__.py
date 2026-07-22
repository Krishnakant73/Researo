"""Vector store package — interface + implementations + factory.

Call sites import `get_vector_store()` and the `VectorStore` / `VectorRecord`
/ `VectorHit` types only. The concrete engine is chosen by config
(`VECTOR_BACKEND`), defaulting to ChromaDB, with an automatic, logged fallback
to the NumPy store when Chroma can't be initialised so the app never hard-fails.
"""
from __future__ import annotations

from functools import lru_cache

from app.core.config import get_settings
from app.core.logging import get_logger
from app.retrieval.vector_store.base import (
    Filter,
    VectorHit,
    VectorRecord,
    VectorStore,
)

log = get_logger(__name__)

__all__ = [
    "get_vector_store",
    "VectorStore",
    "VectorRecord",
    "VectorHit",
    "Filter",
]


def _build() -> VectorStore:
    backend = (get_settings().vector_backend or "chroma").strip().lower()

    if backend in {"chroma", "chromadb"}:
        try:
            from app.retrieval.vector_store.chroma_store import ChromaVectorStore

            return ChromaVectorStore()
        except Exception as e:
            log.warning(
                "ChromaDB unavailable ({}); falling back to the NumPy vector store. "
                "Install `chromadb` (or set VECTOR_BACKEND=numpy) to silence this.",
                e,
            )

    from app.retrieval.vector_store.numpy_store import NumpyVectorStore

    return NumpyVectorStore()


@lru_cache
def get_vector_store() -> VectorStore:
    store = _build()
    return store
