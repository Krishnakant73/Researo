"""Hybrid retrieval: BM25 (lexical) + dense (semantic) with reciprocal-rank fusion.

Dense retrieval goes through the `VectorStore` interface, so the engine
(ChromaDB, or the NumPy fallback) is transparent to this module.
"""
from __future__ import annotations

import re
import threading
from dataclasses import dataclass
from functools import lru_cache
from typing import Optional

from rank_bm25 import BM25Okapi

from app.core.config import get_settings
from app.core.logging import get_logger
from app.retrieval.embeddings import get_embedder
from app.retrieval.vector_store import Filter, get_vector_store

log = get_logger(__name__)

_TOKEN_RE = re.compile(r"[A-Za-z0-9]+")


def _tok(text: str) -> list[str]:
    return _TOKEN_RE.findall(text.lower())


@dataclass
class Hit:
    chunk_id: str
    document_id: str
    document_name: str
    page: int
    section: Optional[str]
    text: str
    score: float


class SearchService:
    def __init__(self) -> None:
        self._vs = get_vector_store()
        self._emb = get_embedder()
        # BM25 indexes are cached per workspace so switching workspaces doesn't
        # search the wrong corpus.
        self._bm25: dict[str, BM25Okapi] = {}
        self._bm25_ids: dict[str, list[str]] = {}
        self._bm25_meta: dict[str, dict[str, dict]] = {}
        self._bm25_docs: dict[str, dict[str, str]] = {}
        self._bm25_lock = threading.Lock()
        self._dirty = True

    def mark_dirty(self) -> None:
        # A document changed — invalidate every workspace's cached index.
        self._dirty = True

    def _rebuild_bm25(self, workspace_id: str) -> None:
        with self._bm25_lock:
            if self._dirty:
                self._bm25.clear()
                self._bm25_ids.clear()
                self._bm25_meta.clear()
                self._bm25_docs.clear()
                self._dirty = False
            if workspace_id in self._bm25_ids:
                return  # already built for this workspace (possibly empty)
            items = self._vs.all_docs(workspace_id=workspace_id)
            self._bm25_ids[workspace_id] = [it.id for it in items]
            self._bm25_meta[workspace_id] = {it.id: it.metadata for it in items}
            self._bm25_docs[workspace_id] = {it.id: it.document for it in items}
            if items:
                corpus = [_tok(it.document) for it in items]
                self._bm25[workspace_id] = BM25Okapi(corpus)
            log.info("BM25 rebuilt · ws={} · {} chunks", workspace_id, len(items))

    def search(
        self,
        query: str,
        *,
        top_k: Optional[int] = None,
        top_k_dense: Optional[int] = None,
        top_k_bm25: Optional[int] = None,
        workspace_id: str = "ws_default",
        document_ids: Optional[list[str]] = None,
    ) -> list[Hit]:
        settings = get_settings()
        top_k = top_k or settings.top_k_final
        top_k_dense = top_k_dense or settings.top_k_dense
        top_k_bm25 = top_k_bm25 or settings.top_k_bm25

        if self._dirty or workspace_id not in self._bm25_ids:
            self._rebuild_bm25(workspace_id=workspace_id)

        bm25 = self._bm25.get(workspace_id)
        bm25_ids = self._bm25_ids.get(workspace_id, [])
        bm25_meta = self._bm25_meta.get(workspace_id, {})
        bm25_docs = self._bm25_docs.get(workspace_id, {})

        # Dense (semantic) retrieval via the VectorStore interface.
        dense_ranked: list[tuple[str, float]] = []
        try:
            qvec = self._emb.embed_query(query)
            filters: Filter = {"workspace_id": workspace_id}
            if document_ids:
                filters["document_id"] = {"$in": document_ids}
            hits = self._vs.query(qvec, top_k=top_k_dense, filters=filters)
            for h in hits:
                dense_ranked.append((h.id, h.similarity))
        except Exception as e:
            log.warning("Dense retrieval failed: {}", e)

        # Lexical (BM25) retrieval.
        bm25_ranked: list[tuple[str, float]] = []
        if bm25 is not None and bm25_ids:
            tokens = _tok(query)
            if tokens:
                scores = bm25.get_scores(tokens)
                order = sorted(range(len(scores)), key=lambda i: -scores[i])[: top_k_bm25 * 2]
                for i in order:
                    if scores[i] <= 0:
                        continue
                    cid = bm25_ids[i]
                    meta = bm25_meta[cid]
                    if meta.get("workspace_id") != workspace_id:
                        continue
                    if document_ids and meta.get("document_id") not in document_ids:
                        continue
                    bm25_ranked.append((cid, float(scores[i])))
                bm25_ranked = bm25_ranked[:top_k_bm25]

        # Reciprocal-rank fusion.
        fused: dict[str, float] = {}
        k = 60.0
        for rank, (cid, _s) in enumerate(dense_ranked):
            fused[cid] = fused.get(cid, 0.0) + 1.0 / (k + rank + 1)
        for rank, (cid, _s) in enumerate(bm25_ranked):
            fused[cid] = fused.get(cid, 0.0) + 1.0 / (k + rank + 1)

        # Assemble hits.
        ranked = sorted(fused.items(), key=lambda kv: -kv[1])[:top_k]
        results: list[Hit] = []
        # Any chunks whose text/metadata we don't already have cached (dense-only
        # matches) are fetched from the vector store in one batch.
        missing = [cid for cid, _ in ranked if cid not in bm25_docs]
        fetched: dict[str, tuple[str, dict]] = {}
        if missing:
            for hit in self._vs.get(missing):
                fetched[hit.id] = (hit.document, hit.metadata)

        for cid, score in ranked:
            if cid in bm25_docs:
                text = bm25_docs.get(cid) or ""
                meta = bm25_meta.get(cid) or {}
            else:
                text, meta = fetched.get(cid, ("", {}))
            results.append(
                Hit(
                    chunk_id=cid,
                    document_id=str(meta.get("document_id", "")),
                    document_name=str(meta.get("document_name", "")),
                    page=int(meta.get("page", 0) or 0),
                    section=meta.get("section"),
                    text=text,
                    score=float(score),
                )
            )
        return results


@lru_cache
def get_search_service() -> SearchService:
    return SearchService()
