"""Concrete embedding providers."""
from __future__ import annotations

import hashlib
import math
import threading
from typing import Sequence

from app.core.config import get_settings
from app.core.logging import get_logger
from app.retrieval.embeddings.base import EmbeddingProvider

log = get_logger(__name__)


class BGEEmbeddingProvider(EmbeddingProvider):
    """Local sentence-transformers embeddings (default: BAAI/bge-* family).

    Requires `sentence-transformers`. If it can't be loaded, construction
    raises so the factory can fall back to the hash provider.
    """

    name = "sentence-transformers"
    backend = "sentence-transformers"

    def __init__(self) -> None:
        from sentence_transformers import SentenceTransformer  # may raise

        s = get_settings()
        log.info("Loading embedding model: {}", s.embedding_model)
        self._model = SentenceTransformer(s.embedding_model)
        self._dim = int(self._model.get_sentence_embedding_dimension())
        self._lock = threading.Lock()
        log.info("Embedding provider ready ({}, dim={})", s.embedding_model, self._dim)

    @property
    def dim(self) -> int:
        return self._dim

    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        if not texts:
            return []
        with self._lock:
            vecs = self._model.encode(
                list(texts),
                normalize_embeddings=True,
                convert_to_numpy=True,
                show_progress_bar=False,
            )
        return [v.tolist() for v in vecs]


class HashEmbeddingProvider(EmbeddingProvider):
    """Deterministic hash-based embeddings — a dependency-free fallback so the
    app boots without model weights. Enough signal for the hybrid demo (BM25
    dominates; dense acts as a tie-breaker)."""

    name = "hash"
    backend = "hash"

    def __init__(self) -> None:
        self._dim = get_settings().embedding_dim

    @property
    def dim(self) -> int:
        return self._dim

    def embed(self, texts: Sequence[str]) -> list[list[float]]:
        return [_hash_embed(t, self._dim) for t in texts]


def _hash_embed(text: str, dim: int) -> list[float]:
    vec = [0.0] * dim
    tokens = [w for w in text.lower().split() if w]
    if not tokens:
        return vec
    for i, w in enumerate(tokens):
        for ngram in (w, tokens[i - 1] + " " + w if i else w):
            h = int.from_bytes(
                hashlib.blake2b(ngram.encode("utf-8"), digest_size=8).digest(), "big"
            )
            idx = h % dim
            sign = 1.0 if (h >> 63) & 1 else -1.0
            vec[idx] += sign
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]
