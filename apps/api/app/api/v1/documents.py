"""Document endpoints — upload, list, get, delete."""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_workspace_id
from app.db.base import get_session
from app.schemas.common import ok
from app.schemas.document import DocumentSummary
from app.services.document_service import DocumentService

router = APIRouter()


def _to_summary(d) -> DocumentSummary:
    return DocumentSummary(
        id=d.id,
        name=d.name,
        filename=d.filename,
        mime_type=d.mime_type,
        size=d.size,
        status=d.status,
        pages=d.pages,
        chunks=len(d.chunks),
        language=d.language,
        tags=list(d.tags or []),
        category=d.category,
        author=d.author,
        downloadable=not str(d.storage_path or "").startswith("synthetic://"),
        created_at=d.created_at,
        updated_at=d.updated_at,
    )


@router.get("")
async def list_documents(
    session: AsyncSession = Depends(get_session),
    workspace_id: str = Depends(get_workspace_id),
):
    svc = DocumentService(session)
    docs = await svc.list_documents(workspace_id=workspace_id)
    return ok([_to_summary(d).model_dump(mode="json") for d in docs])


@router.get("/{doc_id}")
async def get_document(doc_id: str, session: AsyncSession = Depends(get_session)):
    svc = DocumentService(session)
    doc = await svc.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return ok(_to_summary(doc).model_dump(mode="json"))


@router.get("/{doc_id}/chunks")
async def list_document_chunks(
    doc_id: str,
    limit: int = 30,
    session: AsyncSession = Depends(get_session),
):
    """Return the indexed chunks for a document (real content, not a preview)."""
    svc = DocumentService(session)
    doc = await svc.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    chunks = sorted(doc.chunks, key=lambda c: c.chunk_index)[: max(1, min(limit, 200))]
    return ok(
        [
            {
                "id": c.id,
                "page": c.page,
                "chunk_index": c.chunk_index,
                "text": c.text,
                "token_count": c.token_count,
            }
            for c in chunks
        ]
    )


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    workspace_id: str = Depends(get_workspace_id),
):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty upload")
    svc = DocumentService(session)
    doc = await svc.ingest_upload(
        filename=file.filename or "unknown.pdf",
        content=content,
        mime_type=file.content_type,
        workspace_id=workspace_id,
    )
    return ok(_to_summary(doc).model_dump(mode="json"), message=f"{doc.status.capitalize()}")


@router.get("/{doc_id}/download")
async def download_document(doc_id: str, session: AsyncSession = Depends(get_session)):
    """Stream the original uploaded file back to the client.

    Synthetic/demo documents have no file on disk, so they can't be downloaded.
    """
    svc = DocumentService(session)
    doc = await svc.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if str(doc.storage_path).startswith("synthetic://"):
        raise HTTPException(
            status_code=404,
            detail="This is a sample document with no downloadable source file.",
        )
    path = Path(doc.storage_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Source file is no longer available.")
    return FileResponse(
        path=str(path),
        media_type=doc.mime_type or "application/octet-stream",
        filename=doc.filename or path.name,
    )


@router.post("/{doc_id}/reindex")
async def reindex_document(doc_id: str, session: AsyncSession = Depends(get_session)):
    """Re-parse (if a file exists) and re-embed a document into the vector index."""
    svc = DocumentService(session)
    doc = await svc.reindex_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return ok(_to_summary(doc).model_dump(mode="json"), message="Reindexed")


@router.delete("/{doc_id}")
async def delete_document(doc_id: str, session: AsyncSession = Depends(get_session)):
    svc = DocumentService(session)
    deleted = await svc.delete_document(doc_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
    return ok({"deleted": True})
