"""Reranker interface.

After vector retrieval returns a broad candidate set, a reranker scores each
(query, passage) pair to promote the most relevant few. Kept pluggable so the
cross-encoder can be swapped (e.g. BAAI/bge-reranker-v2-m3) without touching
the pipeline.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional, Sequence


class Reranker(ABC):
    name: str = "base"

    @abstractmethod
    def is_available(self) -> bool:
        """Whether the reranker can actually score (model loaded)."""

    @abstractmethod
    def rerank(self, query: str, texts: Sequence[str]) -> Optional[list[float]]:
        """Return one relevance score per text, or None when unavailable so the
        caller can fall back to a heuristic."""
