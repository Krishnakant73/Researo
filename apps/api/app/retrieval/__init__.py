"""Retrieval package — embedding providers + vector store + hybrid search.

Public surface is intentionally small: application code depends on the
`get_*` factories and the interface types, never on concrete engines.
"""
from app.retrieval.embeddings import get_embedder, EmbeddingProvider
from app.retrieval.vector_store import (
    get_vector_store,
    VectorStore,
    VectorRecord,
    VectorHit,
)
from app.retrieval.search import get_search_service, SearchService

__all__ = [
    "get_embedder",
    "EmbeddingProvider",
    "get_vector_store",
    "VectorStore",
    "VectorRecord",
    "VectorHit",
    "get_search_service",
    "SearchService",
]
