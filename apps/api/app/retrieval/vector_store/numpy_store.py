"""Dependency-free NumPy cosine vector store.

This is NOT the primary retrieval engine — ChromaDB is. It exists purely as a
resilient fallback so the app still boots and serves retrieval when chromadb
can't be imported/initialised (e.g. a machine without the native wheels). It
implements the exact same `VectorStore` interface, so call sites never know
which backend is active.
"""
from __future__ import annotations

import json
import os
import threading
from pathlib import Path
from typing import Any, Sequence

import numpy as np

from app.core.config import get_settings
from app.core.logging import get_logger
from app.retrieval.vector_store.base import Filter, VectorHit, VectorRecord, VectorStore

log = get_logger(__name__)


class NumpyVectorStore(VectorStore):
    backend_name = "numpy"

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._ids: list[str] = []
        self._docs: list[str] = []
        self._metas: list[dict[str, Any]] = []
        self._vectors: np.ndarray | None = None  # (N, D)
        self._by_id: dict[str, int] = {}
        base = get_settings().chroma_path
        self._path = base / "store.json"
        self._vectors_path = base / "vectors.npy"
        self._load()
        log.info("NumpyVectorStore ready · path={} · chunks={}", self._path, len(self._ids))

    # ── persistence ─────────────────────────────────────────────────────────

    def _load(self) -> None:
        if not self._path.exists():
            return
        try:
            data = json.loads(self._path.read_text(encoding="utf-8"))
        except Exception as e:
            log.warning("Vector snapshot unreadable ({}), starting empty", e)
            return
        self._ids = list(data.get("ids", []))
        self._docs = list(data.get("docs", []))
        self._metas = list(data.get("metas", []))
        if self._vectors_path.exists():
            try:
                self._vectors = np.load(self._vectors_path).astype(np.float32)
            except Exception as e:
                log.warning("vectors.npy unreadable ({}), starting empty", e)
        elif data.get("vectors"):
            self._vectors = np.asarray(data["vectors"], dtype=np.float32)
        self._by_id = {cid: i for i, cid in enumerate(self._ids)}

    def _save(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self._path.with_suffix(self._path.suffix + ".tmp")
        tmp.write_text(
            json.dumps({"ids": self._ids, "docs": self._docs, "metas": self._metas}),
            encoding="utf-8",
        )
        os.replace(tmp, self._path)
        if self._vectors is not None:
            vtmp = self._vectors_path.with_suffix(".npy.tmp")
            with open(vtmp, "wb") as f:
                np.save(f, self._vectors)
            os.replace(vtmp, self._vectors_path)

    # ── interface ─────────────────────────────────────────────────────────

    def add_documents(self, records: Sequence[VectorRecord]) -> None:
        if not records:
            return
        with self._lock:
            new_vec = np.asarray([r.embedding for r in records], dtype=np.float32)
            new_rows: list[np.ndarray] = []
            for i, rec in enumerate(records):
                if rec.id in self._by_id:
                    idx = self._by_id[rec.id]
                    self._docs[idx] = rec.document
                    self._metas[idx] = rec.metadata
                    if self._vectors is not None:
                        self._vectors[idx] = new_vec[i]
                else:
                    self._by_id[rec.id] = len(self._ids)
                    self._ids.append(rec.id)
                    self._docs.append(rec.document)
                    self._metas.append(rec.metadata)
                    new_rows.append(new_vec[i])
            if new_rows:
                stacked = np.vstack(new_rows)
                self._vectors = stacked if self._vectors is None else np.vstack([self._vectors, stacked])
            self._save()

    def query(
        self,
        embedding: Sequence[float],
        *,
        top_k: int = 12,
        filters: Filter | None = None,
    ) -> list[VectorHit]:
        with self._lock:
            if not self._ids or self._vectors is None:
                return []
            q = np.asarray(embedding, dtype=np.float32)
            qn = np.linalg.norm(q) or 1.0
            vn = np.linalg.norm(self._vectors, axis=1)
            vn[vn == 0] = 1.0
            sims = (self._vectors @ q) / (vn * qn)
            order = np.argsort(-sims)
            out: list[VectorHit] = []
            for idx in order:
                meta = self._metas[idx]
                if not _match(filters, meta):
                    continue
                out.append(
                    VectorHit(
                        id=self._ids[idx],
                        document=self._docs[idx],
                        metadata=meta,
                        distance=float(1.0 - sims[idx]),
                    )
                )
                if len(out) >= top_k:
                    break
            return out

    def get(self, ids: Sequence[str]) -> list[VectorHit]:
        with self._lock:
            out: list[VectorHit] = []
            for cid in ids:
                if cid in self._by_id:
                    i = self._by_id[cid]
                    out.append(
                        VectorHit(id=cid, document=self._docs[i], metadata=self._metas[i])
                    )
            return out

    def all_docs(self, *, workspace_id: str) -> list[VectorHit]:
        with self._lock:
            return [
                VectorHit(id=cid, document=self._docs[i], metadata=self._metas[i])
                for i, cid in enumerate(self._ids)
                if self._metas[i].get("workspace_id") == workspace_id
            ]

    def delete_document(self, document_id: str) -> None:
        self._delete_where(lambda m: m.get("document_id") != document_id)

    def delete_workspace(self, workspace_id: str) -> None:
        self._delete_where(lambda m: m.get("workspace_id") != workspace_id)

    def _delete_where(self, keep) -> None:
        with self._lock:
            keep_idx = [i for i, m in enumerate(self._metas) if keep(m)]
            if len(keep_idx) == len(self._ids):
                return
            self._ids = [self._ids[i] for i in keep_idx]
            self._docs = [self._docs[i] for i in keep_idx]
            self._metas = [self._metas[i] for i in keep_idx]
            if self._vectors is not None and keep_idx:
                self._vectors = self._vectors[keep_idx]
            elif not keep_idx:
                self._vectors = None
            self._by_id = {cid: i for i, cid in enumerate(self._ids)}
            self._save()

    def count(self, *, workspace_id: str | None = None) -> int:
        with self._lock:
            if workspace_id is None:
                return len(self._ids)
            return sum(1 for m in self._metas if m.get("workspace_id") == workspace_id)

    def health(self) -> dict[str, Any]:
        return {
            "backend": self.backend_name,
            "ok": True,
            "chunks": self.count(),
            "path": str(self._path),
        }


def _match(where: Filter | None, meta: dict) -> bool:
    """Evaluate the normalised filter format against a metadata dict."""
    if not where:
        return True
    if "$and" in where:
        return all(_match(cond, meta) for cond in where["$and"])
    for k, v in where.items():
        if k == "$and":
            continue
        if isinstance(v, dict) and "$in" in v:
            if meta.get(k) not in v["$in"]:
                return False
        elif meta.get(k) != v:
            return False
    return True
