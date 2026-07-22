"""Repository for Document + DocumentChunk."""
from __future__ import annotations

from typing import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document, DocumentChunk


class DocumentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, **fields) -> Document:
        doc = Document(**fields)
        self.session.add(doc)
        await self.session.flush()
        return doc

    async def get(self, doc_id: str) -> Document | None:
        return await self.session.get(Document, doc_id)

    async def list(self, workspace_id: str = "ws_default") -> list[Document]:
        res = await self.session.execute(
            select(Document)
            .where(Document.workspace_id == workspace_id)
            .order_by(Document.created_at.desc())
        )
        return list(res.scalars().all())

    async def delete(self, doc_id: str) -> bool:
        d = await self.get(doc_id)
        if not d:
            return False
        await self.session.delete(d)
        return True

    async def add_chunks(self, chunks: Iterable[DocumentChunk]) -> None:
        self.session.add_all(list(chunks))
        await self.session.flush()

    async def count_chunks(self, doc_id: str) -> int:
        res = await self.session.execute(
            select(DocumentChunk).where(DocumentChunk.document_id == doc_id)
        )
        return len(res.scalars().all())
