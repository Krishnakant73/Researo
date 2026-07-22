"""Vector store abstraction.

Application code (services, search) depends ONLY on the `VectorStore`
interface — never on a concrete engine. Swapping ChromaDB for Qdrant, pgvector,
Pinecone, Milvus or Weaviate means adding one implementation class and pointing
the factory at it; no business logic changes.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Sequence


@dataclass
class VectorRecord:
    """A single chunk to index: text + embedding + filterable metadata."""

    id: str
    document: str
    embedding: list[float]
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class VectorHit:
    """A retrieval result. `distance` is a cosine distance (0 = identical)."""

    id: str
    document: str
    metadata: dict[str, Any]
    distance: float = 0.0

    @property
    def similarity(self) -> float:
        return 1.0 - self.distance


# A normalised, engine-agnostic metadata filter. Supports equality and `$in`:
#   {"workspace_id": "ws_default", "document_id": {"$in": ["d1", "d2"]}}
Filter = dict[str, Any]


class VectorStore(ABC):
    """Interface every vector backend implements."""

    #: Human-readable backend id surfaced in /status and logs.
    backend_name: str = "base"

    @abstractmethod
    def add_documents(self, records: Sequence[VectorRecord]) -> None:
        """Insert or update chunks (upsert semantics keyed on `id`)."""

    def update_document(self, records: Sequence[VectorRecord]) -> None:
        """Update existing chunks. Upsert semantics make this an alias."""
        self.add_documents(records)

    @abstractmethod
    def query(
        self,
        embedding: Sequence[float],
        *,
        top_k: int = 12,
        filters: Filter | None = None,
    ) -> list[VectorHit]:
        """Semantic search: nearest chunks to `embedding`, honouring `filters`."""

    @abstractmethod
    def get(self, ids: Sequence[str]) -> list[VectorHit]:
        """Fetch specific chunks by id (order not guaranteed)."""

    @abstractmethod
    def all_docs(self, *, workspace_id: str) -> list[VectorHit]:
        """Return every chunk in a workspace (used to build the BM25 index)."""

    @abstractmethod
    def delete_document(self, document_id: str) -> None:
        """Remove all chunks belonging to a document."""

    @abstractmethod
    def delete_workspace(self, workspace_id: str) -> None:
        """Remove all chunks belonging to a workspace."""

    @abstractmethod
    def count(self, *, workspace_id: str | None = None) -> int:
        """Number of indexed chunks (optionally scoped to a workspace)."""

    @abstractmethod
    def health(self) -> dict[str, Any]:
        """Backend status for observability / the /status endpoint."""
