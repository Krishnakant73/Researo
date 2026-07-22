"""Embedding provider interface.

Design goal: generation sits behind an interface so the backend (BGE now,
OpenAI / Voyage / Jina / future models later) can change without touching
ingestion or retrieval code.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Sequence


class EmbeddingProvider(ABC):
    """Turns text into vectors. Implementations must return L2-normalised
    embeddings so cosine similarity == dot product."""

    name: str = "base"
    backend: str = "base"

    @property
    @abstractmethod
    def dim(self) -> int:
        """Embedding dimensionality."""

    @abstractmethod
    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        """Embed a batch of documents/chunks."""

    def embed_query(self, text: str) -> list[float]:
        """Embed a single query. Overridable when a provider distinguishes
        query vs. document embeddings; defaults to the batch path."""
        out = self.embed([text])
        return out[0] if out else []
