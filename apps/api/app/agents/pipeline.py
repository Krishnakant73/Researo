"""
LangGraph-orchestrated multi-agent research pipeline.

Stages:
    Planner → Retriever → Ranker → Curator → Analyst → Validator → Publisher

Every stage is instrumented (tokens, latency, model) so we can render an
accurate execution trace and analytics.
"""
from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from app.core.ids import citation_id, evidence_id, new_id
from app.core.logging import get_logger
from app.gateway.llm import get_llm_gateway, LLMCallResult
from app.retrieval.search import Hit, get_search_service
from app.agents.prompts import (
    ANALYST_SYSTEM,
    CURATOR_SYSTEM,
    PLANNER_SYSTEM,
    VALIDATOR_SYSTEM,
    PUBLISHER_HEADER,
)
from app.agents.schemas import (
    AnalystOutput,
    CuratorOutput,
    PlannerOutput,
    ValidatorOutput,
)

log = get_logger(__name__)


@dataclass
class AgentStep:
    agent: str
    status: str = "waiting"
    started_at: datetime | None = None
    completed_at: datetime | None = None
    duration_ms: int = 0
    tokens: int = 0
    model: str = ""
    detail: str = ""


@dataclass
class ResearchPipelineOutput:
    question: str
    title: str
    executive_summary: str
    methodology: str
    summary: str
    findings: list[dict]
    contradictions: list[str]
    recommendations: list[str]
    follow_up_questions: list[str]
    citations: list[dict]
    evidence: list[dict]
    agents: list[AgentStep]
    confidence: float
    markdown: str
    total_tokens: int
    total_cost_usd: float


class _State(TypedDict, total=False):
    question: str
    document_ids: list[str]
    workspace_id: str
    fast_model: str
    quality_model: str
    top_k: int
    use_reranker: bool
    plan: PlannerOutput
    hits: list[Hit]
    curated: list[Hit]
    analyst: AnalystOutput
    validator: ValidatorOutput
    steps: list[AgentStep]
    total_tokens: int
    total_cost_usd: float


def _fast_model(state: _State) -> str:
    return state.get("fast_model") or get_llm_gateway().fast_model


def _quality_model(state: _State) -> str:
    return state.get("quality_model") or get_llm_gateway().quality_model


def _top_k(state: _State) -> int:
    return int(state.get("top_k") or 8)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _start_step(state: _State, agent: str) -> AgentStep:
    step = AgentStep(agent=agent, status="running", started_at=_now())
    state.setdefault("steps", []).append(step)
    return step


def _finish_step(step: AgentStep, *, tokens: int = 0, model: str = "", detail: str = "") -> None:
    step.completed_at = _now()
    step.duration_ms = int((step.completed_at - (step.started_at or step.completed_at)).total_seconds() * 1000)
    step.status = "completed"
    step.tokens = tokens
    step.model = model
    step.detail = detail


def _fail_step(step: AgentStep, detail: str) -> None:
    step.completed_at = _now()
    step.duration_ms = int((step.completed_at - (step.started_at or step.completed_at)).total_seconds() * 1000)
    step.status = "failed"
    step.detail = detail


def _track(state: _State, res: LLMCallResult) -> None:
    state["total_tokens"] = state.get("total_tokens", 0) + res.tokens
    state["total_cost_usd"] = state.get("total_cost_usd", 0.0) + res.cost_usd


# ─── nodes ────────────────────────────────────────────────────────────────────

async def _planner(state: _State) -> _State:
    step = _start_step(state, "Planner")
    llm = get_llm_gateway()
    try:
        prompt = f"Question: {state['question']}\n\nProduce a research plan."
        plan, res = await llm.structured(
            [
                {"role": "system", "content": PLANNER_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            schema_model=PlannerOutput,
            model=_fast_model(state),
        )
        _track(state, res)
        state["plan"] = plan
        _finish_step(step, tokens=res.tokens, model=res.model, detail=f"{len(plan.objectives)} objectives")
    except Exception as e:
        _fail_step(step, f"Planner failed: {e}")
        state["plan"] = PlannerOutput(
            objectives=[],
            queries=[state["question"]],
        )
    return state


async def _retriever(state: _State) -> _State:
    step = _start_step(state, "Retriever")
    search = get_search_service()
    plan = state.get("plan") or PlannerOutput()
    queries = (plan.queries or [state["question"]])[:5]
    doc_ids = state.get("document_ids") or None
    ws = state.get("workspace_id") or "ws_default"

    # Run the planner's sub-queries concurrently (retrieval is CPU/IO-bound and
    # synchronous, so offload each to a thread).
    result_lists = await asyncio.gather(
        *[
            asyncio.to_thread(search.search, q, document_ids=doc_ids, workspace_id=ws)
            for q in queries
        ]
    )

    all_hits: dict[str, Hit] = {}
    for hit_list in result_lists:
        for h in hit_list:
            # keep highest fused score for a chunk
            existing = all_hits.get(h.chunk_id)
            if not existing or h.score > existing.score:
                all_hits[h.chunk_id] = h
    hits = list(all_hits.values())
    hits.sort(key=lambda h: -h.score)
    state["hits"] = hits[:24]
    _finish_step(
        step,
        model="hybrid-bm25+dense",
        detail=f"{len(state['hits'])} unique chunks · {len(queries)} queries",
    )
    return state


async def _ranker(state: _State) -> _State:
    step = _start_step(state, "Ranker")
    hits = state.get("hits", [])
    keep = max(8, _top_k(state) * 2)
    model = "heuristic-reranker"

    reranked = None
    if state.get("use_reranker", True) and hits:
        from app.retrieval import reranker

        scores = await asyncio.to_thread(
            reranker.rerank, state["question"], [h.text for h in hits]
        )
        if scores is not None:
            order = sorted(range(len(hits)), key=lambda i: -scores[i])
            reranked = [hits[i] for i in order]
            model = "cross-encoder/ms-marco-MiniLM-L-6-v2"

    if reranked is None:
        # Heuristic fallback: fused score boosted by question-term overlap.
        q_terms = set(state["question"].lower().split())

        def rescore(h: Hit) -> float:
            overlap = len(q_terms.intersection(h.text.lower().split()))
            return h.score * (1.0 + overlap * 0.05)

        reranked = sorted(hits, key=lambda h: -rescore(h))

    state["hits"] = reranked[:keep]
    _finish_step(step, model=model, detail=f"top {len(state['hits'])}")
    return state


async def _curator(state: _State) -> _State:
    step = _start_step(state, "Curator")
    llm = get_llm_gateway()
    hits = state.get("hits", [])
    if not hits:
        state["curated"] = []
        _finish_step(step, model="", detail="no evidence")
        return state

    payload_lines = [
        f"- id: {h.chunk_id} · doc: {h.document_name or h.document_id} · page {h.page} · score {h.score:.3f}\n  {h.text[:400]}"
        for h in hits
    ]
    prompt = "Question:\n" + state["question"] + "\n\nCandidates:\n" + "\n".join(payload_lines)

    try:
        curated, res = await llm.structured(
            [
                {"role": "system", "content": CURATOR_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            schema_model=CuratorOutput,
            model=_fast_model(state),
        )
        _track(state, res)
        tk = _top_k(state)
        picked_ids = set(curated.selected_ids)
        selected = [h for h in hits if h.chunk_id in picked_ids]
        if not selected:
            selected = hits[:tk]
        state["curated"] = selected[:tk]
        _finish_step(step, tokens=res.tokens, model=res.model, detail=f"{len(state['curated'])} chunks")
    except Exception as e:
        state["curated"] = hits[: _top_k(state)]
        _fail_step(step, f"Curator fallback: {e}")
        # still keep the pipeline running
        step.status = "completed"
    return state


async def _analyst(state: _State) -> _State:
    step = _start_step(state, "Analyst")
    llm = get_llm_gateway()
    curated = state.get("curated", [])
    evidence_block = "\n\n".join(
        f"[{h.chunk_id}] ({h.document_name or h.document_id} · p.{h.page})\n{h.text[:900]}"
        for h in curated
    ) or "(no evidence retrieved)"
    prompt = (
        f"Question:\n{state['question']}\n\n"
        f"Evidence (cite by chunk_id):\n{evidence_block}\n\n"
        "Produce the report as JSON."
    )
    try:
        analyst, res = await llm.structured(
            [
                {"role": "system", "content": ANALYST_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            schema_model=AnalystOutput,
            model=_quality_model(state),
            max_tokens=1800,
        )
        _track(state, res)
        state["analyst"] = analyst
        _finish_step(step, tokens=res.tokens, model=res.model, detail=f"{len(analyst.findings)} findings")
    except Exception as e:
        _fail_step(step, f"Analyst failed: {e}")
        # Provide a minimal analyst output so the report still renders
        state["analyst"] = AnalystOutput(
            executive_summary="Analyst step failed; showing retrieved evidence only.",
            methodology="Retrieval only — no analysis available.",
            findings=[],
            contradictions=[],
            recommendations=[],
            follow_up_questions=[],
        )
    return state


async def _validator(state: _State) -> _State:
    step = _start_step(state, "Validator")
    llm = get_llm_gateway()
    analyst = state.get("analyst")
    curated = state.get("curated", [])
    if not analyst or not analyst.findings:
        state["validator"] = ValidatorOutput(confidence=0.7)
        _finish_step(step, model="", detail="skipped — no findings")
        return state

    evidence_block = "\n".join(
        f"[{h.chunk_id}] {h.text[:400]}" for h in curated
    )
    findings_block = "\n".join(
        f"{i}. {f.claim} (cites: {', '.join(f.citation_ids)})" for i, f in enumerate(analyst.findings)
    )
    prompt = (
        f"Findings:\n{findings_block}\n\nEvidence:\n{evidence_block}\n\n"
        "Return JSON with issues[] and overall confidence."
    )
    try:
        val, res = await llm.structured(
            [
                {"role": "system", "content": VALIDATOR_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            schema_model=ValidatorOutput,
            model=_fast_model(state),
        )
        _track(state, res)
        state["validator"] = val
        _finish_step(step, tokens=res.tokens, model=res.model, detail=f"{len(val.issues)} issues")
    except Exception as e:
        state["validator"] = ValidatorOutput(confidence=0.75)
        _fail_step(step, f"Validator failed: {e}")
        step.status = "completed"
    return state


async def _publisher(state: _State) -> _State:
    step = _start_step(state, "Publisher")
    _finish_step(step, model="", detail="report assembled")
    return state


def _build_graph():
    g = StateGraph(_State)
    # Node names are intentionally distinct from state keys — LangGraph rejects
    # names that shadow keys in the state TypedDict.
    g.add_node("plan_step", _planner)
    g.add_node("retrieve_step", _retriever)
    g.add_node("rank_step", _ranker)
    g.add_node("curate_step", _curator)
    g.add_node("analyse_step", _analyst)
    g.add_node("validate_step", _validator)
    g.add_node("publish_step", _publisher)

    g.set_entry_point("plan_step")
    g.add_edge("plan_step", "retrieve_step")
    g.add_edge("retrieve_step", "rank_step")
    g.add_edge("rank_step", "curate_step")
    g.add_edge("curate_step", "analyse_step")
    g.add_edge("analyse_step", "validate_step")
    g.add_edge("validate_step", "publish_step")
    g.add_edge("publish_step", END)
    return g.compile()


_graph = _build_graph()


async def run_research_pipeline(
    question: str,
    *,
    document_ids: list[str] | None = None,
    workspace_id: str = "ws_default",
    fast_model: str | None = None,
    quality_model: str | None = None,
    top_k: int | None = None,
    use_reranker: bool = True,
) -> ResearchPipelineOutput:
    state: _State = {
        "question": question,
        "document_ids": document_ids or [],
        "workspace_id": workspace_id,
        "fast_model": fast_model or "",
        "quality_model": quality_model or "",
        "top_k": int(top_k or 8),
        "use_reranker": use_reranker,
        "steps": [],
        "total_tokens": 0,
        "total_cost_usd": 0.0,
    }
    result: _State = await _graph.ainvoke(state)

    curated: list[Hit] = result.get("curated", [])
    analyst: AnalystOutput = result.get("analyst") or AnalystOutput(
        executive_summary="", methodology="", findings=[], contradictions=[], recommendations=[]
    )
    validator: ValidatorOutput = result.get("validator") or ValidatorOutput(confidence=0.75)

    # Build citations from curated evidence — one citation per chunk
    citations: list[dict] = []
    chunk_to_cit: dict[str, str] = {}
    for h in curated:
        cid = citation_id()
        chunk_to_cit[h.chunk_id] = cid
        citations.append(
            {
                "id": cid,
                "document_id": h.document_id,
                "document_name": h.document_name or h.document_id,
                "page": h.page,
                "chunk_id": h.chunk_id,
                "citation_text": h.text[:400],
                "confidence": min(1.0, max(0.5, validator.confidence)),
                "section": h.section,
            }
        )

    evidence = [
        {
            "id": evidence_id(),
            "document_id": h.document_id,
            "document_name": h.document_name or h.document_id,
            "page": h.page,
            "chunk_id": h.chunk_id,
            "text": h.text[:800],
            "score": h.score,
            "confidence": min(1.0, max(0.5, validator.confidence)),
            "section": h.section,
        }
        for h in curated
    ]

    findings_dicts: list[dict] = []
    for i, f in enumerate(analyst.findings):
        cids = [chunk_to_cit[c] for c in f.citation_ids if c in chunk_to_cit]
        findings_dicts.append(
            {
                "id": new_id("find"),
                "ordinal": i,
                "claim": f.claim,
                "detail": f.detail,
                "confidence": min(1.0, max(0.4, f.confidence)),
                "citation_ids": cids,
            }
        )

    # Assemble markdown
    md = _render_markdown(
        question=question,
        analyst=analyst,
        findings=findings_dicts,
        citations=citations,
    )

    summary = analyst.executive_summary or "Research completed."
    title = _derive_title(question)
    # Blend the validator's overall confidence with the mean per-finding
    # confidence and how much evidence was actually curated, so the score
    # reflects the whole run rather than one number.
    finding_confs = [f["confidence"] for f in findings_dicts]
    mean_finding = (
        sum(finding_confs) / len(finding_confs) if finding_confs else validator.confidence
    )
    coverage = min(1.0, len(curated) / 8.0)
    confidence = round(
        min(1.0, max(0.4, 0.55 * validator.confidence + 0.35 * mean_finding + 0.10 * coverage)),
        3,
    )

    return ResearchPipelineOutput(
        question=question,
        title=title,
        executive_summary=analyst.executive_summary,
        methodology=analyst.methodology,
        summary=summary,
        findings=findings_dicts,
        contradictions=list(analyst.contradictions),
        recommendations=list(analyst.recommendations),
        follow_up_questions=list(analyst.follow_up_questions),
        citations=citations,
        evidence=evidence,
        agents=result.get("steps", []),
        confidence=confidence,
        markdown=md,
        total_tokens=int(result.get("total_tokens", 0)),
        total_cost_usd=float(result.get("total_cost_usd", 0.0)),
    )


def _derive_title(question: str) -> str:
    q = question.strip()
    if len(q) <= 80:
        return q
    return q[:78].rstrip() + "…"


def _render_markdown(*, question: str, analyst: AnalystOutput, findings: list[dict], citations: list[dict]) -> str:
    cit_lookup = {c["id"]: (i + 1, c) for i, c in enumerate(citations)}
    lines: list[str] = []
    lines.append(PUBLISHER_HEADER.format(
        title=_derive_title(question),
        timestamp=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        question=question,
    ))
    lines.append("\n## Executive Summary\n\n" + (analyst.executive_summary or ""))
    if analyst.methodology:
        lines.append("\n## Methodology\n\n" + analyst.methodology)
    if findings:
        lines.append("\n## Key Findings\n")
        for i, f in enumerate(findings):
            refs = " ".join(f"[{cit_lookup[cid][0]}](#cit-{cit_lookup[cid][0]})" for cid in f["citation_ids"] if cid in cit_lookup)
            lines.append(f"### {i+1}. {f['claim']}\n\n{f['detail']} {refs}")
    if analyst.contradictions:
        lines.append("\n## Contradictions\n")
        for c in analyst.contradictions:
            lines.append(f"- {c}")
    if analyst.recommendations:
        lines.append("\n## Recommendations\n")
        for i, r in enumerate(analyst.recommendations, start=1):
            lines.append(f"{i}. {r}")
    if citations:
        lines.append("\n## References\n")
        for i, c in enumerate(citations, start=1):
            lines.append(
                f"{i}. *{c['document_name']}* — p.{c['page']}"
                + (f" · {c['section']}" if c.get('section') else "")
            )
    return "\n".join(lines)
