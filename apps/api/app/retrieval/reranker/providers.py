"""Concrete rerankers."""
from __future__ import annotations

from functools import lru_cache
from typing import Optional, Sequence

from app.core.config import get_settings
from app.core.logging import get_logger
from app.retrieval.reranker.base import Reranker

log = get_logger(__name__)


class CrossEncoderReranker(Reranker):
    """sentence-transformers CrossEncoder (default ms-marco-MiniLM; swap for
    BAAI/bge-reranker-v2-m3 via RERANKER_MODEL). Loads lazily and degrades
    gracefully to None when the model/deps are unavailable."""

    name = "cross-encoder"

    def __init__(self, model_name: str) -> None:
        self._model_name = model_name

    @lru_cache(maxsize=1)
    def _model(self):  # cached per instance-method-call
        try:
            from sentence_transformers import CrossEncoder

            m = CrossEncoder(self._model_name)
            log.info("Cross-encoder reranker ready ({})", self._model_name)
            return m
        except Exception as e:  # pragma: no cover - optional dep / download
            log.warning("Cross-encoder unavailable ({}); heuristic rerank will be used", e)
            return None

    def is_available(self) -> bool:
        return self._model() is not None

    def rerank(self, query: str, texts: Sequence[str]) -> Optional[list[float]]:
        model = self._model()
        if model is None or not texts:
            return None
        try:
            scores = model.predict([(query, t) for t in texts])
            return [float(s) for s in scores]
        except Exception as e:  # pragma: no cover
            log.warning("Rerank failed ({}); falling back", e)
            return None


class NoopReranker(Reranker):
    """Disables reranking; the pipeline uses its heuristic instead."""

    name = "none"

    def is_available(self) -> bool:
        return False

    def rerank(self, query: str, texts: Sequence[str]) -> Optional[list[float]]:
        return None
