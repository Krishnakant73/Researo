"""Index self-heal.

If the active vector store is empty but the database already has indexed chunks
(e.g. after switching the vector backend from numpy → chroma, or mounting a
fresh volume), rebuild the embeddings from the stored chunk text/files so
retrieval works without a manual reindex.
"""
from __future__ import annotations

from sqlalchemy import select

from app.core.logging import get_logger

log = get_logger(__name__)


async def rebuild_index_if_empty() -> None:
    from app.retrieval import get_vector_store

    vs = get_vector_store()
    try:
        if vs.count() > 0:
            return
    except Exception as e:  # pragma: no cover
        log.warning("Index self-heal skipped (count failed): {}", e)
        return

    from app.db.base import SessionLocal
    from app.models.document import Document, DocumentChunk
    from app.services.document_service import DocumentService

    async with SessionLocal() as session:
        # Only rebuild when there is something to rebuild.
        has_chunks = await session.scalar(select(DocumentChunk.id).limit(1))
        if not has_chunks:
            return
        docs = (await session.execute(select(Document))).scalars().all()
        if not docs:
            return
        log.info("Index self-heal: vector store empty, reindexing {} documents", len(docs))
        svc = DocumentService(session)
        healed = 0
        for d in docs:
            try:
                await svc.reindex_document(d.id)
                healed += 1
            except Exception as e:  # pragma: no cover
                log.warning("Self-heal failed for document {}: {}", d.id, e)
        log.info("Index self-heal complete · {}/{} documents reindexed", healed, len(docs))
