"""Smoke tests for the Researo API.

Run with `pytest -q` from apps/api. Tests use an in-memory sqlite database and
the offline LLM gateway so no network access is required.
"""
from __future__ import annotations

import os
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("CHROMA_PERSIST_DIR", "./tests/_chroma_test")
os.environ.setdefault("UPLOAD_DIR", "./tests/_uploads_test")

import asyncio

import pytest


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


def test_config_loads() -> None:
    from app.core.config import get_settings

    s = get_settings()
    assert s.default_model


def test_embedder_returns_correct_dim() -> None:
    from app.retrieval.embeddings import get_embedder

    emb = get_embedder()
    vecs = emb.embed(["hello world", "another sentence"])
    assert len(vecs) == 2
    assert len(vecs[0]) == emb.dim


def test_planner_offline_returns_json() -> None:
    from app.agents.schemas import PlannerOutput
    from app.gateway.llm import get_llm_gateway

    async def _run():
        llm = get_llm_gateway()
        obj, _ = await llm.structured(
            [
                {"role": "system", "content": "You are the Planner. Produce objectives and queries."},
                {"role": "user", "content": "What is Generative AI?"},
            ],
            schema_model=PlannerOutput,
        )
        return obj

    obj = asyncio.get_event_loop().run_until_complete(_run())
    assert isinstance(obj, PlannerOutput)
    assert obj.objectives or obj.queries


def test_chunking_produces_chunks() -> None:
    from app.parsing.pdf import ParsedDoc, ParsedPage, chunk_pages

    parsed = ParsedDoc(
        pages=[
            ParsedPage(page=1, text="This is a sample document. " * 60),
            ParsedPage(page=2, text="Second page content. " * 60),
        ]
    )
    chunks = chunk_pages(parsed, chunk_size=200, overlap=40)
    assert len(chunks) >= 2
    assert all("text" in c for c in chunks)
