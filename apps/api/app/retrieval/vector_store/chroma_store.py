"""ChromaDB-backed vector store — the production retrieval engine.

A single persistent collection holds every workspace's chunks; workspace/
document scoping is done with Chroma metadata filters. This keeps operations
(add/delete/query) simple and lets one collection serve all workspaces.

chromadb is imported lazily inside `__init__` so this module always imports;
the factory decides whether Chroma is available and falls back otherwise.
"""
from __future__ import annotations

from typing import Any, Sequence

from app.core.config import get_settings
from app.core.logging import get_logger
from app.retrieval.vector_store.base import Filter, VectorHit, VectorRecord, VectorStore

log = get_logger(__name__)

# Chroma metadata values must be scalars (str/int/float/bool) and non-null.
_SCALAR = (str, int, float, bool)


def _clean_metadata(meta: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for k, v in meta.items():
        if v is None:
            continue
        if isinstance(v, _SCALAR):
            out[k] = v
        elif isinstance(v, (list, tuple)):
            out[k] = ", ".join(str(x) for x in v)
        else:
            out[k] = str(v)
    return out


def _to_where(filters: Filter | None) -> dict | None:
    """Translate the normalised filter format into Chroma `where` syntax."""
    if not filters:
        return None
    clauses: list[dict] = []
    for k, v in filters.items():
        if k == "$and" and isinstance(v, list):
            clauses.extend(v)
        elif isinstance(v, dict) and "$in" in v:
            clauses.append({k: {"$in": list(v["$in"])}})
        else:
            clauses.append({k: {"$eq": v}})
    if not clauses:
        return None
    if len(clauses) == 1:
        return clauses[0]
    return {"$and": clauses}


class ChromaVectorStore(VectorStore):
    backend_name = "chroma"

    def __init__(self) -> None:
        import chromadb  # lazy — raises ImportError caught by the factory
        from chromadb.config import Settings as ChromaSettings

        s = get_settings()
        persist_dir = s.chroma_path / "chroma"
        persist_dir.mkdir(parents=True, exist_ok=True)
        self._client = chromadb.PersistentClient(
            path=str(persist_dir),
            settings=ChromaSettings(anonymized_telemetry=False, allow_reset=False),
        )
        # Cosine space matches our normalised embeddings.
        self._collection = self._client.get_or_create_collection(
            name=s.chroma_collection,
            metadata={"hnsw:space": "cosine"},
        )
        log.info(
            "ChromaVectorStore ready · path={} · collection={} · chunks={}",
            persist_dir,
            s.chroma_collection,
            self._safe_count(),
        )

    # ── interface ─────────────────────────────────────────────────────────

    def add_documents(self, records: Sequence[VectorRecord]) -> None:
        if not records:
            return
        self._collection.upsert(
            ids=[r.id for r in records],
            documents=[r.document for r in records],
            embeddings=[list(r.embedding) for r in records],
            metadatas=[_clean_metadata(r.metadata) or {"_": "1"} for r in records],
        )

    def query(
        self,
        embedding: Sequence[float],
        *,
        top_k: int = 12,
        filters: Filter | None = None,
    ) -> list[VectorHit]:
        res = self._collection.query(
            query_embeddings=[list(embedding)],
            n_results=max(1, top_k),
            where=_to_where(filters),
            include=["documents", "metadatas", "distances"],
        )
        ids = (res.get("ids") or [[]])[0]
        docs = (res.get("documents") or [[]])[0]
        metas = (res.get("metadatas") or [[]])[0]
        dists = (res.get("distances") or [[]])[0]
        hits: list[VectorHit] = []
        for i, cid in enumerate(ids):
            hits.append(
                VectorHit(
                    id=cid,
                    document=docs[i] if i < len(docs) else "",
                    metadata=metas[i] if i < len(metas) else {},
                    distance=float(dists[i]) if i < len(dists) else 0.0,
                )
            )
        return hits

    def get(self, ids: Sequence[str]) -> list[VectorHit]:
        if not ids:
            return []
        res = self._collection.get(ids=list(ids), include=["documents", "metadatas"])
        return self._rows_to_hits(res)

    def all_docs(self, *, workspace_id: str) -> list[VectorHit]:
        res = self._collection.get(
            where={"workspace_id": {"$eq": workspace_id}},
            include=["documents", "metadatas"],
        )
        return self._rows_to_hits(res)

    def delete_document(self, document_id: str) -> None:
        self._collection.delete(where={"document_id": {"$eq": document_id}})

    def delete_workspace(self, workspace_id: str) -> None:
        self._collection.delete(where={"workspace_id": {"$eq": workspace_id}})

    def count(self, *, workspace_id: str | None = None) -> int:
        if workspace_id is None:
            return self._safe_count()
        res = self._collection.get(
            where={"workspace_id": {"$eq": workspace_id}}, include=[]
        )
        return len(res.get("ids") or [])

    def health(self) -> dict[str, Any]:
        try:
            self._client.heartbeat()
            return {"backend": self.backend_name, "ok": True, "chunks": self._safe_count()}
        except Exception as e:  # pragma: no cover
            return {"backend": self.backend_name, "ok": False, "error": str(e)}

    # ── helpers ──────────────────────────────────────────────────────────

    def _rows_to_hits(self, res: dict) -> list[VectorHit]:
        ids = res.get("ids") or []
        docs = res.get("documents") or []
        metas = res.get("metadatas") or []
        out: list[VectorHit] = []
        for i, cid in enumerate(ids):
            out.append(
                VectorHit(
                    id=cid,
                    document=docs[i] if i < len(docs) else "",
                    metadata=metas[i] if i < len(metas) else {},
                )
            )
        return out

    def _safe_count(self) -> int:
        try:
            return int(self._collection.count())
        except Exception:  # pragma: no cover
            return 0
