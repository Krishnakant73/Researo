"""Search endpoints — expose hybrid retrieval directly."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api.deps import get_workspace_id
from app.retrieval.search import get_search_service
from app.schemas.common import ok

router = APIRouter()


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = 8
    document_ids: list[str] | None = None
    # Optional explicit override; when omitted the active workspace from the
    # X-Workspace-Id header is used so search matches the rest of the app.
    workspace_id: str | None = None


@router.post("")
async def hybrid_search(
    payload: SearchRequest,
    header_workspace_id: str = Depends(get_workspace_id),
):
    svc = get_search_service()
    workspace_id = payload.workspace_id or header_workspace_id
    hits = svc.search(
        payload.query,
        top_k=payload.top_k,
        workspace_id=workspace_id,
        document_ids=payload.document_ids,
    )
    return ok(
        [
            {
                "chunk_id": h.chunk_id,
                "document_id": h.document_id,
                "document_name": h.document_name,
                "page": h.page,
                "section": h.section,
                "text": h.text,
                "score": h.score,
            }
            for h in hits
        ]
    )
