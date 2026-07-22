"""Document service — parse, chunk, embed and index.

Metadata → PostgreSQL/SQL (via the repository), embeddings → the VectorStore
interface (ChromaDB in production). This service never touches a concrete
vector engine directly.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.ids import chunk_id as gen_chunk_id
from app.core.logging import get_logger
from app.models.document import Document, DocumentChunk
from app.parsing import chunk_pages, parse_document
from app.repositories.document_repo import DocumentRepository
from app.retrieval import VectorRecord, get_embedder, get_search_service, get_vector_store

log = get_logger(__name__)


def _chunk_metadata(
    doc: Document,
    *,
    page: int,
    chunk_index: int,
    token_count: int,
    section: str = "",
) -> dict:
    """Chroma-safe (scalar, non-null) metadata that supports filtering by
    workspace, document, author, type, language, etc."""
    ext = Path(doc.filename or "").suffix.lstrip(".").lower()
    return {
        "workspace_id": doc.workspace_id,
        "document_id": doc.id,
        "document_name": doc.name,
        "page": int(page),
        "section": section or "",
        "author": doc.author or "",
        "document_type": doc.category or "",
        "file_type": ext or (doc.mime_type or ""),
        "language": doc.language or "en",
        "chunk_index": int(chunk_index),
        "token_count": int(token_count),
    }


class DocumentService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = DocumentRepository(session)
        self.settings = get_settings()

    async def list_documents(self, workspace_id: str = "ws_default") -> list[Document]:
        return await self.repo.list(workspace_id=workspace_id)

    async def get_document(self, doc_id: str) -> Document | None:
        return await self.repo.get(doc_id)

    async def delete_document(self, doc_id: str) -> bool:
        doc = await self.repo.get(doc_id)
        if not doc:
            return False
        # Remove embeddings from the vector store first.
        try:
            get_vector_store().delete_document(doc_id)
            get_search_service().mark_dirty()
        except Exception as e:
            log.warning("Vector delete failed: {}", e)
        # Remove the source file from disk (synthetic docs have none).
        try:
            p = Path(doc.storage_path)
            if p.exists():
                p.unlink()
        except Exception:
            pass
        deleted = await self.repo.delete(doc_id)
        await self.session.commit()
        return deleted

    async def _embed_and_index(
        self, *, ids: list[str], texts: list[str], metas: list[dict]
    ) -> None:
        """Batch-embed chunk text and upsert it through the VectorStore
        interface. Runs off the event loop (embedding is CPU-bound)."""
        if not texts:
            return
        emb = get_embedder()
        vs = get_vector_store()

        def _work() -> None:
            vectors = emb.embed(texts)
            records = [
                VectorRecord(id=ids[i], document=texts[i], embedding=vectors[i], metadata=metas[i])
                for i in range(len(ids))
            ]
            vs.add_documents(records)

        await asyncio.to_thread(_work)
        get_search_service().mark_dirty()

    async def ingest_upload(
        self,
        *,
        filename: str,
        content: bytes,
        mime_type: str | None,
        workspace_id: str = "ws_default",
    ) -> Document:
        """Persist an upload, parse it, chunk it, embed it and index it."""
        settings = self.settings

        target_dir = settings.upload_path / workspace_id
        target_dir.mkdir(parents=True, exist_ok=True)
        safe = filename.replace("/", "_").replace("\\", "_")
        stored_path = target_dir / f"{int(datetime.now().timestamp()*1000)}_{safe}"
        stored_path.write_bytes(content)

        doc = await self.repo.create(
            workspace_id=workspace_id,
            name=Path(filename).stem,
            filename=filename,
            mime_type=mime_type or "application/octet-stream",
            size=len(content),
            storage_path=str(stored_path),
            status="processing",
            tags=[],
            category=_guess_category(filename),
        )
        await self.session.commit()

        try:
            parsed = parse_document(stored_path, mime_type=mime_type)
            doc.pages = len(parsed.pages)
            if parsed.author and not doc.author:
                doc.author = parsed.author
            if parsed.title and parsed.title.strip():
                doc.name = parsed.title.strip()[:255]

            chunks = chunk_pages(parsed)
            if not chunks:
                doc.status = "failed"
                doc.error_message = "No extractable text (scanned PDF?)"
                await self.session.commit()
                await self.session.refresh(doc, attribute_names=["chunks"])
                return doc

            chunk_rows: list[DocumentChunk] = []
            texts: list[str] = []
            metas: list[dict] = []
            ids: list[str] = []
            for c in chunks:
                cid = gen_chunk_id()
                token_count = max(1, len(c["text"]) // 4)
                chunk_rows.append(
                    DocumentChunk(
                        id=cid,
                        document_id=doc.id,
                        page=c["page"],
                        chunk_index=c["chunk_index"],
                        text=c["text"],
                        token_count=token_count,
                        char_start=c["char_start"],
                        char_end=c["char_end"],
                    )
                )
                texts.append(c["text"])
                metas.append(
                    _chunk_metadata(
                        doc,
                        page=c["page"],
                        chunk_index=c["chunk_index"],
                        token_count=token_count,
                    )
                )
                ids.append(cid)

            await self.repo.add_chunks(chunk_rows)
            await self._embed_and_index(ids=ids, texts=texts, metas=metas)

            doc.status = "ready"
            doc.updated_at = datetime.now(timezone.utc)
            await self.session.commit()
            log.info("Indexed document {} ({} chunks)", doc.id, len(chunk_rows))
        except Exception as e:
            log.exception("Failed to ingest {}: {}", filename, e)
            doc.status = "failed"
            doc.error_message = str(e)
            await self.session.commit()

        # Load chunks within the async context so response serialization doesn't
        # trigger an implicit lazy load (forbidden by async SQLAlchemy).
        await self.session.refresh(doc, attribute_names=["chunks"])
        return doc

    async def reindex_document(self, doc_id: str) -> Document | None:
        """Re-embed and re-index a document's chunks in the vector store.

        Real files are re-parsed from disk (picking up parser/chunker
        improvements); synthetic docs re-embed the chunk text already in the DB.
        """
        doc = await self.repo.get(doc_id)
        if not doc:
            return None

        vs = get_vector_store()
        try:
            vs.delete_document(doc_id)
        except Exception as e:
            log.warning("Reindex: vector delete failed for {}: {}", doc_id, e)

        is_synthetic = str(doc.storage_path).startswith("synthetic://")
        stored_path = Path(doc.storage_path)

        if not is_synthetic and stored_path.exists():
            try:
                parsed = parse_document(stored_path, mime_type=doc.mime_type)
                doc.pages = len(parsed.pages)
                new_chunks = chunk_pages(parsed)
                if new_chunks:
                    for old in list(doc.chunks):
                        await self.session.delete(old)
                    await self.session.flush()

                    chunk_rows: list[DocumentChunk] = []
                    texts: list[str] = []
                    metas: list[dict] = []
                    ids: list[str] = []
                    for c in new_chunks:
                        cid = gen_chunk_id()
                        token_count = max(1, len(c["text"]) // 4)
                        chunk_rows.append(
                            DocumentChunk(
                                id=cid,
                                document_id=doc.id,
                                page=c["page"],
                                chunk_index=c["chunk_index"],
                                text=c["text"],
                                token_count=token_count,
                                char_start=c["char_start"],
                                char_end=c["char_end"],
                            )
                        )
                        texts.append(c["text"])
                        metas.append(
                            _chunk_metadata(
                                doc,
                                page=c["page"],
                                chunk_index=c["chunk_index"],
                                token_count=token_count,
                            )
                        )
                        ids.append(cid)

                    await self.repo.add_chunks(chunk_rows)
                    await self._embed_and_index(ids=ids, texts=texts, metas=metas)
                    doc.status = "ready"
                    doc.error_message = None
            except Exception as e:
                log.exception("Reindex parse failed for {}: {}", doc_id, e)
                doc.status = "failed"
                doc.error_message = str(e)
        else:
            chunks = sorted(doc.chunks, key=lambda c: c.chunk_index)
            if chunks:
                ids = [c.id for c in chunks]
                texts = [c.text for c in chunks]
                metas = [
                    _chunk_metadata(
                        doc,
                        page=c.page,
                        chunk_index=c.chunk_index,
                        token_count=c.token_count,
                        section=c.section or "",
                    )
                    for c in chunks
                ]
                await self._embed_and_index(ids=ids, texts=texts, metas=metas)
                doc.status = "ready"

        doc.updated_at = datetime.now(timezone.utc)
        await self.session.commit()
        await self.session.refresh(doc, attribute_names=["chunks"])
        log.info("Reindexed document {} ({} chunks)", doc.id, len(doc.chunks))
        return doc

    async def register_synthetic_document(
        self,
        *,
        doc_id: str,
        name: str,
        author: str,
        category: str,
        pages_texts: list[tuple[int, str]],
        workspace_id: str = "ws_default",
        tags: Iterable[str] = (),
    ) -> Document:
        """Register a demo document without a real PDF on disk. Chunks are still
        embedded and indexed so retrieval works normally."""
        existing = await self.repo.get(doc_id)
        if existing:
            return existing
        doc = Document(
            id=doc_id,
            workspace_id=workspace_id,
            name=name,
            filename=f"{doc_id}.pdf",
            mime_type="application/pdf",
            size=sum(len(t) for _, t in pages_texts),
            storage_path=f"synthetic://{doc_id}",
            status="ready",
            pages=len(pages_texts),
            author=author,
            category=category,
            tags=list(tags),
        )
        self.session.add(doc)
        await self.session.flush()

        chunk_rows: list[DocumentChunk] = []
        texts: list[str] = []
        metas: list[dict] = []
        ids: list[str] = []
        idx = 0
        for page, text in pages_texts:
            paras = [p.strip() for p in text.split("\n\n") if p.strip()]
            for p in paras:
                cid = gen_chunk_id()
                token_count = max(1, len(p) // 4)
                chunk_rows.append(
                    DocumentChunk(
                        id=cid,
                        document_id=doc.id,
                        page=page,
                        chunk_index=idx,
                        text=p,
                        token_count=token_count,
                        char_start=0,
                        char_end=len(p),
                    )
                )
                texts.append(p)
                metas.append(
                    _chunk_metadata(doc, page=page, chunk_index=idx, token_count=token_count)
                )
                ids.append(cid)
                idx += 1

        if texts:
            self.session.add_all(chunk_rows)
            await self._embed_and_index(ids=ids, texts=texts, metas=metas)
        await self.session.commit()
        return doc


def _guess_category(filename: str) -> str:
    name = filename.lower()
    if any(w in name for w in ["10-k", "10k", "annual", "10q"]):
        return "Annual Reports"
    if any(w in name for w in ["climate", "ipcc", "carbon", "lancet"]):
        return "Climate"
    if any(w in name for w in ["gpt", "llm", "transformer", "attention", "ai", "neural", "agentic"]):
        return "AI Papers"
    if any(w in name for w in ["earnings", "quarterly", "revenue", "finance"]):
        return "Financial"
    return "General"
