"""Prefixed ID generation (UUIDv7-style using uuid4 for prototype)."""
from __future__ import annotations

import uuid


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:20]}"


def doc_id() -> str:
    return new_id("doc")


def chunk_id() -> str:
    return new_id("chunk")


def research_id() -> str:
    return new_id("res")


def report_id() -> str:
    return new_id("rep")


def citation_id() -> str:
    return new_id("cit")


def evidence_id() -> str:
    return new_id("ev")


def agent_run_id() -> str:
    return new_id("run")


def workspace_id() -> str:
    return new_id("ws")


def user_id() -> str:
    return new_id("usr")


def project_id() -> str:
    return new_id("prj")


def model_usage_id() -> str:
    return new_id("use")


def research_job_id() -> str:
    return new_id("job")


def export_id() -> str:
    return new_id("exp")
